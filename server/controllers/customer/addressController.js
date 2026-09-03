import { AppError } from '../../utils/AppError.js';

function assertAddress(body) {
  if (!body.line1?.trim()) throw new AppError('Please enter an address');
  if (!body.area?.trim()) throw new AppError('Please enter an area');
  if (!/^\d{6}$/.test(body.pincode || '')) throw new AppError('Please enter a valid 6-digit pincode');
}

/** Only one address may be default at a time. */
function clearOtherDefaults(customer) {
  customer.addresses.forEach((a) => {
    a.isDefault = false;
  });
}

export async function listAddresses(req, res) {
  res.json(req.customer.addresses);
}

export async function addAddress(req, res) {
  assertAddress(req.body);
  const { label, line1, landmark, area, pincode, isDefault } = req.body;

  if (isDefault || req.customer.addresses.length === 0) {
    clearOtherDefaults(req.customer);
  }

  req.customer.addresses.push({
    label: label?.trim() || 'Home',
    line1: line1.trim(),
    landmark: landmark?.trim() || '',
    area: area.trim(),
    pincode: pincode.trim(),
    isDefault: isDefault || req.customer.addresses.length === 0,
  });

  await req.customer.save();
  res.status(201).json(req.customer.addresses);
}

function findAddress(customer, addressId) {
  const address = customer.addresses.id(addressId);
  if (!address) throw new AppError('Address not found', 404);
  return address;
}

export async function updateAddress(req, res) {
  const address = findAddress(req.customer, req.params.addressId);
  assertAddress({ ...address.toObject(), ...req.body });

  const { label, line1, landmark, area, pincode, isDefault } = req.body;
  if (label !== undefined) address.label = label.trim();
  if (line1 !== undefined) address.line1 = line1.trim();
  if (landmark !== undefined) address.landmark = landmark.trim();
  if (area !== undefined) address.area = area.trim();
  if (pincode !== undefined) address.pincode = pincode.trim();

  if (isDefault) {
    clearOtherDefaults(req.customer);
    address.isDefault = true;
  }

  await req.customer.save();
  res.json(req.customer.addresses);
}

export async function deleteAddress(req, res) {
  const address = findAddress(req.customer, req.params.addressId);
  const wasDefault = address.isDefault;
  address.deleteOne();

  // Losing the default address silently would break checkout's auto-select —
  // hand it to whichever address is left.
  if (wasDefault && req.customer.addresses.length > 0) {
    req.customer.addresses[0].isDefault = true;
  }

  await req.customer.save();
  res.json(req.customer.addresses);
}
