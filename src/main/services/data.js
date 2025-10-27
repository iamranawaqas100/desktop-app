/**
 * Data Management Service
 * Handles in-memory data storage and operations
 * Pure functions for data manipulation
 */

const logger = require('../utils/logger');

// In-memory data storage
let extractedData = [];
// let templates = []; // Reserved for future template feature

/**
 * Initialize data storage
 */
const initializeStorage = () => {
  extractedData = [];
  // templates = []; // Reserved for future template feature
  logger.info('Initialized in-memory data storage');
};

/**
 * Get all extracted data sorted by creation date
 */
const getAllData = () => {
  return [...extractedData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

/**
 * Save new extracted data item
 */
const saveData = (data) => {
  const {
    url, title, description, image, price,
  } = data;

  const id = extractedData.length > 0
    ? Math.max(...extractedData.map((item) => item.id)) + 1
    : 1;

  const newItem = {
    id,
    url,
    title,
    description,
    image,
    price,
    verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  extractedData.push(newItem);
  return newItem;
};

/**
 * Update existing data item
 */
const updateData = (id, data) => {
  const itemIndex = extractedData.findIndex((item) => item.id === id);

  if (itemIndex === -1) {
    throw new Error(`Item with id ${id} not found`);
  }

  const {
    title, description, image, price, verified,
  } = data;

  extractedData[itemIndex] = {
    ...extractedData[itemIndex],
    title,
    description,
    image,
    price,
    verified: verified || false,
    updated_at: new Date().toISOString(),
  };

  return { id, ...data };
};

/**
 * Delete data item
 */
const deleteData = (id) => {
  const itemIndex = extractedData.findIndex((item) => item.id === id);

  if (itemIndex === -1) {
    throw new Error(`Item with id ${id} not found`);
  }

  extractedData.splice(itemIndex, 1);
  return true;
};

/**
 * Clear all data
 */
const clearAllData = () => {
  extractedData = [];
  // templates = []; // Reserved for future template feature
  logger.info('In-memory data cleared');
};

module.exports = {
  initializeStorage,
  getAllData,
  saveData,
  updateData,
  deleteData,
  clearAllData,
};
