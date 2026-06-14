export const metadata = {
  title: 'Self-hosting — Veska Docs',
  description: 'Run Veska on your own infrastructure with Docker Compose.',
};

export default function SelfHostingPage() {
  return (
    <article className="prose-sm max-w-none">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Self-hosting Veska</h1>
      <p className="text-gray-500 mb-10 text-sm leading-relaxed">
        Everything you need to run Veska on your own infrastructure — from a single VM to Kubernetes.
      </p>

      {/* Prerequisites */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Prerequisites</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-2"><span className="text-gray-400 shrink-0">—</span><span><strong className="text-gray-800">Docker 24+</strong> and <strong className="text-gray-800">Docker Compose v2</strong></span></li>
          <li className="flex gap-2"><span className="text-gray-400 shrink-0">—</span><span><strong className="text-gray-800">Node.js 22+</strong> and <strong className="text-gray-800">pnpm 9+</strong> (for local development only)</span></li>
          <li className="flex gap-2"><span className="text-gray-400 shrink-0">—</span><span>An <strong className="text-gray-800">Anthropic API key</strong> — for AI configuration and action agents</span></li>
          <li className="flex gap-2"><span className="text-gray-400 shrink-0">—</span><span>A <strong className="text-gray-800">Slack app</strong> (optional, for the Slack channel adapter)</span></li>
        </ul>
      </section>

      {/* Quick start */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Quick start — Docker Compose</h2>
        <p className="text-sm text-gray-500 mb-4">The fastest path to a running Veska instance:</p>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-5 mb-4">
          <p className="text-xs text-gray-400 font-mono mb-3">bash</p>
          <pre className="text-sm text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`git clone https://github.com/arunrajiah/veska.git
cd veska

# 1. Configure environment
cp .env.example .env
#    Edit .env — set ANTHROPIC_API_KEY and MAGIC_LINK_SECRET at minimum

# 2. Start all services
docker compose up -d

# 3. Run database migrations
docker compose exec api node apps/api/dist/db/migrate.js

# 4. Open the admin UI
open http://localhost:3000`}</pre>
        </div>
        <p className="text-sm text-gray-500">Veska is now running. Visit <span className="font-mono text-gray-700">http://localhost:3000</span> to complete onboarding.</p>
      </section>

      {/* Environment variables */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Environment variables</h2>
        <p className="text-sm text-gray-500 mb-4">
          See <span className="font-mono text-gray-700">.env.example</span> in the repo for the full list. Minimum required:
        </p>
        <div className="rounded-lg border border-gray-200 overflow-hidden text-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Variable</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['DATABASE_URL', 'PostgreSQL connection string'],
                ['REDIS_URL', 'Redis connection string'],
                ['ANTHROPIC_API_KEY', 'Anthropic API key for AI agents'],
                ['MAGIC_LINK_SECRET', '32+ char secret for signing magic links'],
              ].map(([varName, desc]) => (
                <tr key={varName}>
                  <td className="px-4 py-3 font-mono text-gray-800 text-xs">{varName}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Deployment targets */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Deployment targets</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Bare VPS (Ubuntu 22.04+)</h3>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`curl -fsSL https://get.docker.com | sh
git clone https://github.com/arunrajiah/veska.git /opt/veska
cd /opt/veska && cp .env.example .env
# Edit .env, then:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`}</pre>
            </div>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-1">Railway / Fly.io / Kubernetes</h3>
            <p className="text-xs text-gray-500">One-click deploy templates are on the roadmap. <a href="https://github.com/arunrajiah/veska/issues/4" className="text-indigo-600 hover:underline">Track progress or contribute →</a></p>
          </div>
        </div>
      </section>

      {/* Channels */}
      <section id="channels" className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Channels setup</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Slack</h3>
            <ol className="space-y-1 text-sm text-gray-600 list-decimal list-inside">
              <li>Create a Slack app at <span className="font-mono text-gray-700 text-xs">api.slack.com/apps</span></li>
              <li>Enable Socket Mode (development) or Events API (production)</li>
              <li>Add <span className="font-mono text-xs text-gray-700">SLACK_BOT_TOKEN</span> and <span className="font-mono text-xs text-gray-700">SLACK_SIGNING_SECRET</span> to your <span className="font-mono text-xs text-gray-700">.env</span></li>
              <li>Invite the bot to your workspace channels</li>
            </ol>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Email (SMTP)</h3>
            <p className="text-sm text-gray-600">Set <span className="font-mono text-xs text-gray-700">SMTP_HOST</span>, <span className="font-mono text-xs text-gray-700">SMTP_PORT</span>, <span className="font-mono text-xs text-gray-700">SMTP_USER</span>, and <span className="font-mono text-xs text-gray-700">SMTP_PASS</span> in your environment. Use any SMTP provider — Postmark, Mailgun, SendGrid, or your own server.</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">WhatsApp (via Twilio)</h3>
            <p className="text-sm text-gray-600">Set <span className="font-mono text-xs text-gray-700">TWILIO_ACCOUNT_SID</span>, <span className="font-mono text-xs text-gray-700">TWILIO_AUTH_TOKEN</span>, and <span className="font-mono text-xs text-gray-700">TWILIO_WHATSAPP_NUMBER</span>. Point your Twilio webhook to <span className="font-mono text-xs text-gray-700">https://your-domain/api/v1/channels/whatsapp/webhook</span>.</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Telegram</h3>
            <p className="text-sm text-gray-600">Create a bot via <span className="font-mono text-xs text-gray-700">@BotFather</span> and set <span className="font-mono text-xs text-gray-700">TELEGRAM_BOT_TOKEN</span>. Veska registers the webhook automatically on startup.</p>
          </div>
        </div>
      </section>

      {/* Database migrations */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Database migrations</h2>
        <p className="text-sm text-gray-500 mb-4">Migrations are forward-only and safe to run against a live instance.</p>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-5">
          <pre className="text-sm text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`# Run migrations inside the API container
docker compose exec api node apps/api/dist/db/migrate.js`}</pre>
        </div>
        <p className="text-xs text-gray-400 mt-3">Always run migrations before starting a new version of the API.</p>
      </section>

      {/* Upgrading */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Upgrading</h2>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-5">
          <pre className="text-sm text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`git pull origin main
docker compose pull
docker compose up -d
docker compose exec api node apps/api/dist/db/migrate.js`}</pre>
        </div>
      </section>

      {/* Security */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Security hardening</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            'Never expose Postgres or Redis ports publicly — use internal networking.',
            'Run behind a TLS-terminating reverse proxy (Caddy, nginx, or Traefik).',
            'Rotate MAGIC_LINK_SECRET periodically — existing links will be invalidated.',
            'Use a secrets manager (Vault, AWS Secrets Manager, Doppler) instead of .env files in production.',
            'Postgres RLS is enabled by default in migrations — do not disable it.',
          ].map((tip, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-gray-400 shrink-0">{i + 1}.</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Help */}
      <section className="rounded-lg bg-gray-50 border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Getting help</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'GitHub Discussions', href: 'https://github.com/arunrajiah/veska/discussions' },
            { label: 'GitHub Issues', href: 'https://github.com/arunrajiah/veska/issues' },
            { label: 'GitHub Discussions', href: 'https://github.com/arunrajiah/veska/discussions' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded px-3 py-1.5 hover:border-gray-400 transition-colors"
            >
              {link.label} →
            </a>
          ))}
        </div>
      </section>
    </article>
  );
}
