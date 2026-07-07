require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const redis = require('./config/redis');
const passport = require('./config/passport');
const connectDB = require('./config/db');
const { startScheduler } = require('./scheduler/postScheduler');

const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const aiRoutes = require('./routes/aiRoutes');
const socialAuthRoutes = require('./routes/socialAuthRoutes');

const app = express();

connectDB();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:80',
  'http://localhost',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// Session required for passport OAuth (session: false in callbacks, but needed for strategy init)
app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/social', socialAuthRoutes);
app.use('/api/oaths', socialAuthRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

startScheduler();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
