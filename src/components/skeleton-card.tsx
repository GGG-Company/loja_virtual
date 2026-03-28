'use client';

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-sm shadow-md overflow-hidden animate-pulse border border-gray-100">
      {/* Image area */}
      <div className="aspect-square bg-gray-200" />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Product name — two lines */}
        <div className="space-y-1.5">
          <div className="h-3.5 bg-gray-200 rounded-sm w-full" />
          <div className="h-3.5 bg-gray-200 rounded-sm w-3/4" />
        </div>

        {/* Price */}
        <div className="h-6 bg-gray-200 rounded-sm w-2/5" />

        {/* Installment text */}
        <div className="h-3 bg-gray-100 rounded-sm w-3/5" />

        {/* Button */}
        <div className="h-9 bg-gray-200 rounded-sm w-full mt-1" />
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
