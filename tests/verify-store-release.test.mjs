import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const script = resolve('scripts/verify-store-release.mjs');
function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'bc-release-test-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = args => execFileSync('git', args, { cwd, stdio: 'ignore' });
  git(['init', '-b', 'main']);
  writeFileSync(join(cwd, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'Fixture', version: '1.1.9' }));
  git(['add', 'manifest.json']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Fixture']);
  git(['tag', 'v1.1.9']);
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  execFileSync('zip', ['-q', 'better-classroom-v1.1.9.zip', 'manifest.json'], { cwd });
  const metadata = { tagName: 'v1.1.9', isDraft: false, isPrerelease: false, assets: [{
    name: 'better-classroom-v1.1.9.zip', digest: `sha256:${createHash('sha256').update(readFileSync(join(cwd, 'better-classroom-v1.1.9.zip'))).digest('hex')}`,
  }] };
  function run(tag = 'v1.1.9') {
    writeFileSync(join(cwd, 'release.json'), JSON.stringify(metadata));
    return spawnSync(process.execPath, [script, tag, 'better-classroom-v1.1.9.zip', 'release.json'], { cwd, encoding: 'utf8' });
  }
  return { cwd, metadata, run, git };
}

test('accepts a release only when its digest, manifest and main ancestry match', t => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Verified v1.1.9/);
});

test('rejects tampered release packages', t => {
  const f = fixture(t);
  f.metadata.assets[0].digest = 'sha256:incorrect';
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /digest/);
});

test('rejects draft or prerelease GitHub releases', t => {
  const f = fixture(t);
  f.metadata.isDraft = true;
  assert.notEqual(f.run().status, 0);
  f.metadata.isDraft = false;
  f.metadata.isPrerelease = true;
  assert.notEqual(f.run().status, 0);
});

test('rejects a ZIP whose manifest differs from its tag', t => {
  const f = fixture(t);
  writeFileSync(join(f.cwd, 'manifest.json'), JSON.stringify({ version: '9.0.0' }));
  rmSync(join(f.cwd, 'better-classroom-v1.1.9.zip'));
  execFileSync('zip', ['-q', 'better-classroom-v1.1.9.zip', 'manifest.json'], { cwd: f.cwd });
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /manifest does not match/);
});

test('rejects malformed tag inputs before executing git', t => {
  const f = fixture(t);
  assert.match(f.run('--help').stderr, /Expected a version tag/);
});

test('rejects a tagged release not contained in main', t => {
  const f = fixture(t);
  f.git(['checkout', '--orphan', 'unrelated']);
  f.git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Unrelated']);
  f.git(['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  assert.notEqual(f.run().status, 0);
});
