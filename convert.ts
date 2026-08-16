import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Command, InvalidArgumentError, Option } from "commander";

import { type CLIOptions, convertFileUsingCLI } from "@/standalone";

function parseBoolean(value: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new InvalidArgumentError(`Expected true or false: ${value}`);
}

function parseNumber(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new InvalidArgumentError(`Not a number: ${value}`);
  }
  return n;
}

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
      .default("full"),
  )
  .option(
    "-n, --normalize <boolean>",
    "fix punctuation & spacing (smart quotes, dashes, and whitespace)",
    parseBoolean,
  )
  .option(
    "-e, --fix-emphasis-spacing <boolean>",
    "tidy spacing inside bold and italic markers",
    parseBoolean,
  )
  .option(
    "-H, --fix-hyphenation <boolean>",
    "fix hyphenated line breaks by rejoining words split across lines",
    parseBoolean,
  )
  .option(
    "-u, --unwrap <boolean>",
    "merge soft-wrapped lines into paragraphs",
    parseBoolean,
  )
  .option(
    "-i, --strip-invisible <boolean>",
    "remove soft hyphens and zero-width formatting characters",
    parseBoolean,
  )
  .option(
    "-s, --standardize-scene-breaks <boolean>",
    "convert scene breaks and dividers like *** and --- to * * *",
    parseBoolean,
  )
  .option(
    "-r, --remove-front-matter <boolean>",
    "omit front matter, TOC, cover, copyright, and other non-body files",
    parseBoolean,
  )
  .option(
    "-b, --max-blank-lines <number>",
    "collapse longer runs of empty lines while cleaning",
    parseNumber,
  )
  .addOption(
    new Option("-F, --output-format <format>", "which output format to use")
      .choices(["plain", "markdown"])
      .default("markdown"),
  )
  .addOption(
    new Option(
      "-x, --output-extension <ext>",
      "output file extension, regardless of format (default: md for markdown, txt for plain)",
    ).choices(["md", "txt"]),
  )
  .argument("<files...>", "files to convert");

program.parse(process.argv);

const filenames = program.args;
if (!filenames.length) {
  console.error("Please provide filepaths as arguments.");
  process.exit(1);
}

if (!GlobalRegistrator.isRegistered) {
  GlobalRegistrator.register();
}

const options: CLIOptions = program.opts();

let failed = false;
for (const filename of filenames) {
  const result = await convertFileUsingCLI(filename, options);
  if (result === undefined) failed = true;
}
if (failed) process.exit(1);
