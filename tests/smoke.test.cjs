const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const requiredFiles = [
  'index.html',
  'css/base.css',
  'js/app.js',
  'manifest.webmanifest',
  'sw.js',
  'assets/favicon.svg',
  'assets/icon-192.svg',
  'assets/icon-512.svg',
];
for (const file of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, file)), `Missing required app file: ${file}`);
}

for (const file of ['js/app.js', 'sw.js']) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  assert.equal(result.status, 0, `Syntax check failed for ${file}: ${result.stderr}`);
}

const manifest = JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.start_url);
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
for (const icon of manifest.icons) {
  assert.ok(fs.existsSync(path.join(root, icon.src)), `Manifest icon does not exist: ${icon.src}`);
}

const html = read('index.html');
const app = read('js/app.js');
const worker = read('sw.js');
for (const id of ['pageContent', 'modalBackdrop', 'workspaceImportInput', 'toastRegion']) {
  assert.ok(html.includes(`id="${id}"`), `HTML is missing required mount/control: ${id}`);
}
for (const feature of ['overview', 'academics', 'semesters', 'planner', 'study', 'insights', 'personal', 'trackers', 'settings']) {
  assert.ok(app.includes(`${feature}:`), `App route missing: ${feature}`);
}
for (const action of ['trackerForm', 'trackerRecordForm', 'semesterForm', 'export-data', 'export-csv', 'import-confirm']) {
  assert.ok(app.includes(action), `Expected workspace capability missing: ${action}`);
}
assert.ok(worker.includes('APP_SHELL'), 'Service worker must declare an app shell cache');
assert.ok(worker.includes('skipWaiting'), 'Service worker should support safe activation');
assert.ok(worker.includes("daigaku-shell-v2"), 'Service worker cache version must change when app-shell assets change');
assert.ok(app.includes('function localISODate(date)'), 'Planner dates must use local calendar dates, not UTC conversion');
assert.ok(app.includes('let calendarMonth=new Date(today.getFullYear(),today.getMonth(),1)'), 'Planner should open on the current month');
assert.ok(app.includes('let selectedCalendarDate=localISODate(new Date())'), 'Planner should select today on startup');

// Regression checks for navigation and semester state consistency.
assert.ok(html.includes('href="#semesters"') && app.includes("semesters:'Semesters'"), 'Semesters must be reachable from navigation');
assert.ok(!app.includes("if(location.hash==='#semesters')location.hash='#academics'"), 'The Semesters route must not be redirected to Academics');
assert.ok(app.includes("else state.profile.term=(state.semesters.find(term=>term.active)||state.semesters[0]).name"), 'Editing a semester must keep the displayed active term in sync');
assert.ok(app.includes("case 'set-active-semester'"), 'Users must be able to switch the active semester');
assert.ok(!app.includes('.nameaddActivity('), 'Saving a semester must not accidentally call activity logging on the term name');
assert.ok(app.includes("addActivity((existing?'Updated ':'Added ')+item.name)"), 'Creating or editing a semester must record activity');
assert.ok(html.includes('role="dialog" aria-modal="true"'), 'Dialogs must expose accessible dialog semantics');
assert.ok(app.includes("e.key==='Tab'&&!$('#modalBackdrop').hidden"), 'Keyboard focus must remain inside an open dialog');
assert.ok(html.includes('aria-controls="sidebar" aria-expanded="false"'), 'Mobile menu must expose its controlled navigation state');
assert.ok(app.includes("menu.setAttribute('aria-expanded','false')"), 'Closing the mobile navigation must reset its expanded state');
assert.ok(app.includes("$('#sidebar').addEventListener('click'") && app.includes("closeSidebar()"), 'Selecting a sidebar route must close the mobile navigation');
assert.ok(app.includes("'habits','trackers','events'"), 'Workspace import must safely restore custom trackers');
assert.ok(app.includes("if(!activeFound)state.semesters[0].active=true"), 'Imported semesters must retain a valid active term');
console.log('Daigaku smoke checks passed.');
