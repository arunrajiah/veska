import Link from 'next/link';
import { TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react';

const REPORT_CARDS = [
  {
    href: '/dashboard/reports/finance',
    icon: TrendingUp,
    title: 'Finance Summary',
    description: 'Invoice totals, payments, outstanding balances, and monthly trends.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    href: '/dashboard/reports/inventory',
    icon: BarChart3,
    title: 'Inventory Valuation',
    description: 'Stock levels, product counts, and total inventory value by cost.',
    color: 'bg-green-50 text-green-600',
  },
  {
    href: '/dashboard/reports/hr',
    icon: PieChart,
    title: 'HR & Headcount',
    description: 'Employee status, department breakdown, leave stats, and recent hires.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    href: '/dashboard/reports/projects',
    icon: Activity,
    title: 'Project Status',
    description: 'Project pipeline, task completion rates, and overdue task counts.',
    color: 'bg-orange-50 text-orange-600',
  },
];

export default function ReportsPage() {
  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time summaries computed from your entity data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {REPORT_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${card.color}`}>
                <card.icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">{card.title}</h2>
                <p className="text-xs text-gray-500 leading-relaxed">{card.description}</p>
                <span className="inline-block mt-3 text-xs text-gray-400 group-hover:text-gray-700 transition-colors">
                  View report →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
