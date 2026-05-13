export default function PortalInactivePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-sm space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <span className="text-2xl">⏸️</span>
        </div>
        <h1 className="text-xl font-bold">Account paused</h1>
        <p className="text-sm text-muted-foreground">
          Your coaching access is currently paused or has ended. If you&apos;d like to continue,
          reach out to your coach to reactivate.
        </p>
        <form action="/auth/signout" method="POST">
          <button type="submit" className="text-sm text-muted-foreground hover:text-foreground underline">
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
