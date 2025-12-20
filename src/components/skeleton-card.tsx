'use client';

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="h-64 bg-metallic-200 shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-metallic-200 rounded shimmer w-3/4" />
        <div className="h-4 bg-metallic-200 rounded shimmer w-1/2" />
        <div className="h-8 bg-metallic-200 rounded shimmer w-full" />
      </div>
    </div>
  );
}
