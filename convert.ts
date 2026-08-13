import { Command, Option } from "commander";

import { type CLIOptions, convertFileUsingCLI } from "@/standalone";

const program = new Command();

program
  .option(
    "-o, --output-folder <string>",
    "output folder path (default: same folder as source file)",
  )
  .addOption(
    new Option(
      "-p, --preset <preset>",
      "cleanup preset to use (note that formatting options will take precedence)",
    )
      .choices(["light", "reading", "full"])
      .default("reading"),
  )
  .option(
    "-n --normalize <boolean>",
    "fix punctuation & spacing (smart quotes, dashes, and whitespace)",
  )
  .option(
    "-e --fix-emphasis-spacing <boolean>",
    "tidy spacing inside bold and italic markers",
  )
  .option(
    "-H --fix-hyphenation <boolean>",
    "fix hyphenated line breaks by rejoining words split across lines",
  )
  .option("-u --unwrap <boolean>", "merge soft-wrapped lines into paragraphs")
  .option(
    "-i --strip-invisible <boolean>",
    "remove soft hyphens and zero-width formatting characters",
  )
  .option(
    "-s --standardize-scene-breaks <boolean>",
    "convert scene breaks and dividers like *** and --- to * * *",
  )
  .option(
    "-r --remove-front-matter <boolean>",
    "omit front matter, TOC, cover, copyright, and other non-body files",
  )
  .option(
    "-b --max-blank-lines <number>",
    "collapse longer runs of empty lines while cleaning",
  )
  .addOption(
    new Option("-F --output-format <format>", "which output format to use")
      .choices(["plain", "markdown"])
      .default("markdown"),
  )
  .argument("<files...>", "files to convert");
program.parse(process.argv);

const filenames = program.args;
if (!filenames.length) {
  console.error("Please provide filepaths as arguments.");
  process.exit(1);
}
const options: CLIOptions = program.opts();

// Convert each file
filenames.forEach((filename) => {
  convertFileUsingCLI(filename, options);
});
