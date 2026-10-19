// Sent .ly file contents and path. Checks song matches criteria for our software
// (is a piano piece, has tempo, etc. See database schema).
// If matches, add to db, otherwise, add file path to list for removal

export function parseSong(contents: string, filePath: string) {
  console.log("Parsing:", filePath);
}