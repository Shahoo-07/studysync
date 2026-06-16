import pool from '../config/db.js';

export const getFriendLeaderboard = async (req, res) => {
  try {
    const { userId } = req;
    const { subjectId } = req.query;

    // Get all accepted friends
    const friends = await pool.query(
      `SELECT
         CASE
           WHEN requester_id = $1 THEN addressee_id
           ELSE requester_id
         END as "friendId"
       FROM friendships
       WHERE status = 'accepted'
       AND (requester_id = $1 OR addressee_id = $1)`,
      [userId]
    );

    // Add current user to the list
    const allUsers = [userId, ...friends.rows.map((f) => f.friendId)];

    // Get progress for each user
    let leaderboard;

    if (subjectId) {
      leaderboard = await pool.query(
        `SELECT
           u.id,
           u.name,
           u.avatar_url,
           COUNT(DISTINCT t.id) as "totalTopics",
           SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as "doneTopics",
           ROUND(100.0 * SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) /
             NULLIF(COUNT(DISTINCT t.id), 0)) as percentage
         FROM users u
         LEFT JOIN subjects s ON u.id = s.user_id
         LEFT JOIN chapters c ON s.id = c.subject_id
         LEFT JOIN topics t ON c.id = t.chapter_id
         WHERE u.id = ANY($1)
         AND (s.id = $2 OR s.id IS NULL)
         GROUP BY u.id, u.name, u.avatar_url
         ORDER BY percentage DESC NULLS LAST`,
        [allUsers, subjectId]
      );
    } else {
      leaderboard = await pool.query(
        `SELECT
           u.id,
           u.name,
           u.avatar_url,
           COUNT(DISTINCT t.id) as "totalTopics",
           SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as "doneTopics",
           ROUND(100.0 * SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) /
             NULLIF(COUNT(DISTINCT t.id), 0)) as percentage
         FROM users u
         LEFT JOIN subjects s ON u.id = s.user_id
         LEFT JOIN chapters c ON s.id = c.subject_id
         LEFT JOIN topics t ON c.id = t.chapter_id
         WHERE u.id = ANY($1)
         GROUP BY u.id, u.name, u.avatar_url
         ORDER BY percentage DESC NULLS LAST`,
        [allUsers]
      );
    }

    // Add rank
    const result = leaderboard.rows.map((row, index) => ({
      ...row,
      rank: index + 1,
      isCurrentUser: row.id === userId,
    }));

    res.json(result);
  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};
