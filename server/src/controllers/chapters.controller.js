import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';

export const getChapters = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { userId } = req;

    // Verify ownership
    const subject = await pool.query(
      'SELECT user_id FROM subjects WHERE id = $1',
      [subjectId]
    );

    if (subject.rows.length === 0 || subject.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT id, name, status, order_index, created_at
       FROM chapters
       WHERE subject_id = $1
       ORDER BY order_index`,
      [subjectId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get chapters error:', err);
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
};

export const createChapter = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { userId } = req;
    const { name } = req.body;

    // Verify ownership
    const subject = await pool.query(
      'SELECT user_id FROM subjects WHERE id = $1',
      [subjectId]
    );

    if (subject.rows.length === 0 || subject.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Chapter name required' });
    }

    const id = uuidv4();
    const maxOrder = await pool.query(
      'SELECT MAX(order_index) as max FROM chapters WHERE subject_id = $1',
      [subjectId]
    );

    const orderIndex = (maxOrder.rows[0].max || -1) + 1;

    const result = await pool.query(
      `INSERT INTO chapters (id, subject_id, name, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, status, order_index, created_at`,
      [id, subjectId, name, orderIndex]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create chapter error:', err);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
};

export const updateChapter = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;
    const { name, status } = req.body;
    
    if (status && !['not_started', 'in_progress', 'done', 'revision_needed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify ownership
    const chapter = await pool.query(
      `SELECT c.*, s.user_id FROM chapters c
       INNER JOIN subjects s ON c.subject_id = s.id
       WHERE c.id = $1`,
      [id]
    );

    if (chapter.rows.length === 0 || chapter.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `UPDATE chapters
       SET name = COALESCE($1, name),
           status = COALESCE($2, status)
       WHERE id = $3
       RETURNING id, name, status, order_index, created_at`,
      [name, status, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update chapter error:', err);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
};

export const deleteChapter = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    // Verify ownership
    const chapter = await pool.query(
      `SELECT c.*, s.user_id FROM chapters c
       INNER JOIN subjects s ON c.subject_id = s.id
       WHERE c.id = $1`,
      [id]
    );

    if (chapter.rows.length === 0 || chapter.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.query('DELETE FROM chapters WHERE id = $1', [id]);

    res.json({ message: 'Chapter deleted successfully' });
  } catch (err) {
    console.error('Delete chapter error:', err);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
};

export const reorderChapters = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { userId } = req;
    const { chapters } = req.body;

    // Verify ownership
    const subject = await pool.query(
      'SELECT user_id FROM subjects WHERE id = $1',
      [subjectId]
    );

    if (subject.rows.length === 0 || subject.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(chapters)) {
      return res.status(400).json({ error: 'Chapters array required' });
    }

    // Update order indexes
    for (let i = 0; i < chapters.length; i++) {
      await pool.query(
        'UPDATE chapters SET order_index = $1 WHERE id = $2',
        [i, chapters[i].id]
      );
    }

    res.json({ message: 'Chapters reordered successfully' });
  } catch (err) {
    console.error('Reorder chapters error:', err);
    res.status(500).json({ error: 'Failed to reorder chapters' });
  }
};
