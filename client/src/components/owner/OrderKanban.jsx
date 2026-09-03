import { useState } from 'react';
import { formatRupees } from '../../lib/format.js';

// "in_queue" is the queue-engine's own internal state (Part D.5/D.9, a later
// phase) — folded into the Confirmed column here so every order has exactly
// one kanban column, and dropping a card always sets a single, deliberate
// status rather than one the owner never chose.
const COLUMNS = [
  { status: 'placed', label: 'New', match: ['placed'] },
  { status: 'confirmed', label: 'Confirmed', match: ['confirmed', 'in_queue'] },
  { status: 'preparing', label: 'Preparing', match: ['preparing'] },
  { status: 'ready', label: 'Ready', match: ['ready'] },
  { status: 'out_for_delivery', label: 'Out for Delivery', match: ['out_for_delivery'] },
  { status: 'delivered', label: 'Delivered', match: ['delivered'] },
];

function KanbanCard({ order, onClick }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', order._id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onClick}
      className="cursor-grab rounded-md border border-[rgba(169,141,116,0.25)] bg-paper p-3 text-sm shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-brown">{order.orderId}</span>
        <span className="tabular-nums text-brown-soft">{formatRupees(order.grandTotal)}</span>
      </div>
      <p className="mt-1 text-brown-soft">{order.contact.name}</p>
      <p className="text-brown-mute">{order.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(', ')}</p>
      <p className="mt-1 text-xs text-brown-mute">{order.deliverySlot}</p>
    </div>
  );
}

export function OrderKanban({ orders, onMoveStatus, onCardClick }) {
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDrop = (e, status) => {
    e.preventDefault();
    setDragOverCol(null);
    const orderId = e.dataTransfer.getData('text/plain');
    if (orderId) onMoveStatus(orderId, status);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const items = orders.filter((o) => col.match.includes(o.orderStatus));
        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCol(col.status);
            }}
            onDragLeave={() => setDragOverCol((c) => (c === col.status ? null : c))}
            onDrop={(e) => handleDrop(e, col.status)}
            className={[
              'flex w-64 shrink-0 flex-col gap-2 rounded-md p-2.5 transition-colors',
              dragOverCol === col.status ? 'bg-[rgba(140,29,47,0.08)]' : 'bg-cream-deep',
            ].join(' ')}
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-brown">{col.label}</h3>
              <span className="text-xs text-brown-mute">{items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((order) => (
                <KanbanCard key={order._id} order={order} onClick={() => onCardClick(order)} />
              ))}
              {items.length === 0 && <p className="px-1 py-4 text-center text-xs text-brown-mute">Empty</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
