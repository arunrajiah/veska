function SkeletonRow() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-20 h-5 bg-gray-200 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
          <div className="flex gap-4">
            <div className="h-3 bg-gray-100 rounded w-28" />
            <div className="h-3 bg-gray-100 rounded w-24" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchLoading() {
  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <div className="h-7 bg-gray-200 rounded w-40 animate-pulse mb-2" />
        <div className="h-4 bg-gray-100 rounded w-64 animate-pulse" />
      </div>
      <div className="flex gap-2 mb-6">
        <div className="flex-1 h-10 bg-gray-100 rounded-lg animate-pulse" />
        <div className="w-24 h-10 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-3">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}
