export default function MetricCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800/50 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-neutral-800"></div>
        <div className="w-16 h-6 bg-neutral-800 rounded"></div>
      </div>
      <div className="h-8 bg-neutral-800 rounded w-20 mb-2"></div>
      <div className="h-4 bg-neutral-800 rounded w-32"></div>
    </div>
  );
}
