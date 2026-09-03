import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { startOfferCron } from './jobs/offerCron.js';
import { validateEnv } from './utils/validateEnv.js';

validateEnv();

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    startOfferCron();
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
