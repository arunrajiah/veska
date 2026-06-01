import Link from 'next/link';
import { MarketingNav } from '../_nav';

export const metadata = {
  title: 'Privacy Policy — Veska',
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <MarketingNav />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-20 w-full">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: June 1, 2026</p>

        <div className="prose prose-gray max-w-none space-y-10">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 text-sm leading-relaxed">
              <li><strong>Account information:</strong> Name, email address, and password when you register.</li>
              <li><strong>Business information:</strong> Company name, team size, and configuration details you provide during setup.</li>
              <li><strong>Usage data:</strong> Pages visited, features used, actions taken within the application, and timestamps.</li>
              <li><strong>Technical data:</strong> IP address, browser type, operating system, and device identifiers.</li>
              <li><strong>Communications:</strong> Messages you send through support channels or contact forms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 text-sm leading-relaxed">
              <li><strong>Service delivery:</strong> To provision, operate, and maintain your Veska instance.</li>
              <li><strong>Customer support:</strong> To respond to your questions and resolve issues.</li>
              <li><strong>Product improvement:</strong> To understand how features are used and prioritize development.</li>
              <li><strong>Security:</strong> To detect and prevent fraud, abuse, and unauthorized access.</li>
              <li><strong>Communications:</strong> To send important product updates, security notices, and — with your consent — marketing messages.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Third-Party Services</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-3">
              Veska is self-hosted software. When you deploy it, your data is stored in infrastructure you control. The following third-party services may be used depending on your configuration:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 text-sm leading-relaxed">
              <li><strong>PostgreSQL:</strong> Primary data store, hosted on your own infrastructure or your chosen cloud provider.</li>
              <li><strong>Redis:</strong> Caching and session management, also under your control.</li>
              <li><strong>AI providers (optional):</strong> If you enable AI features, requests are sent to Anthropic (Claude) or the provider you configure. Refer to their respective privacy policies.</li>
              <li><strong>Communication channels (optional):</strong> Slack, WhatsApp, email, and Telegram integrations forward messages through their respective platforms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Sharing</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We do not sell your personal data. We may share data with service providers who help us operate this website (analytics, error monitoring), subject to confidentiality agreements. We may disclose data when required by law or to protect rights and safety.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We retain account data for as long as your account is active. You may request deletion of your data at any time by emailing <a href="mailto:privacy@veska.io" className="text-indigo-600 hover:underline">privacy@veska.io</a>. We will fulfill deletion requests within 30 days, subject to legal retention requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Cookies</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              This marketing site uses minimal cookies for session management and analytics. The Veska application itself uses cookies strictly for authentication. You can disable cookies in your browser, though some features may not function correctly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Security</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We implement industry-standard security measures including encryption in transit (TLS), hashed passwords, and role-based access controls. No method of transmission over the internet is 100% secure; we encourage you to use strong passwords and enable any available two-factor authentication.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Your Rights</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 text-sm leading-relaxed">
              <li>Access or export a copy of your data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your account and associated data</li>
              <li>Opt out of marketing communications at any time</li>
              <li>Lodge a complaint with your local data protection authority (EU/EEA users)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We may update this policy from time to time. Material changes will be communicated via email or a prominent notice on our site at least 30 days before taking effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              For privacy-related questions or requests, contact us at{' '}
              <a href="mailto:privacy@veska.io" className="text-indigo-600 hover:underline">privacy@veska.io</a>.
            </p>
          </section>

        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">© 2026 Veska</p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
            <Link href="https://github.com/arunrajiah/veska" className="hover:text-gray-900 transition-colors">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
