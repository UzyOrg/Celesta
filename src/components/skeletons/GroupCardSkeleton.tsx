export default function GroupCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800/50 p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 bg-neutral-800 rounded w-24 mb-2"></div>
          <div className="h-4 bg-neutral-800 rounded w-32"></div>
        </div>
        <div className="w-6 h-6 bg-neutral-800 rounded"></div>
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-neutral-800 rounded"></div>
          <div className="h-3 bg-neutral-800 rounded w-20"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-neutral-800 rounded"></div>
          <div className="h-3 bg-neutral-800 rounded w-28"></div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <div className="flex-1 h-10 bg-neutral-800 rounded-xl"></div>
        <div className="w-10 h-10 bg-neutral-800 rounded-xl"></div>
        <div className="w-10 h-10 bg-neutral-800 rounded-xl"></div>
      </div>
    </div>
  );
}
