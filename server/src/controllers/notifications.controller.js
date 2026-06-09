import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';

export const getNotifications = async (req, res) => {
  try {
    const { userId } = req;
    const { limit = 20 } = req.query;

    const result = await pool.query(
      `SELECT id, type, payload, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { userId } = req;
    const { notificationId } = req.params;

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id, type, payload, is_read, created_at`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req;

    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { userId } = req;
    const { notificationId } = req.params;

    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Helper function to create notification (used by other controllers)
export const createNotification = async (userId, type, payload) => {
  try {
    const id = uuidv4();

    await pool.query(
      `INSERT INTO notifications (id, user_id, type, payload)
       VALUES ($1, $2, $3, $4)`,
      [id, userId, type, JSON.stringify(payload)]
    );

    return id;
  } catch (err) {
    console.error('Create notification error:', err);
  }
};
