import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusStyles: Record<string, string> = {
  active: 'bg-brand-green/10 text-brand-green hover:bg-brand-green/10',
  trial: 'bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/10',
  paused: 'bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/10',
  overdue: 'bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/10',
  alumni: 'bg-muted text-muted-foreground hover:bg-muted',
  lead: 'bg-brand-purple/10 text-brand-purple hover:bg-brand-purple/10',
  scheduled: 'bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/10',
  published: 'bg-brand-green/10 text-brand-green hover:bg-brand-green/10',
  draft: 'bg-muted text-muted-foreground hover:bg-muted',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status.toLowerCase()

  return (
    <Badge className={cn(statusStyles[key] ?? statusStyles.draft, className)}>
      {status.replace(/_/g, ' ')}
    </Badge>
  )
}
