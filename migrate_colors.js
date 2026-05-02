const fs = require('fs');
const path = require('path');

const root = 'C:/Users/86136/Desktop/Overtime_Hours_Accounting/加班工时记账/pages';

// Files to process
const files = [
  'index/index.vue', 'record/record.vue', 'stats/stats.vue',
  'reconciliation/recon.vue', 'salary/salary.vue', 'projects/projects.vue',
  'project-edit/project-edit.vue', 'profile/profile.vue', 'clock/clock.vue',
  'feedback/feedback.vue', 'login/login.vue', 'splash/splash.vue',
  'batch-record/batch-record.vue'
];

// Design system replacements
const replacements = [
  // Page background
  [/background:\s*#F7F7F7/gi, 'background: #F8F6F2'],
  [/background:\s*#F9F9F9/gi, 'background: #F8F6F2'],
  // Border colors (no \b before # since # is not a word char when preceded by space)
  [/#E5E5E5\b/g, '#E8E4DC'],
  // Text primary
  [/#1A1C1C\b/g, '#1E1E1E'],
  // Text secondary
  [/#666666\b/g, '#5C5C5C'],
  // Text muted
  [/#999999\b/g, '#9C9C9C'],
  // Surface hover / inactive bg
  [/#F0F0F0\b/g, '#F0EDE6'],
  // Inactive switch
  [/#DDDDDD\b/g, '#E8E4DC'],
  // Old green
  [/#07C160\b/gi, '#1B8A5A'],
  // Old green in rgba
  [/rgba\(\s*7\s*,\s*193\s*,\s*96\s*,/gi, 'rgba(27, 138, 90,'],
  // TabBar inactive
  [/#CCCCCC\b/g, '#9C9C9C'],
  // Button hover (should be primary-hover)
  [/#05A050\b/gi, '#15734B'],
  [/#00A650\b/gi, '#167A4E'],
  [/#008A3D\b/gi, '#15734B'],
  // Placeholder style color
  ['placeholder-style="color: #CCCCCC', 'placeholder-style="color: #9C9C9C'],
  // TabBar border top
  [/\b#E0E0E0\b/g, '#E8E4DC'],
  // Gradient companion colors in login/splash
  [/rgba\(0,\s*0,\s*0,\s*0\.05\)/gi, 'rgba(0, 0, 0, 0.04)'],
];

let totalChanges = 0;

for (const file of files) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${file} not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  for (const [pattern, replacement] of replacements) {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      // Count changes by diff
      const diff = (content.match(new RegExp(pattern.source, 'g')) || []).length;
      totalChanges += diff;
      console.log(`${file}: ${pattern.source} → ${replacement} (${diff}x)`);
      content = newContent;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

console.log(`\n=== DONE: ${totalChanges} replacements across ${files.length} files ===`);
