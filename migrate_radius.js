const fs = require('fs');
const path = require('path');
const root = 'C:/Users/86136/Desktop/Overtime_Hours_Accounting/加班工时记账';

const files = [
  'pages/index/index.vue', 'pages/record/record.vue', 'pages/stats/stats.vue',
  'pages/reconciliation/recon.vue', 'pages/salary/salary.vue',
  'pages/projects/projects.vue', 'pages/project-edit/project-edit.vue',
  'pages/profile/profile.vue', 'pages/clock/clock.vue',
  'pages/feedback/feedback.vue', 'pages/login/login.vue',
  'pages/splash/splash.vue', 'pages/batch-record/batch-record.vue',
  'components/NavBar.vue', 'components/SummaryCard.vue', 'components/CellItem.vue',
  'components/EmptyState.vue', 'components/Toast.vue', 'components/SyncStatus.vue'
];

let totalChanges = 0;

for (const relPath of files) {
  const fp = path.join(root, relPath);
  if (!fs.existsSync(fp)) { console.log('SKIP:', relPath); continue; }
  let content = fs.readFileSync(fp, 'utf-8');
  let changed = false;

  // Primary action buttons (bottom-bar__save, login-btn, etc.) - custom property
  // Just replace all border-radius: 10px on bottom-bar related elements
  if (relPath.includes('index') || relPath.includes('record') ||
      relPath.includes('project-edit') || relPath.includes('batch-record') ||
      relPath.includes('salary') || relPath.includes('feedback') ||
      relPath.includes('profile') || relPath.includes('login')) {

    // Save buttons: bottom-bar__save, bottom-bar__delete
    let re = /(\.bottom-bar__save[\s\S]*?)(border-radius:\s*)10px/gi;
    if (re.test(content)) {
      content = content.replace(re, '$1$220px');
      console.log(relPath + ': bottom-bar__save radius 10px -> 20px');
      changed = true;
    }
    re = /(\.bottom-bar__delete[\s\S]*?)(border-radius:\s*)10px/gi;
    if (re.test(content)) {
      content = content.replace(re, '$1$220px');
      console.log(relPath + ': bottom-bar__delete radius 10px -> 20px');
      changed = true;
    }
  }

  // Login page specific
  if (relPath.includes('login')) {
    let re = /(\.univerify-btn[\s\S]*?)(border-radius:\s*)25px/gi;
    if (re.test(content)) {
      content = content.replace(re, '$1$220px');
      console.log(relPath + ': univerify-btn radius 25px -> 20px');
      changed = true;
    }
    // login-btn
    let m = /(\.login-btn[\s\S]*?)(border-radius:\s*)12px/gi;
    if (m.test(content)) {
      content = content.replace(m, '$1$220px');
      console.log(relPath + ': login-btn radius 12px -> 20px');
      changed = true;
    }
  }

  // rate-sheet btn
  if (relPath.includes('record')) {
    let re = /(\.rate-sheet__btn--confirm[\s\S]*?)(border-radius:\s*)12px/gi;
    if (re.test(content)) {
      content = content.replace(re, '$1$220px');
      console.log(relPath + ': rate-sheet__btn--confirm radius 12px -> 20px');
      changed = true;
    }
  }

  // Clock status - should be 20px (pill)
  if (relPath.includes('index')) {
    let re = /(\.clock-status[\s\S]*?)(border-radius:\s*)(\d+)px/gi;
    if (re.test(content)) {
      // Reset lastIndex
      re.lastIndex = 0;
      content = content.replace(re, (match, prefix, prop, val) => {
        return prefix + prop + '20px';
      });
      console.log(relPath + ': clock-status radius -> 20px');
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(fp, content, 'utf-8');
    totalChanges++;
  }
}

console.log('\n=== DONE: ' + totalChanges + ' files updated ===');
