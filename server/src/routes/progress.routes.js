import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getProgressOverview, getSubjectProgress } from '../controllers/progress.controller.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/overview', getProgressOverview);
router.get('/subject/:subjectId', getSubjectProgress);

export default router;
