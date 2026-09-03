import { Smartphone, Banknote } from 'lucide-react';
import { Input } from '../ui/Input.jsx';
import { UpiQr } from './UpiQr.jsx';

export function PaymentSelect({
  value,
  onChange,
  utr,
  onUtrChange,
  utrError,
  settings,
  amount,
  screenshotUrl,
  onScreenshotChange,
}) {
  const options = [
    {
      id: 'UPI',
      icon: Smartphone,
      title: 'UPI / QR',
      subtitle: 'Instant confirm',
      recommended: true,
      enabled: settings?.acceptUPI !== false,
    },
    {
      id: 'COD',
      icon: Banknote,
      title: 'Cash on Delivery',
      subtitle: 'Pay when it arrives',
      recommended: false,
      enabled: settings?.acceptCOD !== false,
    },
  ].filter((o) => o.enabled);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              aria-pressed={isSelected}
              className={[
                'flex flex-col items-start gap-1 rounded-md border px-4 py-4 text-left transition-colors',
                isSelected
                  ? 'border-maroon bg-maroon text-cream'
                  : 'border-[rgba(169,141,116,0.35)] bg-paper text-brown-soft hover:border-maroon',
              ].join(' ')}
            >
              <opt.icon size={22} strokeWidth={1.75} />
              <span className="font-medium">{opt.title}</span>
              <span className={`text-sm ${isSelected ? 'text-cream' : 'text-brown-mute'}`}>{opt.subtitle}</span>
              {opt.recommended && (
                <span className={`text-xs ${isSelected ? 'text-cream' : 'text-olive'}`}>✅ Recommended</span>
              )}
            </button>
          );
        })}
      </div>

      {value === 'UPI' && (
        <div className="flex flex-col gap-4 rounded-md bg-cream-deep p-4">
          <UpiQr settings={settings} amount={amount} screenshotUrl={screenshotUrl} onScreenshotChange={onScreenshotChange} />
          <Input
            label="UTR / Reference Number"
            inputMode="numeric"
            maxLength={12}
            value={utr}
            onChange={(e) => onUtrChange(e.target.value)}
            error={utrError}
            helperText="Enter the 12-digit reference number after paying (optional for now)"
            placeholder="123456789012"
          />
        </div>
      )}

      {value === 'COD' && (
        <p className="rounded-md bg-cream-deep p-4 text-sm text-brown-soft">
          You'll pay in cash when your order is delivered.
        </p>
      )}
    </div>
  );
}
