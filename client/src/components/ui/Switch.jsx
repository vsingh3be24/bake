import { motion } from 'framer-motion';

export function Switch({ checked, onChange, disabled = false, label }) {
  return (
    <label className={`inline-flex items-center gap-2.5 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
      <motion.div
        role="switch"
        aria-checked={checked}
        aria-label={label}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        animate={{ backgroundColor: checked ? '#2E7D32' : '#C62828' }}
        transition={{ duration: 0.2 }}
        className="relative h-7 w-12 rounded-pill p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[rgba(140,29,47,0.4)]"
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 700, damping: 30 }}
          className="h-6 w-6 rounded-pill bg-paper shadow-sm"
          style={{ marginLeft: checked ? 'calc(100% - 1.5rem)' : '0' }}
        />
      </motion.div>
      {label && <span className="text-sm text-brown-soft">{label}</span>}
    </label>
  );
}
