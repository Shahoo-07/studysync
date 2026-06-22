import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getFriends,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  getFriendProgress,
  getVisibilitySettings,
  updateVisibilitySetting,
} from '../controllers/friends.controller.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getFriends);
router.post('/request', sendFriendRequest);
router.patch('/request/:requestId', respondToFriendRequest);
router.get('/visibility', getVisibilitySettings);
router.post('/visibility', updateVisibilitySetting);
router.delete('/:friendId', removeFriend);
router.get('/:friendId/progress', getFriendProgress);

export default router;
