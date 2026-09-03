import { Input } from '../ui/Input.jsx';

export function AddressForm({ value, errors, onChange, deliveryType }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Name" required value={value.name} onChange={set('name')} error={errors.name} placeholder="Priya Sharma" />
        <Input
          label="Phone Number"
          required
          inputMode="numeric"
          maxLength={10}
          value={value.phone}
          onChange={set('phone')}
          error={errors.phone}
          placeholder="98765 43210"
        />
      </div>

      {deliveryType === 'delivery' && (
        <>
          <Input label="Address" required value={value.line1} onChange={set('line1')} error={errors.line1} placeholder="Flat / House, Street" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Landmark" value={value.landmark} onChange={set('landmark')} placeholder="Nearby landmark" />
            <Input label="Area" required value={value.area} onChange={set('area')} error={errors.area} placeholder="Salt Lake" />
            <Input
              label="Pincode"
              required
              inputMode="numeric"
              maxLength={6}
              value={value.pincode}
              onChange={set('pincode')}
              error={errors.pincode}
              placeholder="700064"
            />
          </div>
        </>
      )}
    </div>
  );
}
