import Link from 'next/link';
import { KeyRound, Shield } from 'lucide-react';
import { WorkspaceForm } from './workspace-form.js';

export default function SettingsPage() {
  return (
    <div className="px-8 py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>

      <div className="space-y-6">
        {/* Workspace */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Workspace</h2>
          <WorkspaceForm />
        </section>

        {/* Config */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-2">Configuration</h2>
          <p className="text-xs text-gray-500 mb-4">
            Use the setup conversation to reconfigure your workspace, or view the current config version below.
          </p>
          <div className="flex gap-3">
            <a
              href="/setup"
              className="text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Re-run setup
            </a>
            <a
              href="/dashboard/audit"
              className="text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View config history
            </a>
          </div>
        </section>

        {/* Developer */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-2">Developer</h2>
          <p className="text-xs text-gray-500 mb-4">
            Manage API keys for programmatic access to the Veska API.
          </p>
          <Link
            href="/dashboard/settings/api-keys"
            className="inline-flex items-center gap-2 text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <KeyRound size={14} />
            Manage API keys
          </Link>
        </section>

        {/* Security */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-2">Security</h2>
          <p className="text-xs text-gray-500 mb-4">
            Manage two-factor authentication, active sessions, and SSO configuration.
          </p>
          <Link
            href="/dashboard/settings/security"
            className="inline-flex items-center gap-2 text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shield size={14} />
            Security settings
          </Link>
        </section>

        {/* Danger zone */}
        <section className="bg-white border border-red-100 rounded-xl p-6">
          <h2 className="text-sm font-medium text-red-700 mb-2">Danger zone</h2>
          <p className="text-xs text-gray-500 mb-4">Irreversible actions. Proceed with caution.</p>
          <button className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
            Delete workspace
          </button>
        </section>
      </div>
    </div>
  );
}
