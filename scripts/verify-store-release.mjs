#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const [tag, path, metadataPath] = process.argv.slice(2);
if (!/^v\d+\.\d+\.\d+$/.test(tag || '')) throw new Error('Expected a version tag such as v1.1.9');
const release = JSON.parse(readFileSync(metadataPath, 'utf8'));
if (release.tagName !== tag || release.isDraft || release.isPrerelease) throw new Error('Expected a published stable GitHub release');
execFileSync('git', ['merge-base', '--is-ancestor', `refs/tags/${tag}`, 'refs/remotes/origin/main']);
const taggedManifest = JSON.parse(execFileSync('git', ['show', `refs/tags/${tag}:manifest.json`], { encoding: 'utf8' }));
const names = execFileSync('unzip', ['-Z1', path], { encoding: 'utf8' }).trim().split('\n');
if (names.filter(name => name === 'manifest.json').length !== 1) throw new Error('Expected one root manifest');
execFileSync('unzip', ['-t', path], { stdio: 'ignore' });
const packagedManifest = JSON.parse(execFileSync('unzip', ['-p', path, 'manifest.json'], { encoding: 'utf8' }));
if (JSON.stringify(taggedManifest) !== JSON.stringify(packagedManifest) || packagedManifest.version !== tag.slice(1)) {
  throw new Error('ZIP manifest does not match the tagged release');
}
const asset = release.assets.find(asset => asset.name === `better-classroom-${tag}.zip`);
const digest = `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
if (!asset || asset.digest !== digest) throw new Error('ZIP digest does not match the GitHub release asset');
console.log(`Verified ${tag}: release ZIP digest, manifest and main-branch ancestry match.`);
