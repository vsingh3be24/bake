import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Download } from 'lucide-react';
import { useOwnerAnalytics } from '../../hooks/useOwnerAnalytics.js';
import { useToast } from '../../hooks/useToast.js';
import { formatRupees } from '../../lib/format.js';
import { PRIMARY, AXIS, GRID, INK, INK_MUTED, SEQUENTIAL, stableColorMap, rampColor } from '../../lib/chartTheme.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

const RANGES = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function shortDate(key) {
  const d = new Date(`${key}T00:00:00Z`);
  return `${d.getUTCDate()} ${d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' })}`;
}

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <Card className={`p-5 ${className}`}>
      <h2 className="font-heading text-lg text-brown">{title}</h2>
      {subtitle && <p className="mb-2 text-xs text-brown-mute">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </Card>
  );
}

/** Shared tooltip — values in ink, a colour chip carries series identity. */
function ChartTooltip({ active, payload, label, formatter, labelFormat }) {
  if (!active || !payload?.length) return null;
  const heading = labelFormat && label != null ? labelFormat(label) : label;
  return (
    <div className="rounded-sm border border-[rgba(169,141,116,0.3)] bg-paper px-3 py-2 text-xs shadow-md">
      {heading != null && <p className="mb-1 font-medium" style={{ color: INK }}>{heading}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5" style={{ color: INK_MUTED }}>
          <span className="inline-block h-2 w-2 rounded-pill" style={{ backgroundColor: p.color || p.payload?.fill }} />
          {p.name}: <span style={{ color: INK }}>{formatter ? formatter(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function StatTile({ label, value, hint }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-brown-mute">{label}</p>
      <p className="mt-1 font-heading text-2xl text-brown">{value}</p>
      {hint && <p className="text-xs text-brown-mute">{hint}</p>}
    </Card>
  );
}

function DonutCard({ title, subtitle, data, valueKey, formatValue }) {
  const total = data.reduce((s, d) => s + d[valueKey], 0);
  // Keyed by name, not position, so a category keeps its colour when the
  // ranking changes between date ranges.
  const colors = stableColorMap(data.map((d) => d.name));
  // <=4 slices get direct labels too; beyond that the legend + tooltip carry it.
  const direct = data.length > 0 && data.length <= 4;

  if (data.length === 0) {
    return (
      <ChartCard title={title} subtitle={subtitle}>
        <p className="py-12 text-center text-sm text-brown-mute">No data in this range</p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            stroke="none"
            label={direct ? ({ name, percent }) => `${name} ${Math.round(percent * 100)}%` : false}
            labelLine={direct}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={colors.get(entry.name)} />
            ))}
          </Pie>
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: INK_MUTED }} />
          <Tooltip content={<ChartTooltip formatter={formatValue} />} />
        </PieChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-brown-mute">Total {formatValue(total)}</p>
    </ChartCard>
  );
}

export function OwnerAnalytics() {
  const toast = useToast();
  const [range, setRange] = useState('30d');
  const [custom, setCustom] = useState({ from: '', to: '' });

  const params = useMemo(
    () => (custom.from && custom.to ? { from: custom.from, to: custom.to } : { range }),
    [range, custom]
  );
  const { data, loading, error } = useOwnerAnalytics(params);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['Date', 'Revenue', 'Orders', 'Avg Order Value'],
      ...data.series.map((d) => [d.date, d.revenue, d.orders, d.aov]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${data.range.from}-to-${data.range.to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.series.length} days`);
  };

  const heatmapMax = data ? Math.max(0, ...data.heatmap.map((h) => h.orders)) : 0;
  const slotNames = data ? [...new Set(data.heatmap.map((h) => h.slot))].sort() : [];
  const heatCell = (dow, slot) => data?.heatmap.find((h) => h.dow === dow && h.slot === slot)?.orders || 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Filters in one row above the charts */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-brown">Analytics</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-pill border border-[rgba(169,141,116,0.3)] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRange(r.id);
                  setCustom({ from: '', to: '' });
                }}
                className={`rounded-pill px-3 py-1 text-xs font-medium ${
                  range === r.id && !custom.from ? 'bg-maroon text-cream' : 'text-brown-soft'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={custom.from}
            onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
            className="rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper px-2 py-1 text-xs text-brown focus:border-maroon focus:outline-none"
          />
          <span className="text-xs text-brown-mute">to</span>
          <input
            type="date"
            value={custom.to}
            onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
            className="rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper px-2 py-1 text-xs text-brown focus:border-maroon focus:outline-none"
          />
          <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!data}>
            <Download size={14} strokeWidth={1.75} /> Export CSV
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : error && !data ? (
        <p className="text-out-stock">{error}</p>
      ) : !data ? null : (
        <>
          {loading && <p className="text-sm text-brown-mute">Updating…</p>}
          {error && <p className="text-out-stock">{error} — showing the last loaded data.</p>}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="Revenue" value={formatRupees(data.totals.revenue)} hint={`${data.range.days} days`} />
            <StatTile label="Orders" value={data.totals.orders} />
            <StatTile label="Avg Order Value" value={formatRupees(data.totals.avgOrderValue)} />
            <StatTile
              label="Repeat Customers"
              value={`${data.totals.repeatRate}%`}
              hint={`${data.totals.repeatCustomers} of ${data.totals.customers}`}
            />
          </div>

          <ChartCard title="Revenue" subtitle="By day the order was placed, in shop time">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                />
                <Tooltip
                  content={<ChartTooltip formatter={formatRupees} labelFormat={shortDate} />}
                  cursor={{ stroke: GRID }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke={PRIMARY}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#FFFDF7' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Orders per day">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  minTickGap={24}
                />
                <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <Tooltip content={<ChartTooltip labelFormat={shortDate} />} cursor={{ fill: 'rgba(169,141,116,0.12)' }} />
                <Bar dataKey="orders" name="Orders" fill={PRIMARY} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Top items" subtitle="By quantity sold">
              {data.topItems.length === 0 ? (
                <p className="py-12 text-center text-sm text-brown-mute">No sales in this range</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, data.topItems.length * 32)}>
                  <BarChart data={data.topItems} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: AXIS, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={130}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(169,141,116,0.12)' }} />
                    <Bar dataKey="qty" name="Qty" fill={PRIMARY} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <DonutCard
              title="Revenue by category"
              data={data.categorySplit}
              valueKey="revenue"
              formatValue={formatRupees}
            />

            <DonutCard title="Payment method" data={data.paymentSplit} valueKey="orders" formatValue={(v) => `${v} orders`} />

            <ChartCard title="Slot preference" subtitle="Delivery slot chosen">
              {data.slotSplit.length === 0 ? (
                <p className="py-12 text-center text-sm text-brown-mute">No data in this range</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(160, data.slotSplit.length * 48)}>
                  <BarChart data={data.slotSplit} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(169,141,116,0.12)' }} />
                    <Bar dataKey="orders" name="Orders" fill={PRIMARY} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Peak days" subtitle="Delivery weekday × slot, for orders placed in this range">
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="w-16" />
                    {slotNames.map((s) => (
                      <th key={s} className="px-2 pb-1 text-left font-medium text-brown-mute">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DOW.map((label, dow) => (
                    <tr key={label}>
                      <td className="pr-2 text-brown-mute">{label}</td>
                      {slotNames.map((slot) => {
                        const value = heatCell(dow, slot);
                        const bg = rampColor(value, heatmapMax);
                        return (
                          <td key={slot} className="p-0.5">
                            <div
                              title={`${label} ${slot}: ${value} order${value === 1 ? '' : 's'}`}
                              className="flex h-9 w-24 items-center justify-center rounded-sm text-xs font-medium"
                              style={{
                                backgroundColor: bg || 'rgba(169,141,116,0.10)',
                                color: bg && value / (heatmapMax || 1) > 0.55 ? '#FFFDF7' : INK,
                              }}
                            >
                              {value || ''}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[11px] text-brown-mute">Fewer</span>
              {SEQUENTIAL.map((c) => (
                <span key={c} className="h-3 w-6 rounded-sm" style={{ backgroundColor: c }} />
              ))}
              <span className="text-[11px] text-brown-mute">More</span>
            </div>
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Offer performance" subtitle="An order counts under every offer it used, so revenue can overlap">
              {data.offerPerformance.length === 0 ? (
                <p className="py-8 text-center text-sm text-brown-mute">No offers used in this range</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(169,141,116,0.2)] text-left text-brown-mute">
                      <th className="pb-2 font-medium">Offer</th>
                      <th className="pb-2 text-right font-medium">Orders</th>
                      <th className="pb-2 text-right font-medium">Discount</th>
                      <th className="pb-2 text-right font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.offerPerformance.map((o) => (
                      <tr key={o.offerId} className="border-b border-[rgba(169,141,116,0.12)] last:border-0">
                        <td className="py-2 text-brown">
                          {o.title}
                          {o.code && <span className="ml-1.5 text-xs text-brown-mute">{o.code}</span>}
                        </td>
                        <td className="py-2 text-right tabular-nums text-brown-soft">{o.orders}</td>
                        <td className="py-2 text-right tabular-nums text-out-stock">−{formatRupees(o.discount)}</td>
                        <td className="py-2 text-right tabular-nums text-brown-soft">{formatRupees(o.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ChartCard>

            <ChartCard title="Stock-outs" subtitle="Times an item ran out — worth making more of">
              {data.stockOuts.length === 0 ? (
                <p className="py-8 text-center text-sm text-brown-mute">Nothing ran out in this range 🎉</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {data.stockOuts.map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <span className="text-brown-soft">{s.name}</span>
                      <span className="rounded-pill bg-[rgba(198,40,40,0.12)] px-2 py-0.5 text-xs font-semibold text-out-stock">
                        {s.count}×
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
