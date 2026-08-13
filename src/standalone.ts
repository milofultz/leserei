import fs from "node:fs";
import path from "node:path";
import jsdom from "jsdom";

import { loadEpub, type SpineItem } from "./lib/epub";
import { PRESET_OPTIONS, type PresetOption } from "./lib/presets";
import type { Options, OutputFormat } from "./lib/types";
import { getDisplaySpine, getDoc, getProcessedText } from "./shared";

export type CLIOptions = {
  outputFolder?: string;
  preset?: PresetOption;
  outputFormat?: OutputFormat;
  normalize?: boolean;
  fixEmphasisSpacing?: boolean;
  fixHyphenation?: boolean;
  unwrap?: boolean;
  stripInvisible?: boolean;
  standardizeSceneBreaks?: boolean;
  removeFrontMatter?: boolean;
  maxBlankLines?: number;
};

type CLIPresetOverrides = Omit<
  {
    [Property in keyof Options]+?: Options[Property];
  },
  "removeFrontMatter"
>;

const definedProps = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).filter(([_k, v]) => v !== undefined));

export const convertFileUsingCLI = async (
  filename: string,
  options: CLIOptions = {},
): Promise<string | undefined> => {
  const {
    outputFolder: providedOutputFolder,
    preset = "reading",
    outputFormat = "markdown",
    removeFrontMatter = true,
  } = options;

  // Convert to proper option type
  const presetOverrides: CLIPresetOverrides = {
    normalize: options.normalize,
    italicCleanup: options.fixEmphasisSpacing,
    dehyphenate: options.fixHyphenation,
    unwrap: options.unwrap,
    stripInvisible: options.stripInvisible,
    standardizeSceneBreaks: options.standardizeSceneBreaks,
    maxBlankLines: options.maxBlankLines,
  };

  // verify file exists
  if (!fs.existsSync(filename)) {
    console.error(`\nFile '${filename}' does not exist.\n`);
    return;
  }
  // verify it's an EPUB file extension
  if (!filename.endsWith(".epub")) {
    console.error(
      `\nFile '${filename}' does not end with '.epub'. Only EPUB files can be converted.\n`,
    );
    return;
  }

  // load file buffer
  let data: Buffer;
  try {
    data = fs.readFileSync(filename);
  } catch (e) {
    console.error(`\nFile '${filename}' had an error on load.\n\n${e}\n`);
    return;
  }

  // get blob
  const blob = new Blob([data as BlobPart], {
    type: "application/octet-stream",
  });
  if (!blob) {
    console.error(
      `\nBlob from '${filename}' had an error on load. The blob is logged below.\n\n${blob}\n`,
    );
    return;
  }

  // Convert to text and process contents
  const file = new File([blob], filename, { type: "application/octet-stream" });
  let epub: SpineItem[];
  try {
    // These are required to make the epub parser work
    const dom = new jsdom.JSDOM();
    global.DOMParser = dom.window.DOMParser;
    global.Node = dom.window.Node;

    epub = await loadEpub(file);
  } catch (e) {
    console.error(`\nError when parsing '${filename}' as EPUB file.\n\n${e}\n`);
    return;
  }

  const displaySpine = getDisplaySpine(epub, removeFrontMatter);
  const doc = getDoc(displaySpine, filename);
  const processorOptions: Options = Object.assign(
    PRESET_OPTIONS[preset],
    definedProps(presetOverrides),
  );
  const processedText = getProcessedText(doc, processorOptions, outputFormat);
  if (!processedText) {
    console.error(`\nError while processing text in '${filename}'.\n`);
    return;
  }

  // create text filename via extension replacement
  const outputFolder = providedOutputFolder || path.dirname(filename);
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
  }
  const filenameBase = path.basename(filename, path.extname(filename));
  const textFilename = `${filenameBase}.txt`;
  const textFilepath = path.join(outputFolder, textFilename);

  // create text file from blob using filename
  // note: will overwrite existing file
  const writeStream = fs.createWriteStream(textFilepath);
  writeStream.on("error", (err) => {
    console.error(
      `\nAn error occurred when writing 'txt' file from '${filename}' to '${textFilepath}'.\n\n${err}\n`,
    );
  });
  writeStream.write(processedText);
  writeStream.end();
  return processedText;
};
