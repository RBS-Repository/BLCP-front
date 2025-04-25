#!/usr/bin/env node

/**
 * Prebuild script for Vercel deployment
 * This script ensures all React packages and dependencies are correctly installed
 * and configured before building the app.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Running prebuild script for Vercel deployment...');

// Read package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Ensure we're using compatible versions of React packages
const requiredDeps = {
  'react': packageJson.dependencies['react'],
  'react-dom': packageJson.dependencies['react-dom'],
  'scheduler': packageJson.dependencies['scheduler'] || "^0.23.0"
};

// Check if scheduler is missing
if (!packageJson.dependencies['scheduler']) {
  console.log('📦 Adding scheduler package as a dependency...');
  
  // Add scheduler to dependencies
  packageJson.dependencies['scheduler'] = requiredDeps['scheduler'];
  
  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  // Install the new dependency
  console.log('📥 Installing scheduler package...');
  execSync('npm install', { stdio: 'inherit' });
}

// Create a resolve-alias file to help with module resolution
const resolveAliasPath = path.join(process.cwd(), 'node_modules', '.vite', 'resolve-alias.js');
const resolveAliasDir = path.dirname(resolveAliasPath);

if (!fs.existsSync(resolveAliasDir)) {
  fs.mkdirSync(resolveAliasDir, { recursive: true });
}

// This file helps ensure proper module resolution during build
const resolveAliasContent = `
// This file ensures proper module resolution for React packages
module.exports = {
  react: require.resolve('react'),
  'react-dom': require.resolve('react-dom'),
  scheduler: require.resolve('scheduler')
};
`;

fs.writeFileSync(resolveAliasPath, resolveAliasContent);
console.log('✅ Created module resolution helpers');

// Clean build artifacts
console.log('🧹 Cleaning previous build artifacts...');
try {
  execSync('rimraf dist .vite node_modules/.vite', { stdio: 'inherit' });
} catch (error) {
  console.warn('⚠️ Warning: Could not clean all artifacts:', error.message);
}

console.log('✅ Prebuild completed successfully!'); 