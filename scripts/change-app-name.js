#!/usr/bin/env node
/**
 * Application Name Change Script
 *
 * This script changes the application name across all files.
 *
 * Usage:
 *   node scripts/change-app-name.js "New Application Name"
 *
 * Options:
 *   Option 1: "Centro de Control del Gabinete del Ministerio"
 *   Option 2: "Centro de Sistemas de Gestión del Ministro"
 */

const fs = require('fs');
const path = require('path');

const OLD_NAME = 'Centro de Comando Ministerial';
const NEW_NAME = process.argv[2];

if (!NEW_NAME) {
  console.error('❌ Error: Please provide the new application name');
  console.log('\nUsage:');
  console.log('  node scripts/change-app-name.js "New Name"');
  console.log('\nOptions:');
  console.log('  1. "Centro de Control del Gabinete del Ministerio"');
  console.log('  2. "Centro de Sistemas de Gestión del Ministro"');
  process.exit(1);
}

// Files to update
const filesToUpdate = [
  'backend/prisma/seed.ts',
  'plan/UPDATED_PROJECT_PLAN_2026.md',
  'src/components/layout/Sidebar.tsx',
  'backend/src/email/email.service.ts',
  'backend/src/email/templates/welcome.html',
  'backend/src/email/templates/deadline-reminder.html',
  'backend/src/email/templates/signature-required.html',
  'backend/src/email/templates/comment-added.html',
  'backend/src/email/templates/status-changed.html',
  'backend/src/email/templates/document-assigned.html',
  'backend/src/email/templates/document-decreed.html',
  'src/pages/Register.tsx',
  'src/pages/Login.tsx',
  'backend/src/main.ts',
  'README.md',
  'plan/FRONTEND_COMPONENTS_SPEC.md',
  'plan/PROJECT_IMPLEMENTATION_PLAN_BUDGET.md',
  'index.html',
];

console.log('🔄 Changing application name...');
console.log(`   Old: "${OLD_NAME}"`);
console.log(`   New: "${NEW_NAME}"\n`);

let filesUpdated = 0;
let totalReplacements = 0;

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipped (not found): ${filePath}`);
    return;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    // Count occurrences
    const matches = content.match(new RegExp(OLD_NAME, 'gi'));
    const count = matches ? matches.length : 0;

    if (count > 0) {
      // Replace all case variations
      content = content.replace(new RegExp(OLD_NAME, 'gi'), NEW_NAME);

      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Updated: ${filePath} (${count} replacement${count > 1 ? 's' : ''})`);
      filesUpdated++;
      totalReplacements += count;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
});

console.log('\n' + '='.repeat(60));
console.log('✅ APPLICATION NAME CHANGE COMPLETE');
console.log('='.repeat(60));
console.log(`\n📊 Summary:`);
console.log(`   Files updated: ${filesUpdated}`);
console.log(`   Total replacements: ${totalReplacements}`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Review the changes: git diff`);
console.log(`   2. Test the application locally`);
console.log(`   3. Commit changes: git add . && git commit -m "Update application name"`);
console.log(`   4. Deploy to production\n`);
