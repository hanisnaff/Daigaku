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
console.log('Daigaku smoke checks passed.');
