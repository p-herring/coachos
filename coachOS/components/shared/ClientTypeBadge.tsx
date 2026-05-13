import { Badge } from '@/components/ui/badge'

interface ClientTypeBadgeProps {
  type: 'general' | 'triathlon' | 'mixed'
}

export function ClientTypeBadge({ type }: ClientTypeBadgeProps) {
  return <Badge variant="secondary">{type}</Badge>
}
