import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';

export const getFriends = async (req, res) => {
  try {
    const { userId } = req;

    const result = await pool.query(
      `SELECT
         f.id as id,
         f.requester_id as "requesterId",
         CASE
           WHEN requester_id = $1 THEN addressee_id
           ELSE requester_id
         END as friendId,
         u.name,
         u.email,
         u.avatar_url,
         f.status,
         f.created_at
       FROM friendships f
       INNER JOIN users u ON (
         (f.requester_id = $1 AND u.id = f.addressee_id) OR
         (f.addressee_id = $1 AND u.id = f.requester_id)
       )
       WHERE (f.requester_id = $1 OR f.addressee_id = $1)
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Find user by email
    const user = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.rows[0].id === userId) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }

    const recipientId = user.rows[0].id;

    // Check if friendship already exists
    const existing = await pool.query(
      `SELECT id FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2)
       OR (requester_id = $2 AND addressee_id = $1)`,
      [userId, recipientId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Friendship already exists' });
    }

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO friendships (id, requester_id, addressee_id, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id, requester_id, addressee_id, status, created_at`,
      [id, userId, recipientId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Send friend request error:', err);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
};

export const respondToFriendRequest = async (req, res) => {
  try {
    const { userId } = req;
    const { requestId } = req.params;
    const { action } = req.body;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Verify the request is for this user
    const request = await pool.query(
      'SELECT id, requester_id FROM friendships WHERE id = $1 AND addressee_id = $2',
      [requestId, userId]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (action === 'decline') {
      await pool.query('DELETE FROM friendships WHERE id = $1', [requestId]);
      return res.json({ message: 'Friend request declined' });
    }

    const result = await pool.query(
      `UPDATE friendships SET status = 'accepted' WHERE id = $1
       RETURNING id, requester_id, addressee_id, status, created_at`,
      [requestId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Respond to friend request error:', err);
    res.status(500).json({ error: 'Failed to respond to request' });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const { userId } = req;
    const { friendId } = req.params;

    await pool.query(
      `DELETE FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2)
       OR (requester_id = $2 AND addressee_id = $1)`,
      [userId, friendId]
    );

    res.json({ message: 'Friend removed successfully' });
  } catch (err) {
    console.error('Remove friend error:', err);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
};

export const getFriendProgress = async (req, res) => {
  try {
    const { userId } = req;
    const { friendId } = req.params;

    // Verify friendship and acceptance
    const friendship = await pool.query(
      `SELECT status FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2)
       OR (requester_id = $2 AND addressee_id = $1)`,
      [userId, friendId]
    );

    if (friendship.rows.length === 0 || friendship.rows[0].status !== 'accepted') {
      return res.status(403).json({ error: 'Not authorized to view this friend\'s progress' });
    }

    // Get friend's subjects and progress
    const subjects = await pool.query(
      `SELECT id, name, color FROM subjects WHERE user_id = $1 ORDER BY created_at DESC`,
      [friendId]
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
          color: subject.color,
          total: totalTopics.rows[0].count,
          done: doneTopics.rows[0].count,
          percentage,
        };
      })
    );

    res.json(progress);
  } catch (err) {
    console.error('Get friend progress error:', err);
    res.status(500).json({ error: 'Failed to fetch friend progress' });
  }
};
