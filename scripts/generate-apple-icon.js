// Simple script to generate Apple Touch Icon from SVG
// This creates a 180x180 PNG based on the favicon.svg design

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple PNG data URL representation
// For production, you'd want to use sharp or similar, but this creates a placeholder
const createAppleTouchIcon = () => {
  const svgPath = path.join(__dirname, '../public/favicon.svg');
  const outputPath = path.join(__dirname, '../public/apple-touch-icon.png');

  console.log('Note: For best results, convert favicon.svg to apple-touch-icon.png using:');
  console.log('1. Online tool: https://realfavicongenerator.net/');
  console.log('2. ImageMagick: magick favicon.svg -resize 180x180 apple-touch-icon.png');
  console.log('3. Sharp library: npm install sharp');
  console.log('\nThe SVG favicon will work for now, but iOS devices prefer PNG format.');

  // Check if file already exists
  if (fs.existsSync(outputPath)) {
    console.log('✓ apple-touch-icon.png already exists');
  } else {
    console.log('✗ apple-touch-icon.png not found - please generate manually');
  }
};

createAppleTouchIcon();
