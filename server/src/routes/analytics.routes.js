import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  logSession,
  getStreak,
  getHeatmap,
  getWeakAreas,
  getPace,
} from '../controllers/analytics.controller.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/sessions', logSession);
router.get('/streak', getStreak);
router.get('/heatmap', getHeatmap);
router.get('/weak-areas', getWeakAreas);
router.get('/pace/:subjectId', getPace);

export default router;
