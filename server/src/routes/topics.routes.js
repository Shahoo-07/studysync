import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getTopics,
  createTopic,
  updateTopic,
  updateTopicStatus,
  deleteTopic,
  reorderTopics,
} from '../controllers/topics.controller.js';

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/chapter/:chapterId', getTopics);
router.post('/chapter/:chapterId', createTopic);
router.patch('/:id', updateTopic);
router.patch('/:id/status', updateTopicStatus);
router.delete('/:id', deleteTopic);
router.patch('/chapter/:chapterId/reorder', reorderTopics);

export default router;
