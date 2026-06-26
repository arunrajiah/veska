import Link from 'next/link';
import { MarketingNav } from '../_nav';

export const metadata = {
  title: 'Terms of Service — Veska',
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <MarketingNav />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-20 w-full">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: June 1, 2026</p>

        <div className="prose prose-gray max-w-none space-y-10">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              By accessing or using Veska software, this website, or any related services (collectively, the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users, including self-hosted deployments and cloud-managed instances.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Service Description</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-3">
              Veska is an AI-native ERP platform. The core software is released under the Apache License 2.0 and may be self-hosted at no charge. Additional cloud-hosted services, premium support, and managed infrastructure may be offered under separate commercial agreements.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              The Apache 2.0 license grants you broad rights to use, modify, and distribute the software, subject to the conditions in that license. Nothing in these Terms restricts rights already granted by the Apache 2.0 license.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 text-sm leading-relaxed">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your credentials.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You must promptly notify us of any unauthorized use of your account.</li>
              <li>You must be at least 18 years old, or have parental consent, to use the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. User Responsibilities</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-3">
              You agree to use the Service lawfully and in compliance with all applicable laws and regulations. You are solely responsible for the data you input, process, and store using Veska.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              For self-hosted deployments, you are responsible for securing your infrastructure, keeping dependencies up to date, and maintaining backups of your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Prohibited Uses</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-3">You may not use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 text-sm leading-relaxed">
              <li>Violate any applicable law or regulation</li>
              <li>Infringe the intellectual property rights of others</li>
              <li>Transmit malware, viruses, or other harmful code</li>
              <li>Attempt to gain unauthorized access to any system or network</li>
              <li>Engage in harassment, abuse, or discrimination</li>
              <li>Misrepresent your identity or affiliation</li>
              <li>Scrape or harvest data from the Service in ways that circumvent rate limits or authentication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              The Veska name, logo, and marketing materials are trademarks of Veska. The source code is licensed under Apache 2.0 — see the LICENSE file in the repository. You retain all rights to data and content you create within your Veska instance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Disclaimer of Warranties</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Limitation of Liability</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL VESKA, ITS CONTRIBUTORS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF DATA, LOSS OF PROFITS, OR BUSINESS INTERRUPTION, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Modifications to the Service</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We reserve the right to modify or discontinue the Service at any time. We will provide reasonable notice of material changes where practicable. Continued use of the Service after changes take effect constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Governing Law</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict-of-law principles. Any disputes shall be resolved in the courts of competent jurisdiction in Delaware, and you consent to personal jurisdiction there.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Questions about these Terms may be directed to{' '}
              <a href="mailto:arunrajiah@gmail.com" className="text-indigo-600 hover:underline">arunrajiah@gmail.com</a>.
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
