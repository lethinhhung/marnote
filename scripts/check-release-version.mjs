import { readFile } from 'node:fs/promises';

const tag = process.argv[2];
const version = tag?.replace(/^v/, '');
if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('Expected a release tag in the form vX.Y.Z or vX.Y.Z-prerelease.');
}

const desktop = JSON.parse(await readFile('apps/desktop/package.json', 'utf8')).version;
const tauri = JSON.parse(await readFile('apps/desktop/src-tauri/tauri.conf.json', 'utf8')).version;
const cargo = await readFile('apps/desktop/src-tauri/Cargo.toml', 'utf8');
const packageSection = cargo.match(/^\[package\]([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1];
const rust = packageSection?.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const lock = await readFile('apps/desktop/src-tauri/Cargo.lock', 'utf8');
const lockedRust = lock.match(/^\[\[package\]\]\nname = "marnote"\nversion = "([^"]+)"/m)?.[1];
const changelog = await readFile('CHANGELOG.md', 'utf8');

for (const [file, actual] of [
  ['apps/desktop/package.json', desktop],
  ['apps/desktop/src-tauri/tauri.conf.json', tauri],
  ['apps/desktop/src-tauri/Cargo.toml', rust],
  ['apps/desktop/src-tauri/Cargo.lock', lockedRust],
]) {
  if (actual !== version) throw new Error(`${file} has ${actual ?? 'no version'}; tag is ${version}.`);
}
const escapedVersion = version.replaceAll('.', '\\.');
if (!new RegExp(`^## \\[${escapedVersion}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm').test(changelog)) {
  throw new Error(`CHANGELOG.md needs a dated section for ${version}.`);
}

console.log(`Release tag ${tag} matches all app versions.`);
