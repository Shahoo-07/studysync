import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { errorHandler } from './middleware/auth.js';
import authRoutes from './routes/auth.routes.js';
import subjectsRoutes from './routes/subjects.routes.js';
import chaptersRoutes from './routes/chapters.routes.js';
import topicsRoutes from './routes/topics.routes.js';
import progressRoutes from './routes/progress.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import friendsRoutes from './routes/friends.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import groupsRoutes from './routes/groups.routes.js';
import filesRoutes from './routes/files.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.VITE_API_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Store io instance globally
app.locals.io = io;

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/chapters', chaptersRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join_group_room', (groupId) => {
    socket.join(`group_${groupId}`);
  });

  socket.on('leave_group_room', (groupId) => {
    socket.leave(`group_${groupId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});

export default app;
