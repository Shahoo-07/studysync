import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

export const logSession = async (req, res) => {
  try {
    const { userId } = req;
    const { topicId, subjectId, durationMinutes } = req.body;

    if (!durationMinutes) {
      return res.status(400).json({ error: 'Duration required' });
    }

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO study_sessions (id, user_id, topic_id, subject_id, duration_minutes, session_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
       RETURNING id, created_at`,
      [id, userId, topicId || null, subjectId || null, durationMinutes]
    );

    // Update user's last_active_date
    await pool.query(
      'UPDATE users SET last_active_date = CURRENT_DATE WHERE id = $1',
      [userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Log session error:', err);
    res.status(500).json({ error: 'Failed to log session' });
  }
};

export const getStreak = async (req, res) => {
  try {
    const { userId } = req;

    const result = await pool.query(
      `SELECT
         streak_count as currentStreak,
         last_active_date
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    let currentStreak = user.currentStreak || 0;

    // Check if streak should be reset
    const lastActiveDate = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (lastActiveDate) {
      const lastActive = new Date(lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

      if (daysDiff > 1) {
        currentStreak = 0;
      }
    }

    res.json({
      currentStreak,
      lastActiveDate: user.lastActiveDate,
    });
  } catch (err) {
    console.error('Get streak error:', err);
    res.status(500).json({ error: 'Failed to fetch streak' });
  }
};

export const getHeatmap = async (req, res) => {
  try {
    const { userId } = req;
    const { days = 90 } = req.query;

    const result = await pool.query(
      `SELECT
         session_date,
         COUNT(*) as sessionCount,
         SUM(duration_minutes) as totalDuration
       FROM study_sessions
       WHERE user_id = $1
       AND session_date >= CURRENT_DATE - INTERVAL '1 day' * $2
       GROUP BY session_date
       ORDER BY session_date`,
      [userId, days]
    );

    // Create heatmap data
    const heatmapData = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      heatmapData[dateStr] = 0;
    }

    result.rows.forEach((row) => {
      const dateStr = new Date(row.session_date).toISOString().split('T')[0];
      heatmapData[dateStr] = row.sessionCount;
    });

    res.json(heatmapData);
  } catch (err) {
    console.error('Get heatmap error:', err);
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
};

export const getWeakAreas = async (req, res) => {
  try {
    const { userId } = req;

    const result = await pool.query(
      `SELECT
         t.id,
         t.name,
         c.name as chapterName,
         s.name as subjectName,
         t.created_at,
         COUNT(DISTINCT ss.id) as sessionCount
       FROM topics t
       INNER JOIN chapters c ON t.chapter_id = c.id
       INNER JOIN subjects s ON c.subject_id = s.id
       LEFT JOIN study_sessions ss ON t.id = ss.topic_id
       WHERE s.user_id = $1
       AND t.status = 'in_progress'
       AND t.created_at <= NOW() - INTERVAL '3 days'
       GROUP BY t.id, t.name, c.name, s.name, t.created_at
       ORDER BY t.created_at ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get weak areas error:', err);
    res.status(500).json({ error: 'Failed to fetch weak areas' });
  }
};

export const getPace = async (req, res) => {
  try {
    const { userId } = req;
    const { subjectId } = req.params;

    // Get subject with exam date
    const subject = await pool.query(
      'SELECT id, exam_date FROM subjects WHERE id = $1 AND user_id = $2',
      [subjectId, userId]
    );

    if (subject.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    if (!subject.rows[0].exam_date) {
      return res.json({ message: 'No exam date set for this subject' });
    }

    const examDate = new Date(subject.rows[0].exam_date);
    const today = new Date();
    const daysUntilExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

    // Get total and completed topics
    const topicStats = await pool.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
       FROM topics
       WHERE chapter_id IN (SELECT id FROM chapters WHERE subject_id = $1)`,
      [subjectId]
    );

    const { total, completed } = topicStats.rows[0];
    const remaining = total - completed;
    const topicsPerDay = daysUntilExam > 0 ? Math.ceil(remaining / daysUntilExam) : 0;

    res.json({
      total,
      completed,
      remaining,
      daysUntilExam,
      topicsPerDay,
      examDate: subject.rows[0].exam_date,
    });
  } catch (err) {
    console.error('Get pace error:', err);
    res.status(500).json({ error: 'Failed to fetch pace' });
  }
};
