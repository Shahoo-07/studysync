import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getFriendLeaderboard } from '../controllers/leaderboard.controller.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/friends', getFriendLeaderboard);

export default router;
