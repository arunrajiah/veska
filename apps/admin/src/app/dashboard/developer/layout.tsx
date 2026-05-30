import { DeveloperSidebar } from './_sidebar.js';

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <DeveloperSidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
