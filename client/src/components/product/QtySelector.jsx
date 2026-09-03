import { Stepper } from '../ui/Stepper.jsx';

export function QtySelector({ product, value, onChange }) {
  return (
    <Stepper
      value={value}
      onChange={onChange}
      min={product.minQty || 1}
      max={product.maxQty || 99}
      step={product.stepQty || 1}
    />
  );
}
