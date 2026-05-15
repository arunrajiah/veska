export default function AssetsLoading() {
  return (
    <div className="px-8 py-8 max-w-6xl animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-lg mb-2" />
      <div className="h-4 w-72 bg-gray-100 rounded mb-8" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-32 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-3 w-20 bg-gray-200 rounded" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-3 border-b border-gray-50 flex gap-6 items-center">
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
            <div className="h-3 w-20 bg-gray-100 rounded font-mono" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
