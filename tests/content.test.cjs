const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = resolve(__dirname, '..');
const source = readFileSync(resolve(root, 'content.js'), 'utf8');
const card = (id, title = 'Science') => `<li data-course-id="${id}"><h2><a href="/c/${id}">${title === null ? '' : `<div>${title}</div><div>Section</div>`}</a></h2><div class="SZ0kZe"></div></li>`;
const nav = '<header id="kO001e"><div class="Mtd4hb"><button id="join">+</button></div></header>';
const pause = () => new Promise(r => setTimeout(r, 80));
async function waitFor(check) {
  for (let i = 0; i < 30; i++) {
    if (check()) return;
    await pause();
  }
  assert.ok(check(), 'expected DOM update');
}
function start(t, { html = nav + `<ol>${card('1')}${card('2', 'Math')}</ol>`, path = '/h', stored = {}, delay = {} } = {}) {
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error));
  console.on('error', (...args) => errors.push(args));
  const dom = new JSDOM(html, { url: `https://classroom.google.com${path}`, runScripts: 'outside-only', virtualConsole: console });
  const w = dom.window;
  const defaults = { getFolderData: { folderData: { folders: { Nursing: 'Nursing' }, folderActiveClasses: { Nursing: ['1'] } } }, getClassData: { classData: {} }, getLastSelectedFolder: { lastSelectedFolder: '__All Classes__' } };
  const writes = [];
  w.chrome = { runtime: { getURL: path => path, sendMessage: (message, callback) => {
    if (message.action.startsWith('get')) {
      setTimeout(() => callback(stored[message.action] ?? defaults[message.action]), delay[message.action] || 0);
    } else {
      writes.push(message);
      callback?.({ status: 'success' });
    }
  } } };
  w.fetch = async path => ({ text: async () => readFileSync(resolve(root, path), 'utf8') });
  t.after(() => { w.close(); assert.deepEqual(errors, []); });
  return { w, document: w.document, writes, run: () => w.eval(source) };
}
const title = (d, id) => d.querySelector(`[data-course-id="${id}"] h2 a > div`);
function choose(w, value) {
  const select = w.document.getElementById('folder-dropdown');
  select.value = value;
  select.dispatchEvent(new w.Event('change'));
}

test('mounting preserves Google control identity and its existing listener', async t => {
  const app = start(t);
  const button = app.document.getElementById('join');
  let clicked = false;
  button.addEventListener('click', () => { clicked = true; });
  app.run();
  await waitFor(() => app.document.getElementById('folder-dropdown'));
  assert.equal(app.document.getElementById('join'), button);
  button.click();
  assert.ok(clicked);
  assert.equal(app.document.querySelectorAll('.bc-class-setting-button').length, 2);
});

test('waits for persisted folders, selection and aliases regardless of response order', async t => {
  const { w, document: d, run } = start(t, { delay: { getFolderData: 150, getClassData: 20 }, stored: { getLastSelectedFolder: { lastSelectedFolder: 'Nursing' }, getClassData: { classData: { '1': 'Clinical' } } } });
  run();
  await waitFor(() => d.getElementById('folder-dropdown'));
  assert.equal(d.getElementById('folder-dropdown').value, 'Nursing');
  assert.equal(d.querySelector('[data-course-id="2"]').style.display, 'none');
  assert.equal(title(d, '1').textContent, 'Clinical');
  choose(w, '__All Classes__');
  assert.equal(d.querySelector('[data-course-id="2"]').style.display, '');
  assert.equal(title(d, '1').textContent, 'Clinical');
});

test('handles navigation and cards arriving after initialization, partial rendering and rerenders', async t => {
  const { document: d, run } = start(t, { html: '<main></main>' });
  run();
  await pause();
  d.body.insertAdjacentHTML('afterbegin', nav + `<ol>${card('1', null)}</ol>`);
  await waitFor(() => d.getElementById('folder-dropdown'));
  assert.equal(d.querySelectorAll('.bc-class-setting-button').length, 0);
  d.querySelector('h2 a').innerHTML = '<div>Late class</div>';
  await waitFor(() => d.querySelector('.bc-class-setting-button'));
  assert.equal(title(d, '1').textContent, 'Late class');
  d.querySelector('ol').innerHTML = card('2', 'Newly joined');
  await waitFor(() => d.querySelector('[data-course-id="2"] .bc-class-setting-button'));
  assert.equal(title(d, '2').textContent, 'Newly joined');
  d.querySelector('#kO001e').outerHTML = nav;
  await waitFor(() => d.querySelector('#kO001e #folder-dropdown'));
  assert.equal(d.querySelectorAll('#folder-dropdown').length, 1);
});

test('keeps original names through alias edits, folder changes and DOM replacement', async t => {
  const { w, document: d, run } = start(t, { stored: { getClassData: { classData: { '1': ' Clinical ' } } } });
  run();
  await waitFor(() => d.querySelector('.bc-class-setting-button'));
  choose(w, 'Nursing');
  d.querySelector('[data-course-id="1"] .bc-class-setting-button').click();
  assert.equal(d.getElementById('class-setting-modal-original-class-name').value, 'Science');
  d.getElementById('class-setting-modal-new-class-name').value = '';
  d.getElementById('class-setting-modal-modal-submit').click();
  assert.equal(title(d, '1').textContent, 'Science');
  d.querySelector('ol').innerHTML = card('1', 'Updated by teacher');
  await waitFor(() => d.querySelector('.bc-class-setting-button'));
  d.querySelector('.bc-class-setting-button').click();
  assert.equal(d.getElementById('class-setting-modal-original-class-name').value, 'Updated by teacher');
});

test('works when loaded on a course before navigating home; remains stable without self-triggered refreshes', async t => {
  const { w, document: d, run } = start(t, { path: '/c/abc', html: nav + '<main></main>' });
  run();
  await waitFor(() => d.getElementById('folder-dropdown'));
  assert.equal(d.getElementById('folder-dropdown-div').hidden, true);
  w.history.pushState({}, '', '/u/0/h/tv');
  d.querySelector('main').innerHTML = `<ol>${card('1')}</ol>`;
  await waitFor(() => d.querySelector('.bc-class-setting-button'));
  assert.equal(d.getElementById('folder-dropdown-div').hidden, false);
  const refresh = w.refreshExtension;
  let count = 0;
  w.refreshExtension = () => { count++; refresh(); };
  await pause();
  await pause();
  assert.equal(count, 0);
});

test('stale selected folder falls back to all classes without rewriting storage', async t => {
  const { document: d, writes, run } = start(t, { stored: { getLastSelectedFolder: { lastSelectedFolder: 'Deleted' } } });
  run();
  await waitFor(() => d.getElementById('folder-dropdown'));
  assert.equal(d.getElementById('folder-dropdown').value, '__All Classes__');
  assert.equal(d.querySelector('[data-course-id="2"]').style.display, '');
  assert.deepEqual(writes, []);
});

test('folder creation and editing keep selections independent and render names as text', async t => {
  const { w, document: d, writes, run } = start(t);
  run();
  await waitFor(() => d.getElementById('folder-dropdown'));
  choose(w, '__Add Folder__');
  d.getElementById('folder-creation-modal-folder-name').value = '<img src=x>';
  const list = d.getElementById('folder-creation-modal-class-select');
  list.value = '2';
  list.dispatchEvent(new w.Event('click'));
  d.getElementById('folder-creation-modal-modal-submit').click();
  assert.equal(d.querySelector('#folder-dropdown img'), null);
  assert.equal(d.querySelector('[data-course-id="1"]').style.display, 'none');
  assert.equal(d.querySelector('[data-course-id="2"]').style.display, '');
  assert.ok(writes.some(m => m.action === 'saveFolderData'));
  d.getElementById('folder-edit-button').click();
  const edit = d.getElementById('folder-setting-modal-class-select');
  edit.value = '1';
  edit.dispatchEvent(new w.Event('click'));
  d.getElementById('folder-setting-modal-modal-close').click();
  assert.deepEqual(Array.from(w.folderActiveClasses['<img src=x>']), ['2']);
});

test('an open folder dialog updates when classes finish loading', async t => {
  const { w, document: d, run } = start(t, { html: nav + '<ol></ol>' });
  run();
  await waitFor(() => d.getElementById('folder-dropdown'));
  choose(w, '__Add Folder__');
  assert.match(d.getElementById('folder-creation-modal-class-select').textContent, /No Classes Found/);
  d.querySelector('ol').innerHTML = card('1', 'Late class');
  await waitFor(() => d.querySelector('#folder-creation-modal-class-select option[value="1"]'));
  assert.equal(d.querySelector('#folder-creation-modal-class-select option[value="1"]').textContent, 'Late class');
});
