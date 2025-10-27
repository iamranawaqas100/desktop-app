/**
 * Database Service
 * Persistent storage layer using SQLite
 * Falls back to in-memory if database fails
 */

// const fs = require('fs'); // Reserved for future file operations
const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const { app } = require('electron');
const logger = require('../utils/logger');

// Database state
let db = null;
let usingSQLite = false;

/**
 * Get database path
 * @returns {string} Database file path
 */
const getDatabasePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'data.db');
};

/**
 * Initialize database
 * @returns {boolean} Success status
 */
const initializeDatabase = () => {
  try {
    // Try to initialize SQLite
    // eslint-disable-next-line global-require, import/no-unresolved
    const Database = require('better-sqlite3');
    const dbPath = getDatabasePath();

    logger.info('Initializing database at:', dbPath);

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS extracted_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT,
        title TEXT,
        description TEXT,
        image TEXT,
        price TEXT,
        category TEXT,
        verified INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_created_at ON extracted_data(created_at);
      CREATE INDEX IF NOT EXISTS idx_verified ON extracted_data(verified);
    `);

    usingSQLite = true;
    logger.success('Database initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize SQLite, falling back to in-memory:', error);
    usingSQLite = false;
    return false;
  }
};

/**
 * Get all data
 * @returns {Array} All data items
 */
const getAllData = () => {
  if (usingSQLite && db) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM extracted_data 
        ORDER BY created_at DESC
      `);
      return stmt.all();
    } catch (error) {
      logger.error('Database read error:', error);
      return [];
    }
  }
  return [];
};

/**
 * Save data
 * @param {Object} data - Data to save
 * @returns {Object} Saved data
 */
const saveData = (data) => {
  const now = new Date().toISOString();

  if (usingSQLite && db) {
    try {
      const stmt = db.prepare(`
        INSERT INTO extracted_data (url, title, description, image, price, category, verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        data.url || '',
        data.title || '',
        data.description || '',
        data.image || '',
        data.price || '',
        data.category || '',
        data.verified ? 1 : 0,
        now,
        now,
      );

      return {
        id: result.lastInsertRowid,
        ...data,
        verified: data.verified || false,
        created_at: now,
        updated_at: now,
      };
    } catch (error) {
      logger.error('Database save error:', error);
      throw error;
    }
  }

  throw new Error('Database not available');
};

/**
 * Update data
 * @param {number} id - Item ID
 * @param {Object} data - Data to update
 * @returns {Object} Updated data
 */
const updateData = (id, data) => {
  const now = new Date().toISOString();

  if (usingSQLite && db) {
    try {
      const stmt = db.prepare(`
        UPDATE extracted_data 
        SET title = ?, description = ?, image = ?, price = ?, category = ?, verified = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        data.title || '',
        data.description || '',
        data.image || '',
        data.price || '',
        data.category || '',
        data.verified ? 1 : 0,
        now,
        id,
      );

      return { id, ...data, updated_at: now };
    } catch (error) {
      logger.error('Database update error:', error);
      throw error;
    }
  }

  throw new Error('Database not available');
};

/**
 * Delete data
 * @param {number} id - Item ID
 * @returns {boolean} Success status
 */
const deleteData = (id) => {
  if (usingSQLite && db) {
    try {
      const stmt = db.prepare('DELETE FROM extracted_data WHERE id = ?');
      stmt.run(id);
      return true;
    } catch (error) {
      logger.error('Database delete error:', error);
      throw error;
    }
  }

  throw new Error('Database not available');
};

/**
 * Clear all data
 */
const clearAllData = () => {
  if (usingSQLite && db) {
    try {
      db.exec('DELETE FROM extracted_data');
      logger.info('Database cleared');
    } catch (error) {
      logger.error('Database clear error:', error);
    }
  }
};

/**
 * Close database connection
 */
const closeDatabase = () => {
  if (usingSQLite && db) {
    try {
      db.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database:', error);
    }
  }
};

/**
 * Get database statistics
 * @returns {Object} Statistics
 */
const getStatistics = () => {
  if (usingSQLite && db) {
    try {
      const total = db.prepare('SELECT COUNT(*) as count FROM extracted_data').get();
      const verified = db.prepare('SELECT COUNT(*) as count FROM extracted_data WHERE verified = 1').get();

      return {
        total: total.count,
        verified: verified.count,
        unverified: total.count - verified.count,
        usingSQLite,
      };
    } catch (error) {
      logger.error('Error getting statistics:', error);
      return {
        total: 0, verified: 0, unverified: 0, usingSQLite: false,
      };
    }
  }

  return {
    total: 0, verified: 0, unverified: 0, usingSQLite: false,
  };
};

module.exports = {
  initializeDatabase,
  getAllData,
  saveData,
  updateData,
  deleteData,
  clearAllData,
  closeDatabase,
  getStatistics,
};
