import type { Doc } from "./lib/doc";
import type { SpineItem } from "./lib/epub";
import { extractDoc } from "./lib/extract";
import { filterSpine } from "./lib/frontMatter";
import { runPipeline } from "./lib/pipeline";
import { serializeDoc } from "./lib/serialize";
import type { Options, OutputFormat } from "./lib/types";

export const getDisplaySpine = (
  spine: SpineItem[] | null,
  removeFrontMatter: boolean,
) => {
  if (!spine) return null;
  return filterSpine(spine, removeFrontMatter);
};

export const getDoc = (displaySpine: SpineItem[] | null, filename: string) => {
  if (!displaySpine) return null;
  return extractDoc(displaySpine, filename);
};

export const getProcessedText = (
  doc: Doc | null,
  opts: Options,
  outputFormat: OutputFormat,
) => {
  if (!doc) return null;
  const result = runPipeline(doc, opts);
  return serializeDoc(result, outputFormat, opts);
};
