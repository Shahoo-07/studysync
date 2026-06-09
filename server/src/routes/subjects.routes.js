import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectWithProgress,
} from '../controllers/subjects.controller.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getSubjects);
router.post('/', createSubject);
router.get('/:id', getSubjectWithProgress);
router.patch('/:id', updateSubject);
router.delete('/:id', deleteSubject);

export default router;
