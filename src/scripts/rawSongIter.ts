// Takes relative directory path as commandline arg, and iterates
// through all lilypond files, sending them to parser.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseSong } from './parseSong';

async function iterateSongs(from_dir: string, to_file: string) {
  const entries = await readdir(from_dir, {withFileTypes: true, recursive: true});
  var successes = 0;

  const good_songs = [];
  const bad_song_paths = []
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".ly")) {
      const filePath = join(entry.parentPath, entry.name);
      const contents = await readFile(filePath, {encoding: 'utf8'});

      const song = parseSong(contents, filePath);

      if (song !== null) {
        good_songs.push(song);
      }
      else {
        bad_song_paths.push(filePath);
      }
    }
  }
  await writeFile(to_file,
    "INSERT INTO Songs (title, composer, style, file_path, tempo, key_tonic, key_move, time_numerator, time_denominator) VALUES\n");
  for (const good_song of good_songs) {
    await writeFile(to_file, "(" + 
      "\'" + good_song.title + "\', " +
      (good_song.composer ? "\'" + good_song.composer + "\'" : "NULL") + ", " +
      (good_song.style ? "\'" + good_song.style + "\'" : "NULL") + ", " +
      "\'" + good_song.file_path + "\', " +
      good_song.tempo + ", " +
      (good_song.key_tonic ? "\'" + good_song.key_tonic + "\'" : "NULL") + ", " +
      (good_song.key_mode ? "\'" + good_song.key_mode + "\'" : "NULL") + ", " +
      (good_song.time_numerator ? good_song.time_numerator : "NULL") + ", " +
      (good_song.time_denominator ? good_song.time_denominator : "NULL") + ", " +
      ")\n",
      { flag: 'a'}
    )
  }
  for (const bad_song_path of bad_song_paths) {
    await writeFile("../../data/raw_songs_ly/bad-songs.txt",
      bad_song_path + "\n",
      { flag: 'a'}
    )
  }
}

async function main() {
  const from_dir = process.argv[2];
  const to_file = process.argv[3];


  if (!from_dir) {
    throw new Error("Usage: npx tsx rawSongIter.ts <song_directory> <seed_file>")
  }
  if (!to_file) {
    throw new Error("Usage: npx tsx rawSongIter.ts <song_directory> <seed_file>")
  }

  await iterateSongs(from_dir, to_file);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});