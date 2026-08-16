import type { Options } from "./types";

export type PresetOption = "light" | "reading" | "full";

export interface Preset {
  id: string;
  label: string;
  description: string;
  options: Options;
}

export const PRESET_OPTIONS: Record<PresetOption, Options> = {
  light: {
    normalize: true,
    italicCleanup: false,
    dehyphenate: false,
    unwrap: false,
    stripInvisible: true,
    standardizeSceneBreaks: false,
    removeFrontMatter: false,
    maxBlankLines: 2,
  },
  reading: {
    normalize: true,
    italicCleanup: true,
    dehyphenate: true,
    unwrap: true,
    stripInvisible: true,
    standardizeSceneBreaks: true,
    removeFrontMatter: false,
    maxBlankLines: 2,
  },
  full: {
    normalize: true,
    italicCleanup: true,
    dehyphenate: true,
    unwrap: true,
    stripInvisible: true,
    standardizeSceneBreaks: true,
    removeFrontMatter: true,
    maxBlankLines: 2,
  },
};

export const PRESETS: Preset[] = [
  {
    id: "default",
    label: "Light cleanup",
    description: "Punctuation and spacing only",
    options: PRESET_OPTIONS.light,
  },
  {
    id: "reading",
    label: "Reading format",
    description: "Also unwraps paragraphs, fixes hyphenation, and scene breaks",
    options: PRESET_OPTIONS.reading,
  },
  {
    id: "processed",
    label: "Full cleanup",
    description: "All cleanup options enabled",
    options: PRESET_OPTIONS.full,
  },
  {
    id: "custom",
    label: "Custom",
    description: "Choose individual cleanup options",
    options: PRESET_OPTIONS.light,
  },
];
