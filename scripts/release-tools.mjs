#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "manifest.json");
const packageRoots = [
  "manifest.json",
  "main.js",
  "content.js",
  "popup.html",
  "popup.js",
  "css",
  "html",
  "assets",
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readManifest() {
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    fail(`Unable to read manifest.json: ${error.message}`);
  }
}

function parseVersion(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    fail(`Version must contain three numeric components: ${version}`);
  }

  const components = version.split(".").map(Number);
  if (components.some((component) => component > 65535)) {
    fail(`Version components must not exceed 65535: ${version}`);
  }
  return components;
}

function nextVersion(version, bump) {
  const [major, minor, patch] = parseVersion(version);
  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      fail(`Unsupported bump type: ${bump}`);
  }
}

function manifestReferences(manifest) {
  const references = new Set();
  const add = (value) => {
    if (typeof value === "string") references.add(value.replace(/^\//, ""));
  };

  add(manifest.background?.service_worker);
  add(manifest.action?.default_popup);
  Object.values(manifest.icons ?? {}).forEach(add);
  Object.values(manifest.action?.default_icon ?? {}).forEach(add);
  for (const script of manifest.content_scripts ?? []) {
    (script.js ?? []).forEach(add);
    (script.css ?? []).forEach(add);
  }
  for (const resourceGroup of manifest.web_accessible_resources ?? []) {
    (resourceGroup.resources ?? []).forEach(add);
  }
  return [...references].sort();
}

function validate() {
  const manifest = readManifest();
  if (manifest.manifest_version !== 3) fail("Only Manifest V3 is supported");
  if (!manifest.name || !manifest.description) fail("Manifest name and description are required");
  parseVersion(manifest.version);

  const missing = manifestReferences(manifest).filter(
    (file) => !existsSync(resolve(root, file)),
  );
  if (missing.length) fail(`Manifest references missing files:\n${missing.join("\n")}`);

  console.log(manifest.version);
}

function trackedPackageFiles() {
  const result = spawnSync("git", ["ls-files", "-z", "--", ...packageRoots], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) fail(result.stderr.trim() || "Unable to list package files");

  const files = result.stdout.split("\0").filter(Boolean).sort();
  for (const required of packageRoots.slice(0, 5)) {
    if (!files.includes(required)) fail(`Required package file is not tracked: ${required}`);
  }
  return files;
}

function packageExtension(outputArgument) {
  if (!outputArgument) fail("Package output path is required");
  validate();

  const output = resolve(process.cwd(), outputArgument);
  if (existsSync(output)) fail(`Refusing to overwrite existing package: ${output}`);

  const files = trackedPackageFiles();
  const result = spawnSync("zip", ["-q", "-X", output, ...files], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) fail(result.stderr.trim() || "Unable to create ZIP package");

  console.log(output);
}

const [command, argument] = process.argv.slice(2);
const manifest = readManifest();

switch (command) {
  case "next":
    console.log(nextVersion(manifest.version, argument));
    break;
  case "bump": {
    const version = nextVersion(manifest.version, argument);
    manifest.version = version;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(version);
    break;
  }
  case "validate":
    validate();
    break;
  case "package":
    packageExtension(argument);
    break;
  default:
    fail("Usage: release-tools.mjs <next|bump|validate|package> [argument]");
}
