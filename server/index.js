require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const { connectDB } = require('./db');
const passport = require('./passport.config');
const corsMiddleware = require('./middleware/cors');

const authRoutes = require('./routes/auth');
const dailylogRoutes = require('./routes/dailylogs');
const medicationRoutes = require('./routes/medications');
const visitRoutes = require('./routes/doctorvisits');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

app.set('trust proxy', 1);
app.use(corsMiddleware);
app.use(express.json());

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    // Set up session after DB is connected so MongoStore can reuse the connection
    app.use(
      session({
        secret: process.env.SESSION_SECRET || 'healio_secret',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        },
      })
    );

    app.use(passport.initialize());
    app.use(passport.session());

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/dailylogs', dailylogRoutes);
    app.use('/api/medications', medicationRoutes);
    app.use('/api/visits', visitRoutes);

    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

    // Serve React frontend in production
    if (process.env.NODE_ENV === 'production') {
      const clientDist = path.join(__dirname, '../client/dist');
      app.use(express.static(clientDist));
      app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
    }

    // Socket.io — medication reminder notifications
    io.on('connection', (socket) => {
      socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
      });
      socket.on('disconnect', () => {});
    });

    app.set('io', io);

    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
