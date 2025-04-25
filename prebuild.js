#!/usr/bin/env node

/**
 * Prebuild script for local and CI builds
 * This script performs basic build preparation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Running prebuild script...');

// Clean build artifacts
console.log('🧹 Cleaning previous build artifacts...');
try {
  execSync('rimraf dist .vite', { stdio: 'inherit' });
} catch (error) {
  console.warn('⚠️ Warning: Could not clean all artifacts:', error.message);
}

console.log('✅ Prebuild completed successfully!'); 