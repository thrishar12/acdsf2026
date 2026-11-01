/**
 * Loading Skeleton Cards
 * Use these while async data is loading to avoid layout shift
 */

interface SkeletonCardProps {
  className?: string;
  lines?: number;
}

export function SkeletonCard({ className = '', lines = 3 }: SkeletonCardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 ${className}`}
      aria-busy="true"
      aria-label="Loading..."
    >
      {/* Header */}
      <div className="skeleton mb-4 h-3 w-24 rounded" />
      {/* Content lines */}
      <div className="space-y-2">
        <div className="skeleton h-8 w-16 rounded" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-2.5 rounded"
            style={{ width: `${65 + Math.random() * 25}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonMetricGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {/* Header */}
      <div className="skeleton h-3 w-full rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="skeleton h-8 w-12 rounded flex-shrink-0" />
          <div className="skeleton h-8 flex-1 rounded" />
          <div className="skeleton h-8 w-20 rounded flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3 rounded"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}
