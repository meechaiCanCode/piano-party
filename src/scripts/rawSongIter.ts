// Takes relative directory path as commandline arg, and iterates
// through all lilypond files, sending them to parser.

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseSong } from './parseSong';

async function iterateSongs(dir: string) {
  const entries = await readdir(dir, {withFileTypes: true, recursive: true});
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".ly")) {
      const filePath = join(entry.parentPath, entry.name);
      const contents = await readFile(filePath, {encoding: 'utf8'});

      await parseSong(contents, filePath);
    }
  }
}

async function main() {
  const dir = process.argv[2];

  if (!dir) {
    throw new Error("Usage: npx tsx rawSongIter.ts <directory>")
  }

  await iterateSongs(dir);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});