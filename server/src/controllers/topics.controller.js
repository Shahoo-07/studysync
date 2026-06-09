import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';

export const getTopics = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { userId } = req;

    // Verify ownership
    const chapter = await pool.query(
      `SELECT c.* FROM chapters c
       INNER JOIN subjects s ON c.subject_id = s.id
       WHERE c.id = $1`,
      [chapterId]
    );

    if (chapter.rows.length === 0 || chapter.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT id, name, status, notes, completed_at, order_index, created_at
       FROM topics
       WHERE chapter_id = $1
       ORDER BY order_index`,
      [chapterId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get topics error:', err);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
};

export const createTopic = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { userId } = req;
    const { name, notes } = req.body;

    // Verify ownership
    const chapter = await pool.query(
      `SELECT c.* FROM chapters c
       INNER JOIN subjects s ON c.subject_id = s.id
       WHERE c.id = $1`,
      [chapterId]
    );

    if (chapter.rows.length === 0 || chapter.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Topic name required' });
    }

    const id = uuidv4();
    const maxOrder = await pool.query(
      'SELECT MAX(order_index) as max FROM topics WHERE chapter_id = $1',
      [chapterId]
    );

    const orderIndex = (maxOrder.rows[0].max || -1) + 1;

    const result = await pool.query(
      `INSERT INTO topics (id, chapter_id, name, notes, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, status, notes, completed_at, order_index, created_at`,
      [id, chapterId, name, notes || null, orderIndex]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create topic error:', err);
    res.status(500).json({ error: 'Failed to create topic' });
  }
};

export const updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;
    const { name, notes } = req.body;

    // Verify ownership
    const topic = await pool.query(
      `SELECT t.* FROM topics t
       INNER JOIN chapters c ON t.chapter_id = c.id
       INNER JOIN subjects s ON c.subject_id = s.id
       WHERE t.id = $1`,
      [id]
    );

    if (topic.rows.length === 0 || topic.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `UPDATE topics
       SET name = COALESCE($1, name),
           notes = COALESCE($2, notes)
       WHERE id = $3
       RETURNING id, name, status, notes, completed_at, order_index, created_at`,
      [name, notes, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update topic error:', err);
    res.status(500).json({ error: 'Failed to update topic' });
  }
};

export const updateTopicStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;
    const { status } = req.body;

    if (!['not_started', 'in_progress', 'done', 'revision_needed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify ownership
    const topic = await pool.query(
      `SELECT t.* FROM topics t
       INNER JOIN chapters c ON t.chapter_id = c.id
       INNER JOIN subjects s ON c.subject_id = s.id
       WHERE t.id = $1`,
      [id]
    );

    if (topic.rows.length === 0 || topic.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const completedAt = status === 'done' ? new Date().toISOString() : null;

    const result = await pool.query(
      `UPDATE topics
       SET status = $1,
           completed_at = COALESCE($2, completed_at)
       WHERE id = $3
       RETURNING id, name, status, notes, completed_at, order_index, created_at`,
      [status, completedAt, id]
    );

    // Broadcast socket event to groups if topic is completed
    if (status === 'done') {
      try {
        const io = req.app.locals.io;
        if (io) {
          const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
          const userName = userResult.rows[0]?.name || 'A student';
          
          const groups = await pool.query(
            'SELECT group_id FROM group_members WHERE user_id = $1',
            [userId]
          );

          groups.rows.forEach((row) => {
            io.to(`group_${row.group_id}`).emit('group_activity', {
              groupId: row.group_id,
              userName,
              action: `completed topic "${result.rows[0].name}"`,
              createdAt: new Date().toISOString()
            });
          });
        }
      } catch (socketErr) {
        console.error('Socket group activity emit error:', socketErr);
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update topic status error:', err);
    res.status(500).json({ error: 'Failed to update topic status' });
  }
};

export const deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    // Verify ownership
    const topic = await pool.query(
      `SELECT t.* FROM topics t
       INNER JOIN chapters c ON t.chapter_id = c.id
       INNER JOIN subjects s ON c.subject_id = s.id
       WHERE t.id = $1`,
      [id]
    );

    if (topic.rows.length === 0 || topic.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.query('DELETE FROM topics WHERE id = $1', [id]);

    res.json({ message: 'Topic deleted successfully' });
  } catch (err) {
    console.error('Delete topic error:', err);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
};

export const reorderTopics = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { userId } = req;
    const { topics } = req.body;

    // Verify ownership
    const chapter = await pool.query(
      `SELECT c.* FROM chapters c
       INNER JOIN subjects s ON c.subject_id = s.id
       WHERE c.id = $1`,
      [chapterId]
    );

    if (chapter.rows.length === 0 || chapter.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(topics)) {
      return res.status(400).json({ error: 'Topics array required' });
    }

    // Update order indexes
    for (let i = 0; i < topics.length; i++) {
      await pool.query(
        'UPDATE topics SET order_index = $1 WHERE id = $2',
        [i, topics[i].id]
      );
    }

    res.json({ message: 'Topics reordered successfully' });
  } catch (err) {
    console.error('Reorder topics error:', err);
    res.status(500).json({ error: 'Failed to reorder topics' });
  }
};
