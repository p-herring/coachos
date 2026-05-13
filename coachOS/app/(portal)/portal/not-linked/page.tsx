import Link from 'next/link'

export default function PortalNotLinkedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-sm space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <span className="text-2xl">🔗</span>
        </div>
        <h1 className="text-xl font-bold">Account not linked</h1>
        <p className="text-sm text-muted-foreground">
          Your account hasn&apos;t been linked to a coaching profile yet. If you just signed up,
          please wait a moment and refresh. If you think this is a mistake, contact your coach.
        </p>
        <form action="/auth/signout" method="POST">
          <button type="submit" className="text-sm text-muted-foreground hover:text-foreground underline">
            Sign out and try a different account
          </button>
        </form>
      </div>
    </div>
  )
}
