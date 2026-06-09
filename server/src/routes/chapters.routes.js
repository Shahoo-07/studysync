import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapters,
} from '../controllers/chapters.controller.js';

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/subject/:subjectId', getChapters);
router.post('/subject/:subjectId', createChapter);
router.patch('/:id', updateChapter);
router.delete('/:id', deleteChapter);
router.patch('/subject/:subjectId/reorder', reorderChapters);

export default router;
