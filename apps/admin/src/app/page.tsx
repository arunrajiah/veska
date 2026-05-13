export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Veska</h1>
        <p className="text-muted-foreground">
          Your operations platform is ready. Use the conversation interface below to configure
          your workspace.
        </p>
        {/* Conversation interface — Phase 2 */}
        <div className="rounded-lg border bg-card p-6 text-card-foreground">
          <p className="text-sm text-muted-foreground">
            Conversation interface coming in Phase 2. For now, use the API to configure your
            tenant.
          </p>
        </div>
      </div>
    </main>
  );
}
