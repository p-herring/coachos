import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ClientForm } from '@/components/dashboard/ClientForm'

export default function NewClientPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/clients"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Clients
        </Link>
        <h1 className="text-2xl font-bold">Add client</h1>
      </div>
      <ClientForm />
    </div>
  )
}
