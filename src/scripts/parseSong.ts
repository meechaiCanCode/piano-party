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
  let composer = "";
  let style = "";
  let tempo = "";
  let key_tonic = "";
  let key_mode = "";
  let time_numerator = "";
  let time_denominator = "";

  var isValid = true;

  for (const line of contents.split("\n")) {
    if (!isValid) break;
    const trimmedLine = line.trim()

    if (trimmedLine.indexOf("\\tempo ") != -1) {
      const temp = trimmedLine.split(/\s*=\s*/);
      if (temp.length == 1) {
        //console.log(trimmedLine);
      }
      else {
        tempo = trimmedLine.split(/\s*=\s*/)[1].split(" ")[0];
        //console.log(tempo, filePath);
      }
    }

    if (trimmedLine.indexOf("\\time ") != -1 && (!time_numerator && !time_denominator)) {
      const time_index = trimmedLine.indexOf("\\time ");
      const afterTime = trimmedLine.slice(time_index + 6);
      const [num, denom] = afterTime.split("/")
      time_numerator = num;
      if (denom.split(" ").length > 1) {
        // Kinda cheating bc no such examples have a numerator >= 10 when the denum has extra stuff
        time_denominator = denom.split(" ")[0];
      }
      else time_denominator = denom;
    }

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
          isValid = false;
          break;
        case "\\key":
          // First come first serve or whatever
          if (key_tonic || key_mode)
            continue;
          if (words[1].indexOf("major") != -1) {
            key_mode = "major"
            key_tonic = words[1].substring(0, words[1].indexOf("major") - 1);
          }
          else if (words[1].indexOf("minor") != -1) {
            key_mode = "minor"
            key_tonic = words[1].substring(0, words[1].indexOf("minor") - 1);
          }
          if (words.length > 2) {
            if (words[2].indexOf("major") != -1) {
              key_mode = "major"
              key_tonic = words[1];
            }
            if (words[2].indexOf("minor") != -1) {
              key_mode = "minor"
              key_tonic = words[1];
            }
          }
          //console.log(words, filePath)
          break;
      }
    }
  }

  if (!isValid || !title || !tempo || !Number(tempo)) {
    return null;
  }
  if (!Number(time_denominator)) {
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