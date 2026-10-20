// Takes a txt list of bad song paths and a directory.
// Deletes matching songs, then removes empty subfolders.

import { readdir, readFile, unlink, rmdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

async function deleteFiles(list_file: string, from_dir: string) {
  const contents = await readFile(list_file, 'utf8');
  const bad_song_paths = new Set(
    contents.split('\n')
        .map(line => line.trim())
        .filter(line => line !== '')
        .map(filePath => resolve(filePath))
    );

  let deleted_files = 0;
  let deleted_folders = 0;

  async function cleanDirectory(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const filePath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await cleanDirectory(filePath);

        const remaining = await readdir(filePath);
        if (remaining.length === 0) {
          await rmdir(filePath);
          deleted_folders++;
        }
      }
      else if (
        entry.isFile() && (
        !entry.name.endsWith(".ly") || 
        bad_song_paths.has(filePath))
      ) {
        await unlink(filePath);
        deleted_files++;
      }
    }
  }

  await cleanDirectory(resolve(from_dir));

  console.log('Deleted files:', deleted_files);
  console.log('Deleted empty folders:', deleted_folders);
}

async function main() {
  const list_file = process.argv[2];
  const from_dir = process.argv[3];

  if (!list_file || !from_dir) {
    throw new Error("Usage: npx tsx deleteFiles.ts <bad_songs.txt> <song_directory>");
  }

  await deleteFiles(list_file, from_dir);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});