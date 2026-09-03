import 'dotenv/config';
import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Offer from '../models/Offer.js';
import Order from '../models/Order.js';
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

/**
 * Adds any catalog category that isn't there yet, matched on slug, and
 * leaves existing ones untouched (their name/icon/order may have been
 * edited since). Safe to run against a live shop.
 */
async function upsertCategories() {
  let added = 0;
  for (const category of categories) {
    const res = await Category.updateOne(
      { slug: category.slug },
      { $setOnInsert: category },
      { upsert: true }
    );
    if (res.upsertedCount) added += 1;
  }
  const idBySlug = Object.fromEntries(
    (await Category.find().select('slug')).map((c) => [c.slug, c._id])
  );
  return { added, idBySlug };
}

/** Wipe-and-replace the demo catalog. Only ever runs on an empty shop or
 * behind an explicit --force, because it destroys real stock levels,
 * hand-added products and live offers. */
async function freshSeed() {
  await Promise.all([Category.deleteMany({}), Product.deleteMany({}), Offer.deleteMany({})]);

  const insertedCategories = await Category.insertMany(categories);
  const categoryIdBySlug = Object.fromEntries(insertedCategories.map((c) => [c.slug, c._id]));
  console.log(`Seeded ${insertedCategories.length} categories`);

  const insertedProducts = await Product.insertMany(buildProducts(categoryIdBySlug));
  console.log(`Seeded ${insertedProducts.length} products`);

  const insertedOffers = await Offer.insertMany(buildOffers(categoryIdBySlug));
  console.log(`Seeded ${insertedOffers.length} offers`);
}

async function run() {
  const force = process.argv.includes('--force') || process.env.SEED_FORCE === 'true';

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for seeding');

  const [productCount, orderCount] = await Promise.all([
    Product.countDocuments(),
    Order.countDocuments(),
  ]);
  const shopHasData = productCount > 0;

  if (shopHasData && !force) {
    // This is somebody's real shop. Top up what's missing; touch nothing else.
    const { added } = await upsertCategories();
    console.log(
      `\nThis database already has ${productCount} product(s)${orderCount ? ` and ${orderCount} order(s)` : ''} — ` +
        'running in safe mode.'
    );
    console.log(`  Categories: ${added} added, existing ones left alone`);
    console.log('  Products and offers: untouched (your stock levels and edits are safe)');
    console.log('  Re-run with --force to wipe the catalog and reinstall the demo data.\n');
  } else {
    if (force && shopHasData) {
      console.log(
        `\n⚠️  --force: deleting ${productCount} product(s) and all categories/offers.` +
          (orderCount ? ` ${orderCount} existing order(s) will be left with dangling product references.` : '')
      );
    }
    await freshSeed();
  }

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
