/**
 * Export Service
 * Handles data export in various formats
 * Pure functions for data transformation
 */

const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Convert data to JSON format
 */
const toJSON = (data) => {
  return JSON.stringify(data, null, 2);
};

/**
 * Convert data to CSV format
 */
const toCSV = (data) => {
  const headers = ['ID', 'URL', 'Title', 'Description', 'Image', 'Price', 'Verified', 'Created At'];
  const csvRows = [headers.join(',')];

  data.forEach((row) => {
    const values = [
      row.id,
      `"${(row.url || '').replace(/"/g, '""')}"`,
      `"${(row.title || '').replace(/"/g, '""')}"`,
      `"${(row.description || '').replace(/"/g, '""')}"`,
      `"${(row.image || '').replace(/"/g, '""')}"`,
      `"${(row.price || '').replace(/"/g, '""')}"`,
      row.verified ? 'Yes' : 'No',
      row.created_at,
    ];
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
};

/**
 * Write content to file
 */
const writeToFile = (filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    logger.success(`Data exported to ${filePath}`);
    return { success: true, path: filePath };
  } catch (error) {
    logger.error(`Export error: ${error.message}`);
    throw new Error(`Export processing error: ${error.message}`);
  }
};

/**
 * Export data to file
 */
const exportData = (data, filePath, format) => {
  const isCSV = format === 'csv' || filePath.endsWith('.csv');
  const content = isCSV ? toCSV(data) : toJSON(data);

  return writeToFile(filePath, content);
};

module.exports = {
  toJSON,
  toCSV,
  exportData,
};
