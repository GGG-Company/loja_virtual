import { motion } from 'framer-motion';

function PulseBlock({ delay = 0, className }: { delay?: number; className: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0.4 }}
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

export function FinancialLoadingSkeleton({ showFilters = false, compact = false }: { showFilters?: boolean; compact?: boolean }) {
  const cardCount = compact ? 2 : 4;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <PulseBlock className="h-8 w-64 rounded-md bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
        <PulseBlock className="h-4 w-96 rounded-md bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" delay={0.05} />
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <PulseBlock
              key={k}
              className="h-10 rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100"
              delay={k * 0.05}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: cardCount }).map((_, idx) => (
          <PulseBlock
            key={idx}
            className="h-24 rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100"
            delay={idx * 0.05}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((k) => (
          <PulseBlock
            key={k}
            className="h-64 rounded-xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100"
            delay={k * 0.08}
          />
        ))}
      </div>
    </div>
  );
}
