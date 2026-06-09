import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';

export const getSubjects = async (req, res) => {
  try {
    const { userId } = req;

    const result = await pool.query(
      `SELECT id, name, color, exam_date, exam_time, exam_venue, total_marks, created_at
       FROM subjects
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get subjects error:', err);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

export const createSubject = async (req, res) => {
  try {
    const { userId } = req;
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Subject name required' });
    }

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO subjects (id, user_id, name, color)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, color, exam_date, exam_time, exam_venue, total_marks, created_at`,
      [id, userId, name, color || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create subject error:', err);
    res.status(500).json({ error: 'Failed to create subject' });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const { name, color, exam_date, exam_time, exam_venue, total_marks } = req.body;

    // Verify ownership
    const ownership = await pool.query(
      'SELECT user_id FROM subjects WHERE id = $1',
      [id]
    );

    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `UPDATE subjects
       SET name = COALESCE($1, name),
           color = COALESCE($2, color),
           exam_date = COALESCE($3, exam_date),
           exam_time = COALESCE($4, exam_time),
           exam_venue = COALESCE($5, exam_venue),
           total_marks = COALESCE($6, total_marks)
       WHERE id = $7
       RETURNING id, name, color, exam_date, exam_time, exam_venue, total_marks, created_at`,
      [name, color, exam_date, exam_time, exam_venue, total_marks, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update subject error:', err);
    res.status(500).json({ error: 'Failed to update subject' });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    // Verify ownership
    const ownership = await pool.query(
      'SELECT user_id FROM subjects WHERE id = $1',
      [id]
    );

    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.query('DELETE FROM subjects WHERE id = $1', [id]);

    res.json({ message: 'Subject deleted successfully' });
  } catch (err) {
    console.error('Delete subject error:', err);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
};

export const getSubjectWithProgress = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    // Verify ownership
    const ownership = await pool.query(
      'SELECT user_id FROM subjects WHERE id = $1',
      [id]
    );

    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const subject = await pool.query(
      `SELECT id, name, color, exam_date, exam_time, exam_venue, total_marks, created_at
       FROM subjects WHERE id = $1`,
      [id]
    );

    const chapters = await pool.query(
      `SELECT id, name, order_index
       FROM chapters
       WHERE subject_id = $1
       ORDER BY order_index`,
      [id]
    );

    // Calculate progress
    const totalTopics = await pool.query(
      `SELECT COUNT(*) as count FROM topics
       WHERE chapter_id IN (SELECT id FROM chapters WHERE subject_id = $1)`,
      [id]
    );

    const doneTopics = await pool.query(
      `SELECT COUNT(*) as count FROM topics
       WHERE chapter_id IN (SELECT id FROM chapters WHERE subject_id = $1)
       AND status = 'done'`,
      [id]
    );

    const progress = totalTopics.rows[0].count > 0
      ? Math.round((doneTopics.rows[0].count / totalTopics.rows[0].count) * 100)
      : 0;

    res.json({
      ...subject.rows[0],
      chapters: chapters.rows,
      progress,
      totalTopics: totalTopics.rows[0].count,
      doneTopics: doneTopics.rows[0].count,
    });
  } catch (err) {
    console.error('Get subject with progress error:', err);
    res.status(500).json({ error: 'Failed to fetch subject' });
  }
};
