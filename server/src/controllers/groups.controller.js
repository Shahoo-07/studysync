import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';

// Generate random 6-char invite code
const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const getGroups = async (req, res) => {
  try {
    const { userId } = req;

    const result = await pool.query(
      `SELECT
         sg.id,
         sg.name,
         sg.description,
         sg.created_by,
         sg.invite_code,
         sg.created_at,
         COUNT(DISTINCT gm.user_id) as memberCount
       FROM study_groups sg
       INNER JOIN group_members gm ON sg.id = gm.group_id
       WHERE gm.user_id = $1
       GROUP BY sg.id, sg.name, sg.description, sg.created_by, sg.invite_code, sg.created_at
       ORDER BY sg.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

export const createGroup = async (req, res) => {
  try {
    const { userId } = req;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name required' });
    }

    const groupId = uuidv4();
    const inviteCode = generateInviteCode();

    // Create group
    await pool.query(
      `INSERT INTO study_groups (id, name, description, created_by, invite_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [groupId, name, description || null, userId, inviteCode]
    );

    // Add creator as admin
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [groupId, userId]
    );

    const result = await pool.query(
      'SELECT id, name, description, created_by, invite_code, created_at FROM study_groups WHERE id = $1',
      [groupId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
};

export const getGroup = async (req, res) => {
  try {
    const { userId } = req;
    const { groupId } = req.params;

    // Verify membership
    const member = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (member.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const result = await pool.query(
      `SELECT
         sg.id,
         sg.name,
         sg.description,
         sg.created_by,
         sg.invite_code,
         sg.created_at,
         COUNT(DISTINCT gm.user_id) as memberCount
       FROM study_groups sg
       LEFT JOIN group_members gm ON sg.id = gm.group_id
       WHERE sg.id = $1
       GROUP BY sg.id, sg.name, sg.description, sg.created_by, sg.invite_code, sg.created_at`,
      [groupId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const { userId } = req;
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code required' });
    }

    // Find group by invite code
    const group = await pool.query(
      'SELECT id FROM study_groups WHERE invite_code = $1',
      [inviteCode]
    );

    if (group.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const groupId = group.rows[0].id;

    // Check if already a member
    const existing = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Already a member of this group' });
    }

    // Add to group
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'member')`,
      [groupId, userId]
    );

    const result = await pool.query(
      'SELECT id, name, description, created_by, invite_code, created_at FROM study_groups WHERE id = $1',
      [groupId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Join group error:', err);
    res.status(500).json({ error: 'Failed to join group' });
  }
};

export const getGroupMembers = async (req, res) => {
  try {
    const { userId } = req;
    const { groupId } = req.params;

    // Verify membership
    const member = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (member.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Get all members with their progress
    const members = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.avatar_url,
         gm.role,
         gm.joined_at
       FROM group_members gm
       INNER JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [groupId]
    );

    // Calculate progress for each member
    const result = await Promise.all(
      members.rows.map(async (m) => {
        const progress = await pool.query(
          `SELECT
             COUNT(DISTINCT t.id) as total,
             SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done
           FROM topics t
           INNER JOIN chapters c ON t.chapter_id = c.id
           INNER JOIN subjects s ON c.subject_id = s.id
           WHERE s.user_id = $1`,
          [m.id]
        );

        const { total, done } = progress.rows[0];

        return {
          ...m,
          totalTopics: total || 0,
          doneTopics: done || 0,
          percentage: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error('Get group members error:', err);
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
};

export const removeGroupMember = async (req, res) => {
  try {
    const { userId } = req;
    const { groupId, memberId } = req.params;

    // Verify admin status
    const admin = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (admin.rows.length === 0 || admin.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    await pool.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, memberId]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Remove group member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

export const getGroupLeaderboard = async (req, res) => {
  try {
    const { userId } = req;
    const { groupId } = req.params;

    // Verify membership
    const member = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (member.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Get leaderboard for group
    const result = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.avatar_url,
         COUNT(DISTINCT t.id) as totalTopics,
         SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as doneTopics,
         ROUND(100.0 * SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) /
           NULLIF(COUNT(DISTINCT t.id), 0)) as percentage
       FROM group_members gm
       INNER JOIN users u ON gm.user_id = u.id
       LEFT JOIN subjects s ON u.id = s.user_id
       LEFT JOIN chapters c ON s.id = c.subject_id
       LEFT JOIN topics t ON c.id = t.chapter_id
       WHERE gm.group_id = $1
       GROUP BY u.id, u.name, u.avatar_url
       ORDER BY percentage DESC NULLS LAST`,
      [groupId]
    );

    // Add rank
    const leaderboard = result.rows.map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

    res.json(leaderboard);
  } catch (err) {
    console.error('Get group leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch group leaderboard' });
  }
};
