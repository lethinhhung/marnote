import { appendFile, readFile } from 'node:fs/promises';

const version = process.argv[2]?.replace(/^v/, '');
if (!version) throw new Error('Pass the release tag, for example v0.1.0.');

const changelog = await readFile('CHANGELOG.md', 'utf8');
const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const heading = new RegExp(`^## \\[${escapedVersion}\\] - \\d{4}-\\d{2}-\\d{2}\\s*$`, 'm');
const match = heading.exec(changelog);
if (!match) throw new Error(`CHANGELOG.md has no dated section for ${version}.`);

const start = match.index;
const nextHeading = changelog.indexOf('\n## ', start + match[0].length);
const notes = changelog.slice(start, nextHeading < 0 ? undefined : nextHeading).trim();
if (!notes.slice(match[0].length).trim()) {
  throw new Error(`Add user-facing changes to the ${version} section in CHANGELOG.md.`);
}

const delimiter = `RELEASE_NOTES_${process.pid}`;
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `body<<${delimiter}\n${notes}\n${delimiter}\n`);
} else {
  console.log(notes);
}
