// Sent .ly file contents and path. Checks song matches criteria for our software
// (is a piano piece, has tempo, etc. See database schema).
// If matches, add to db, otherwise, add file path to list for removal

import { collectMeta } from "next/dist/build/utils";

export function parseSong(contents: string, filePath: string) {
  console.log("Parsing:", filePath);
  var title: string;
  var composer: string;
  var style: string;
  var tempo: string;
  var key_tonic: string;
  var key_mode: string;
  var time_numerator: string;
  var time_denominator: string;

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
        case "instrument":
        case "mutopiainstrument":
          if (value.replace(/['"]+/g, '') != "Piano") isValid = false;

      }
    }
    else if (trimmedLine.charAt(0) == "\\")
      var words = trimmedLine.split(" ");
      if (words){
        switch (words[0]) {
          case "\\include":
            console.log("NO INCLUDE")
            isValid = false;
            break;
        }
      }
  }
  /*
  if (title) console.log("Title:", title);
  else console.log("No Title.")
  if (composer) console.log("Composer:", composer);
  else console.log("No Composer.")
  if (style) console.log("Style:", style);
  else console.log("No style.");*/

}