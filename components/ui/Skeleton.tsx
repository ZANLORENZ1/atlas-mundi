export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function SkeletonCards({ n = 6 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  );
}

export function SkeletonLines({ n = 5 }: { n?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === n - 1 ? "w-2/3" : ""}`} />
      ))}
    </div>
  );
}
