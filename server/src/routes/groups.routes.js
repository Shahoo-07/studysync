import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getGroups,
  createGroup,
  getGroup,
  joinGroup,
  getGroupMembers,
  removeGroupMember,
  getGroupLeaderboard,
} from '../controllers/groups.controller.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getGroups);
router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/:groupId', getGroup);
router.get('/:groupId/members', getGroupMembers);
router.get('/:groupId/leaderboard', getGroupLeaderboard);
router.delete('/:groupId/members/:memberId', removeGroupMember);

export default router;
