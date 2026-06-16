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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO study_sessions (id, user_id, topic_id, subject_id, duration_minutes, session_date)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
         RETURNING id, created_at`,
        [id, userId, topicId || null, subjectId || null, durationMinutes]
      );

      // Fetch user's current streak and last active date in DB timezone
      const userRes = await client.query(
        `SELECT 
           TO_CHAR(last_active_date, 'YYYY-MM-DD') as last_active_date_str, 
           streak_count 
         FROM users 
         WHERE id = $1`,
        [userId]
      );

      const user = userRes.rows[0];
      let newStreak = user.streak_count || 0;
      const lastActiveStr = user.last_active_date_str;

      // Fetch today and yesterday in DB timezone
      const dateQuery = await client.query(
        "SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') as today, TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD') as yesterday"
      );
      const { today, yesterday } = dateQuery.rows[0];

      if (!lastActiveStr) {
        // First session ever
        newStreak = 1;
      } else if (lastActiveStr === today) {
        // Already active today, streak remains same
      } else if (lastActiveStr === yesterday) {
        // Active yesterday, increment streak
        newStreak += 1;
      } else {
        // Streak broken, reset to 1
        newStreak = 1;
      }

      // Update user's last_active_date and streak_count
      await client.query(
        'UPDATE users SET last_active_date = CURRENT_DATE, streak_count = $1 WHERE id = $2',
        [newStreak, userId]
      );

      await client.query('COMMIT');

      res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Log session error:', err);
    res.status(500).json({ error: 'Failed to log session' });
  }
};

export const getStreak = async (req, res) => {
  try {
    const { userId } = req;

    // Get today and yesterday in database timezone
    const dateQuery = await pool.query(
      "SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') as today, TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD') as yesterday"
    );
    const { today, yesterday } = dateQuery.rows[0];

    const result = await pool.query(
      `SELECT
         streak_count,
         TO_CHAR(last_active_date, 'YYYY-MM-DD') as "lastActiveDate"
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    let currentStreak = user.streak_count || 0;
    const lastActiveDateStr = user.lastActiveDate;

    // Check if streak should be reset (if last study date is neither today nor yesterday)
    if (lastActiveDateStr && lastActiveDateStr !== today && lastActiveDateStr !== yesterday) {
      currentStreak = 0;
      await pool.query('UPDATE users SET streak_count = 0 WHERE id = $1', [userId]);
    }

    res.json({
      currentStreak,
      lastActiveDate: lastActiveDateStr,
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
         TO_CHAR(session_date, 'YYYY-MM-DD') as "sessionDate",
         COUNT(*) as "sessionCount",
         SUM(duration_minutes) as "totalDuration"
       FROM study_sessions
       WHERE user_id = $1
       AND session_date >= CURRENT_DATE - INTERVAL '1 day' * $2
       GROUP BY session_date
       ORDER BY session_date`,
      [userId, days]
    );

    // Get today's date in database timezone
    const dateQuery = await pool.query(
      "SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') as today"
    );
    const todayStr = dateQuery.rows[0].today;
    const [year, month, day] = todayStr.split('-').map(Number);

    // Helper to format local date components
    const formatDateLocal = (date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    // Create heatmap data starting from database's CURRENT_DATE
    const heatmapData = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(year, month - 1, day);
      date.setDate(date.getDate() - i);
      const dateStr = formatDateLocal(date);
      heatmapData[dateStr] = 0;
    }

    result.rows.forEach((row) => {
      if (heatmapData[row.sessionDate] !== undefined) {
        heatmapData[row.sessionDate] = parseInt(row.sessionCount, 10);
      }
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

    const rows = result.rows.map((row) => ({
      ...row,
      sessionCount: parseInt(row.sessionCount, 10),
    }));

    res.json(rows);
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
