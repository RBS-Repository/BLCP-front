/**
 * Pre-build script for Vercel deployments
 * Run this before production builds: node prebuild-vercel.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

try {
  // Get the directory name in ES modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Environment validation
  console.log('Preparing build environment for Vercel...');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'Not set (will default to production)'}`);

  // Setting proper environment variables if not set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
    console.log('Set NODE_ENV to production');
  }

  // Check for .env files
  const envFilePath = path.join(__dirname, '.env');
  const envProdPath = path.join(__dirname, '.env.production');

  if (!fs.existsSync(envProdPath) && fs.existsSync(envFilePath)) {
    console.log('Creating .env.production from .env file...');
    const envContent = fs.readFileSync(envFilePath, 'utf8');
    
    // Remove any development-specific variables or comments
    const prodEnvContent = envContent
      .split('\n')
      .filter(line => 
        !line.trim().startsWith('#') && 
        !line.includes('VITE_DEV_') && 
        line.trim() !== ''
      )
      .join('\n');
    
    fs.writeFileSync(envProdPath, prodEnvContent);
    console.log('.env.production created successfully');
  }

  // Create directory for critical CSS if it doesn't exist
  const criticalCssDir = path.join(__dirname, 'src', 'styles');
  if (!fs.existsSync(criticalCssDir)) {
    console.log('Creating directory for critical CSS...');
    fs.mkdirSync(criticalCssDir, { recursive: true });
    
    // Create a placeholder critical CSS file if referenced but not existing
    const criticalCssPath = path.join(criticalCssDir, 'critical.css');
    if (!fs.existsSync(criticalCssPath)) {
      fs.writeFileSync(criticalCssPath, '/* Critical CSS will be generated here */');
      console.log('Created placeholder critical.css');
    }
  }

  // Check if vendor chunk directory exists
  const chunksDir = path.join(__dirname, 'src', 'chunks');
  if (!fs.existsSync(chunksDir)) {
    console.log('Creating directory for JS chunks if referenced in HTML...');
    fs.mkdirSync(chunksDir, { recursive: true });
  }

  console.log('Environment preparation complete. Ready to build for production.');
} catch (error) {
  // Log the error but don't fail the build
  console.error('Error in prebuild script, but continuing build process:', error);
  console.log('Continuing with build despite prebuild error');
} 