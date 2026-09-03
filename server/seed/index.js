import 'dotenv/config';
import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Offer from '../models/Offer.js';
import Admin from '../models/Admin.js';
import { getSettings } from '../services/settingsService.js';
import { categories } from './data/categories.js';
import { buildProducts } from './data/products.js';
import { buildOffers } from './data/offers.js';

async function seedAdmin() {
  const phone = process.env.OWNER_PHONE;
  if (!phone) {
    console.log('OWNER_PHONE is not set in .env — skipping admin account');
    return;
  }

  let passwordHash = process.env.OWNER_PASSWORD_HASH;
  if (!passwordHash) {
    const plainPassword = crypto.randomBytes(9).toString('base64url');
    passwordHash = await bcrypt.hash(plainPassword, 12);
    console.log('\n⚠️  OWNER_PASSWORD_HASH was not set — a new password was generated:');
    console.log(`   Phone: ${phone}`);
    console.log(`   Password: ${plainPassword}`);
    console.log('   Save this now — it will not be shown again.\n');
  }

  await Admin.findOneAndUpdate(
    { phone },
    { phone, passwordHash, name: 'Owner' },
    { upsert: true, new: true }
  );
  console.log(`Admin account ready — phone: ${phone}`);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for seeding');

  await Promise.all([Category.deleteMany({}), Product.deleteMany({}), Offer.deleteMany({})]);

  const insertedCategories = await Category.insertMany(categories);
  const categoryIdBySlug = Object.fromEntries(insertedCategories.map((c) => [c.slug, c._id]));
  console.log(`Seeded ${insertedCategories.length} categories`);

  const products = buildProducts(categoryIdBySlug);
  const insertedProducts = await Product.insertMany(products);
  console.log(`Seeded ${insertedProducts.length} products`);

  const offers = buildOffers(categoryIdBySlug);
  const insertedOffers = await Offer.insertMany(offers);
  console.log(`Seeded ${insertedOffers.length} offers`);

  await getSettings();
  console.log('Settings ready (default doc created if none existed)');

  await seedAdmin();

  await mongoose.disconnect();
  console.log('Seed complete.');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
