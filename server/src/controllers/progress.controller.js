import pool from '../config/db.js';

export const getProgressOverview = async (req, res) => {
  try {
    const { userId } = req;

    const subjects = await pool.query(
      'SELECT id, name FROM subjects WHERE user_id = $1',
      [userId]
    );

    const progress = await Promise.all(
      subjects.rows.map(async (subject) => {
        const totalTopics = await pool.query(
          `SELECT COUNT(*) as count FROM topics
           WHERE chapter_id IN (SELECT id FROM chapters WHERE subject_id = $1)`,
          [subject.id]
        );

        const doneTopics = await pool.query(
          `SELECT COUNT(*) as count FROM topics
           WHERE chapter_id IN (SELECT id FROM chapters WHERE subject_id = $1)
           AND status = 'done'`,
          [subject.id]
        );

        const percentage = totalTopics.rows[0].count > 0
          ? Math.round((doneTopics.rows[0].count / totalTopics.rows[0].count) * 100)
          : 0;

        return {
          subjectId: subject.id,
          subjectName: subject.name,
          total: totalTopics.rows[0].count,
          done: doneTopics.rows[0].count,
          percentage,
        };
      })
    );

    res.json(progress);
  } catch (err) {
    console.error('Get progress overview error:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
};

export const getSubjectProgress = async (req, res) => {
  try {
    const { userId } = req;
    const { subjectId } = req.params;

    // Verify ownership
    const subject = await pool.query(
      'SELECT user_id FROM subjects WHERE id = $1',
      [subjectId]
    );

    if (subject.rows.length === 0 || subject.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const chapters = await pool.query(
      `SELECT id, name FROM chapters WHERE subject_id = $1 ORDER BY order_index`,
      [subjectId]
    );

    const progress = await Promise.all(
      chapters.rows.map(async (chapter) => {
        const totalTopics = await pool.query(
          'SELECT COUNT(*) as count FROM topics WHERE chapter_id = $1',
          [chapter.id]
        );

        const doneTopics = await pool.query(
          'SELECT COUNT(*) as count FROM topics WHERE chapter_id = $1 AND status = \'done\'',
          [chapter.id]
        );

        const percentage = totalTopics.rows[0].count > 0
          ? Math.round((doneTopics.rows[0].count / totalTopics.rows[0].count) * 100)
          : 0;

        return {
          chapterId: chapter.id,
          chapterName: chapter.name,
          total: totalTopics.rows[0].count,
          done: doneTopics.rows[0].count,
          percentage,
        };
      })
    );

    res.json(progress);
  } catch (err) {
    console.error('Get subject progress error:', err);
    res.status(500).json({ error: 'Failed to fetch subject progress' });
  }
};
