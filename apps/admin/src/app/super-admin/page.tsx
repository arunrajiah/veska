// TODO: Enforce super admin access in middleware or here.
// Mock check: validate ?key=veska-internal-2026 query param, or check
// process.env.SUPER_ADMIN_KEY against a request header. For now the page
// renders freely — real auth gate should be added before any production deploy.

import { SuperAdminDashboard } from './_components.js';

export default function SuperAdminPage() {
  return <SuperAdminDashboard />;
}
