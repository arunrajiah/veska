export default function TimeTrackingLoading() {
  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-7 w-40 bg-gray-200 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-56 bg-gray-100 rounded animate-pulse" />
      </div>

      {/* Tab skeleton */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <div className="h-10 w-20 bg-gray-100 rounded-t animate-pulse" />
        <div className="h-10 w-24 bg-gray-100 rounded-t animate-pulse" />
      </div>

      {/* Timer widget skeleton */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="h-12 w-64 bg-gray-100 rounded animate-pulse mb-5" />
        <div className="flex gap-3">
          <div className="h-10 flex-1 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-gray-50">
            <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
