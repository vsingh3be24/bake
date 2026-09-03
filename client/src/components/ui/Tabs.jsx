import { motion } from 'framer-motion';

export function Tabs({ tabs, active, onChange, layoutId = 'tabs-indicator' }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[rgba(169,141,116,0.25)]">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={[
              'relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'text-maroon' : 'text-brown-soft hover:text-brown',
            ].join(' ')}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className="ml-1.5 text-xs text-brown-mute">({tab.count})</span>
            )}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-x-0 -bottom-px h-0.5 bg-maroon"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
