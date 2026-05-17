export function DashboardSkeleton() {
  return (
    <div className="px-8 py-8 max-w-6xl animate-pulse">
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="h-7 w-48 bg-gray-200 rounded-lg" />
        <div className="h-9 w-28 bg-gray-200 rounded-lg" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-7 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Main content area skeleton */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 flex gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-16 bg-gray-200 rounded" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-gray-50 px-4 py-3.5 flex gap-6 items-center">
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-5 w-14 bg-gray-100 rounded-full" />
            <div className="h-4 w-16 bg-gray-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
