#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("🔧 Pre-build checks...\n");

// Function to safely remove directory with retries
function safeRemove(dirPath, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, {
          recursive: true,
          force: true,
          maxRetries: 3,
          retryDelay: 1000,
        });
        return true;
      }
      return true;
    } catch (error) {
      if (i === retries - 1) {
        console.warn(`⚠️  Could not remove ${dirPath}: ${error.message}`);
        console.log(
          "   This is usually okay, electron-builder will handle it.\n"
        );
        return false;
      }
      // Wait before retry
      const delay = (i + 1) * 1000;
      console.log(`   Retrying in ${delay}ms...`);
      execSync(
        `timeout /t ${delay / 1000} /nobreak > nul 2>&1 || sleep ${delay / 1000}`,
        { stdio: "ignore" }
      );
    }
  }
  return false;
}

// Clean previous builds - only clean dist, vite will handle dist-renderer
const dist = path.resolve(__dirname, "../dist");

if (fs.existsSync(dist)) {
  console.log("🧹 Cleaning previous dist folder...\n");
  safeRemove(dist);
}

console.log("✅ Pre-build checks complete\n");
