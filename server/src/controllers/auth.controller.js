import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import redis from '../config/redis.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const userId = uuidv4();

    const result = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, last_active_date)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)
       RETURNING id, name, email, created_at`,
      [userId, name, email, hashedPassword]
    );

    const { accessToken, refreshToken } = generateTokens(userId);

    // Store refresh token in Redis
    await redis.setEx(`refresh_${userId}`, 7 * 24 * 60 * 60, refreshToken);

    res.status(201).json({
      user: result.rows[0],
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not registered' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcryptjs.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last active date
    await pool.query(
      'UPDATE users SET last_active_date = CURRENT_DATE WHERE id = $1',
      [user.id]
    );

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token in Redis
    await redis.setEx(`refresh_${user.id}`, 7 * 24 * 60 * 60, refreshToken);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Missing refresh token' });
    }

    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const storedToken = await redis.get(`refresh_${decoded.userId}`);

    if (storedToken !== refreshToken) {
      return res.status(401).json({ error: 'Refresh token mismatch' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      decoded.userId
    );

    // Update refresh token in Redis
    await redis.setEx(`refresh_${decoded.userId}`, 7 * 24 * 60 * 60, newRefreshToken);

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

export const logout = async (req, res) => {
  try {
    const { userId } = req;

    if (userId) {
      await redis.del(`refresh_${userId}`);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const { userId } = req;
    const result = await pool.query(
      'SELECT id, name, email, streak_count, created_at, avatar_url FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

