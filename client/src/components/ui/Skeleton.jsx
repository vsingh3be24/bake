export function Skeleton({ className = '' }) {
  return (
    <div
      className={`rounded-sm bg-cream-deep bg-[length:400px_100%] animate-shimmer ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(90deg, var(--cream-deep) 0%, rgba(255,253,247,0.8) 50%, var(--cream-deep) 100%)',
      }}
    />
  );
}
