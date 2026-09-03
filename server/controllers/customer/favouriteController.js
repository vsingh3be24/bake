import Product from '../../models/Product.js';
import { AppError } from '../../utils/AppError.js';

export async function listFavourites(req, res) {
  const products = await Product.find({
    _id: { $in: req.customer.favourites },
  }).populate('category', 'name slug');
  res.json(products);
}

export async function addFavourite(req, res) {
  const { productId } = req.params;
  const exists = await Product.exists({ _id: productId });
  if (!exists) throw new AppError('Product not found', 404);

  if (!req.customer.favourites.some((id) => id.equals(productId))) {
    req.customer.favourites.push(productId);
    await req.customer.save();
  }
  res.status(201).json({ favourites: req.customer.favourites });
}

export async function removeFavourite(req, res) {
  const { productId } = req.params;
  req.customer.favourites = req.customer.favourites.filter((id) => !id.equals(productId));
  await req.customer.save();
  res.json({ favourites: req.customer.favourites });
}
