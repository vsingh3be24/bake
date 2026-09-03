import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import publicRoutes from './routes/publicRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import ownerRoutes from './routes/ownerRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Render/Vercel terminate TLS and forward the real client IP in
// X-Forwarded-For. Without this, express-rate-limit keys every request to the
// proxy's own IP — one shared bucket, so a single busy visitor locks out
// everyone and no attacker is actually limited. `1` = trust exactly one hop
// (the platform proxy), which avoids letting a client spoof the header itself.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(mongoSanitize());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api', publicRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/owner', ownerRoutes);

app.use(errorHandler);

export default app;
