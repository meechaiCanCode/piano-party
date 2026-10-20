// Sent .ly file contents and path. Checks song matches criteria for our software
// (is a piano piece, has tempo, etc. See database schema).
// Returns parsed song struct to iter for database adding.

export interface Song {
  title: string;
  composer: string;
  style: string;
  file_path: string;
  tempo: number;
  key_tonic: string;
  key_mode: string;
  time_numerator: number;
  time_denominator: number;
}

export function parseSong(contents: string, filePath: string): Song | null {
  // console.log("Parsing:", filePath);
  let title = "";
  let composer = null;
  let style = "";
  let tempo = "1";
  let key_tonic = "";
  let key_mode = "";
  let time_numerator = "";
  let time_denominator = "";

  var isValid = true;

  for (const line of contents.split("\n")) {
    if (!isValid) break;
    const trimmedLine = line.trim()
    const match = trimmedLine.split(/\s*=\s*/)

    if (match.length == 2) {
      const [name, value] = match;
      //console.log(name);
      switch (name) {
        case "title":
        case "mutopiatitle":
          title = value.replace(/['"]+/g, '');
          break;
        case "composer":
        case "mutopiacomposer":
          composer = value.replace(/['"]+/g, '');
          break;
        case "style":
          style = value.replace(/['"]+/g, '');
          break;
        case "instrument":
        case "mutopiainstrument":
          if (value.replace(/['"]+/g, '') != "Piano") isValid = false;
          break;

      }
    }
    else if (trimmedLine.charAt(0) == "\\") {
      var words = trimmedLine.split(" ");
      switch (words[0]) {
        case "\\include":
          //console.log("NO INCLUDE:", filePath);
          isValid = false;
          break;
        case "\\key":
          if (key_tonic || key_mode)
            continue;
          if (words.length >= 2) {
            //if 
          }
          else if (words[1].indexOf("major") != -1) {
            //console.log(words, filePath);
          }
          break;
      }
    }
  }

  if (!isValid || !title || !tempo) {
    return null;
  }

const song: Song = {
  title,
  composer,
  style,
  file_path: filePath,
  tempo: Number(tempo),
  key_tonic,
  key_mode,
  time_numerator: Number(time_numerator),
  time_denominator: Number(time_denominator),
};

return song;
}