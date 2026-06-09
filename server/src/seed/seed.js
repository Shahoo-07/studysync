import pool from '../config/db.js';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const seedDatabase = async () => {
  try {
    // Truncate tables to avoid duplicate key errors on repeated runs
    await pool.query(
      'TRUNCATE TABLE users, friendships, study_groups, group_members, progress_visibility, files, file_folders, file_permissions, notifications CASCADE'
    );

    // Create test users
    const user1Id = uuidv4();
    const user2Id = uuidv4();

    const hashedPassword = await bcryptjs.hash('password123', 10);

    // Insert users
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, last_active_date)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
      [user1Id, 'John Doe', 'john@example.com', hashedPassword]
    );

    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, last_active_date)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
      [user2Id, 'Jane Smith', 'jane@example.com', hashedPassword]
    );

    // Create subjects for user1
    const subject1Id = uuidv4();
    const subject2Id = uuidv4();

    await pool.query(
      `INSERT INTO subjects (id, user_id, name, color, exam_date)
       VALUES ($1, $2, $3, $4, $5)`,
      [subject1Id, user1Id, 'Mathematics', '#E8DDD0', '2024-06-15']
    );

    await pool.query(
      `INSERT INTO subjects (id, user_id, name, color, exam_date)
       VALUES ($1, $2, $3, $4, $5)`,
      [subject2Id, user1Id, 'Physics', '#8B6E52', '2024-06-20']
    );

    // Create chapters for Mathematics
    const chapter1Id = uuidv4();
    const chapter2Id = uuidv4();

    await pool.query(
      `INSERT INTO chapters (id, subject_id, name, order_index)
       VALUES ($1, $2, $3, $4)`,
      [chapter1Id, subject1Id, 'Algebra', 0]
    );

    await pool.query(
      `INSERT INTO chapters (id, subject_id, name, order_index)
       VALUES ($1, $2, $3, $4)`,
      [chapter2Id, subject1Id, 'Geometry', 1]
    );

    // Create topics
    const topic1Id = uuidv4();
    const topic2Id = uuidv4();
    const topic3Id = uuidv4();

    await pool.query(
      `INSERT INTO topics (id, chapter_id, name, status, order_index)
       VALUES ($1, $2, $3, $4, $5)`,
      [topic1Id, chapter1Id, 'Linear Equations', 'done', 0]
    );

    await pool.query(
      `INSERT INTO topics (id, chapter_id, name, status, order_index)
       VALUES ($1, $2, $3, $4, $5)`,
      [topic2Id, chapter1Id, 'Quadratic Equations', 'in_progress', 1]
    );

    await pool.query(
      `INSERT INTO topics (id, chapter_id, name, status, order_index)
       VALUES ($1, $2, $3, $4, $5)`,
      [topic3Id, chapter2Id, 'Triangles', 'not_started', 0]
    );

    // Create study session
    const sessionId = uuidv4();
    await pool.query(
      `INSERT INTO study_sessions (id, user_id, topic_id, subject_id, duration_minutes, session_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
      [sessionId, user1Id, topic1Id, subject1Id, 45]
    );

    // Create friendship
    const friendshipId = uuidv4();
    await pool.query(
      `INSERT INTO friendships (id, requester_id, addressee_id, status)
       VALUES ($1, $2, $3, $4)`,
      [friendshipId, user1Id, user2Id, 'accepted']
    );

    // Create study group
    const groupId = uuidv4();
    await pool.query(
      `INSERT INTO study_groups (id, name, description, created_by, invite_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [groupId, 'Math Study Group', 'Preparing for board exams', user1Id, 'MATH123']
    );

    // Add members to group
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [groupId, user1Id, 'admin']
    );

    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [groupId, user2Id, 'member']
    );

    console.log('✓ Database seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
};

seedDatabase();
