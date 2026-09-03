import { PackageSearch } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

export function ComingSoon({ title = 'Coming Soon' }) {
  return (
    <div className="container-lhh py-16">
      <EmptyState
        icon={PackageSearch}
        title={title}
        message="We're still building this page — it'll be live soon."
        actionLabel="Browse Menu"
        actionHref="/menu"
      />
    </div>
  );
}
