import Category from '../../models/Category.js';

export async function listCategories(req, res) {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
  res.json(categories);
}
