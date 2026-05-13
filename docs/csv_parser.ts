// lib/trainingpeaks/csv-parser.ts
//
// Phase 1: Parse TrainingPeaks CSV exports into coachOS session objects.
//
// TrainingPeaks export format (from TP web app → Calendar → Export):
// The exported CSV contains planned workouts for a date range.
//
// Expected columns (TP may export more — we only use what we need):
//   Title, Date, Type, Planned Duration, Description, TSS, Workout Code
//
// Usage:
//   const sessions = parseTPCsv(csvText, clientId, coachId, weeklyPlanId)

import type { Session, SessionType } from '@/types'

export interface TPCsvRow {
  Title?:             string
  Date?:              string
  Type?:              string
  'Planned Duration'?: string
  Description?:       string
  TSS?:               string
  'Workout Code'?:    string
  // TP sometimes uses different column names — handle variants
  title?:             string
  date?:              string
  type?:              string
  duration?:          string
  description?:       string
}

export interface ParsedTPSession {
  name:              string
  session_date:      string      // ISO date
  session_type:      SessionType
  source:            'trainingpeaks'
  duration_minutes?: number
  intensity?:        'easy' | 'moderate' | 'hard' | 'race'
  notes?:            string
  tp_raw:            Record<string, string>
}

export interface TPParseResult {
  sessions: ParsedTPSession[]
  errors:   Array<{ row: number; message: string }>
  skipped:  number
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseTPCsv(
  csvText: string,
  options?: { skipRestDays?: boolean }
): TPParseResult {
  const { skipRestDays = true } = options ?? {}
  const result: TPParseResult = { sessions: [], errors: [], skipped: 0 }

  // Split into lines, handle both \r\n and \n
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) {
    result.errors.push({ row: 0, message: 'CSV appears to be empty or has no data rows' })
    return result
  }

  // Parse header row
  const headers = parseCsvLine(lines[0]).map(h => h.trim())
  if (headers.length === 0) {
    result.errors.push({ row: 0, message: 'Could not parse header row' })
    return result
  }

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? ''
    })

    // Get values using flexible column name matching
    const title    = getField(row, ['Title', 'title', 'Workout Title'])
    const dateStr  = getField(row, ['Date', 'date', 'Workout Date'])
    const type     = getField(row, ['Type', 'type', 'Sport', 'sport', 'Workout Type'])
    const duration = getField(row, ['Planned Duration', 'Duration', 'duration', 'Planned Time'])
    const desc     = getField(row, ['Description', 'description', 'Notes', 'Workout Description'])

    // Skip if no date (probably a malformed row)
    if (!dateStr) {
      result.skipped++
      continue
    }

    // Parse date
    const parsedDate = parseTPDate(dateStr)
    if (!parsedDate) {
      result.errors.push({ row: i + 1, message: `Could not parse date: "${dateStr}"` })
      continue
    }

    // Map session type
    const sessionType = mapTPType(type)

    // Skip rest days if option set
    if (skipRestDays && (sessionType === 'rest' || type?.toLowerCase().includes('off'))) {
      result.skipped++
      continue
    }

    // Parse duration (HH:MM:SS or MM:SS or decimal hours)
    const durationMinutes = parseDuration(duration)

    // Derive intensity from TSS, IF, or workout code if available
    const tss        = getField(row, ['TSS', 'tss', 'Planned TSS'])
    const workoutCode = getField(row, ['Workout Code', 'workout_code', 'Code'])
    const intensity  = deriveIntensity(tss, workoutCode, desc)

    const session: ParsedTPSession = {
      name:              title || `${sessionType.charAt(0).toUpperCase()}${sessionType.slice(1)} Session`,
      session_date:      parsedDate,
      session_type:      sessionType,
      source:            'trainingpeaks',
      duration_minutes:  durationMinutes,
      intensity,
      notes:             desc || undefined,
      tp_raw:            row,
    }

    result.sessions.push(session)
  }

  // Sort by date
  result.sessions.sort((a, b) => a.session_date.localeCompare(b.session_date))

  return result
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function getField(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key]
  }
  return ''
}

function parseTPDate(dateStr: string): string | null {
  // TP exports dates in various formats: "2026-05-13", "05/13/2026", "13/05/2026"
  const cleanDate = dateStr.trim()

  // ISO format already
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return cleanDate

  // MM/DD/YYYY (US format)
  const usMatch = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usMatch) {
    return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`
  }

  // DD/MM/YYYY (AU format — more likely for Pete)
  const auMatch = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (auMatch) {
    return `${auMatch[3]}-${auMatch[2].padStart(2, '0')}-${auMatch[1].padStart(2, '0')}`
  }

  // Try native Date parse as last resort
  const d = new Date(cleanDate)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }

  return null
}

function mapTPType(type: string): SessionType {
  const t = (type ?? '').toLowerCase().trim()

  if (t.includes('swim') || t === 'swimming')    return 'swim'
  if (t.includes('bike') || t.includes('cycl') || t.includes('ride') || t === 'cycling') return 'bike'
  if (t.includes('run') || t === 'running')       return 'run'
  if (t.includes('strength') || t.includes('weight') || t.includes('gym')) return 'strength'
  if (t.includes('off') || t.includes('rest') || t.includes('recovery')) return 'rest'
  if (t.includes('brick'))                        return 'other'  // Pete can reclassify
  if (t.includes('transition'))                   return 'other'
  if (t === '')                                   return 'other'

  return 'other'
}

function parseDuration(durationStr: string): number | undefined {
  if (!durationStr) return undefined
  const s = durationStr.trim()

  // HH:MM:SS
  const hms = s.match(/^(\d+):(\d{2}):(\d{2})$/)
  if (hms) {
    return parseInt(hms[1]) * 60 + parseInt(hms[2]) + Math.round(parseInt(hms[3]) / 60)
  }

  // MM:SS
  const ms = s.match(/^(\d+):(\d{2})$/)
  if (ms) return parseInt(ms[1])

  // Decimal hours (e.g. "1.5")
  const hours = parseFloat(s)
  if (!isNaN(hours) && hours > 0) return Math.round(hours * 60)

  return undefined
}

function deriveIntensity(
  tss?: string,
  workoutCode?: string,
  description?: string
): 'easy' | 'moderate' | 'hard' | 'race' | undefined {
  // Try TSS-based derivation (rough rules of thumb)
  if (tss) {
    const tssNum = parseFloat(tss)
    if (!isNaN(tssNum)) {
      if (tssNum < 50)  return 'easy'
      if (tssNum < 100) return 'moderate'
      if (tssNum < 200) return 'hard'
      return 'race'
    }
  }

  // Workout code conventions (Z1/Z2=easy, Z3=moderate, Z4/Z5=hard, Race=race)
  if (workoutCode) {
    const code = workoutCode.toUpperCase()
    if (code.includes('Z1') || code.includes('Z2') || code.includes('EASY') || code.includes('REC')) return 'easy'
    if (code.includes('Z3') || code.includes('MOD') || code.includes('TEMPO')) return 'moderate'
    if (code.includes('Z4') || code.includes('Z5') || code.includes('HARD') || code.includes('VO2') || code.includes('INT')) return 'hard'
    if (code.includes('RACE') || code.includes('COMP')) return 'race'
  }

  // Description keywords as last resort
  if (description) {
    const desc = description.toLowerCase()
    if (desc.includes('easy') || desc.includes('zone 1') || desc.includes('zone 2') || desc.includes('recovery')) return 'easy'
    if (desc.includes('tempo') || desc.includes('zone 3') || desc.includes('moderate')) return 'moderate'
    if (desc.includes('threshold') || desc.includes('zone 4') || desc.includes('zone 5') || desc.includes('intervals') || desc.includes('hard')) return 'hard'
    if (desc.includes('race pace') || desc.includes('race effort')) return 'race'
  }

  return undefined
}
