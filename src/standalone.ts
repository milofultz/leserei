import fs from "node:fs";
import path from "node:path";

import { loadEpub, type SpineItem } from "./lib/epub";
import { PRESET_OPTIONS, type PresetOption } from "./lib/presets";
import type { Options, OutputFormat } from "./lib/types";
import { getDisplaySpine, getDoc, getProcessedText } from "./shared";

export type CLIOptions = {
  outputFolder?: string;
  preset?: PresetOption;
  outputFormat?: OutputFormat;
  outputExtension?: "md" | "txt";
  normalize?: boolean;
  fixEmphasisSpacing?: boolean;
  fixHyphenation?: boolean;
  unwrap?: boolean;
  stripInvisible?: boolean;
  standardizeSceneBreaks?: boolean;
  removeFrontMatter?: boolean;
  maxBlankLines?: number;
};

const definedProps = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).filter(([_k, v]) => v !== undefined));

export const convertFileUsingCLI = async (
  filename: string,
  options: CLIOptions = {},
): Promise<string | undefined> => {
  const {
    outputFolder: providedOutputFolder,
    preset = "full",
    outputFormat = "markdown",
    outputExtension,
  } = options;

  const presetOverrides: Partial<Options> = {
    normalize: options.normalize,
    italicCleanup: options.fixEmphasisSpacing,
    dehyphenate: options.fixHyphenation,
    unwrap: options.unwrap,
    stripInvisible: options.stripInvisible,
    standardizeSceneBreaks: options.standardizeSceneBreaks,
    removeFrontMatter: options.removeFrontMatter,
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

  let file: File;
  try {
    const data = await Bun.file(filename).arrayBuffer();
    file = new File([data], filename);
  } catch (e) {
    console.error(`\nFile '${filename}' had an error on load.\n\n${e}\n`);
    return;
  }

  let epub: SpineItem[];
  try {
    epub = await loadEpub(file);
  } catch (e) {
    console.error(`\nError when parsing '${filename}' as EPUB file.\n\n${e}\n`);
    return;
  }

  const processorOptions: Options = {
    ...PRESET_OPTIONS[preset],
    ...definedProps(presetOverrides),
  };
  const displaySpine = getDisplaySpine(
    epub,
    processorOptions.removeFrontMatter,
  );
  const doc = getDoc(displaySpine, filename);
  const processedText = getProcessedText(doc, processorOptions, outputFormat);
  if (!processedText) {
    console.error(`\nError while processing text in '${filename}'.\n`);
    return;
  }

  const outputFolder = providedOutputFolder || path.dirname(filename);
  fs.mkdirSync(outputFolder, { recursive: true });
  const filenameBase = path.basename(filename, path.extname(filename));
  const ext = outputExtension ?? (outputFormat === "plain" ? "txt" : "md");
  const outputFilename = `${filenameBase}.${ext}`;
  const outputFilepath = path.join(outputFolder, outputFilename);

  try {
    await Bun.write(outputFilepath, processedText);
  } catch (err) {
    console.error(
      `\nAn error occurred when writing '${outputFilename}' from '${filename}' to '${outputFilepath}'.\n\n${err}\n`,
    );
    return;
  }
  return processedText;
};
