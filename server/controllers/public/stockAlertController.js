import StockAlert from '../../models/StockAlert.js';
import Product from '../../models/Product.js';
import { AppError } from '../../utils/AppError.js';

export async function createStockAlert(req, res) {
  const { productId, phone } = req.body;
  if (!productId || !phone) throw new AppError('Product and phone number are required');
  if (!/^[6-9]\d{9}$/.test(phone)) throw new AppError('Please enter a valid 10-digit phone number');

  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404);

  await StockAlert.findOneAndUpdate(
    { product: productId, phone },
    { product: productId, phone },
    { upsert: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({ message: "Got it! We'll notify you by WhatsApp/call when it's back in stock." });
}
