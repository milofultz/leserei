import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import fs from "node:fs";

import { PRESET_OPTIONS } from "./lib/presets";
import { convertFileUsingCLI } from "./standalone";

const TEMP_FOLDER = "__tmp";
const FIXTURES_FOLDER = "__fixtures__";
const TEST_EPUB_BASENAME = "test";
const TEST_EPUB_FILENAME = `${TEST_EPUB_BASENAME}.epub`;
const EMPTY_EPUB_FILENAME = "empty.epub";

beforeEach(() => {
  if (!fs.existsSync(TEMP_FOLDER)) {
    fs.mkdirSync(TEMP_FOLDER);
  }
  fs.cpSync(FIXTURES_FOLDER, TEMP_FOLDER, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEMP_FOLDER, { recursive: true, force: true });
  mock.clearAllMocks();
  mock.restore();
});

describe("should exit early when", () => {
  test("input file doesn't exist", async () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    const nonexistentFile = `${TEMP_FOLDER}/test`;
    expect(fs.existsSync(nonexistentFile)).toBe(false);
    await convertFileUsingCLI(nonexistentFile);
    expect(spy.mock.calls[0]).toBeDefined();
    expect(spy.mock.calls[0]![0]).toMatch(/does not exist/);
  });

  test("input file does not end in `.epub`", async () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    const nonEpubFile = `${TEMP_FOLDER}/test`;
    fs.writeFileSync(nonEpubFile, "test");
    expect(fs.existsSync(nonEpubFile)).toBe(true);
    await convertFileUsingCLI(nonEpubFile);
    expect(spy.mock.calls[0]).toBeDefined();
    expect(spy.mock.calls[0]![0]).toMatch(/only epub files/i);
  });

  test("input file is not a valid `.epub` file", async () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    const invalidEpubFile = `${TEMP_FOLDER}/bad.epub`;
    fs.writeFileSync(invalidEpubFile, "contents");
    expect(fs.existsSync(invalidEpubFile)).toBe(true);
    await convertFileUsingCLI(invalidEpubFile);
    expect(spy.mock.calls[0]).toBeDefined();
    expect(spy.mock.calls[0]![0]).toMatch(/error when parsing/i);
  });

  test("input file has no text", async () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    const emptyEpubFile = `${TEMP_FOLDER}/${EMPTY_EPUB_FILENAME}`;
    expect(fs.existsSync(emptyEpubFile)).toBe(true);
    await convertFileUsingCLI(emptyEpubFile);
    expect(spy.mock.calls[0]).toBeDefined();
    expect(spy.mock.calls[0]![0]).toMatch(/error while processing text/i);
  });
});

test("should convert valid EPUB file", async () => {
  const validEpubFile = `${TEMP_FOLDER}/${TEST_EPUB_FILENAME}`;
  await convertFileUsingCLI(validEpubFile);
  expect(fs.existsSync(`${TEMP_FOLDER}/${TEST_EPUB_BASENAME}.md`)).toBe(true);
});

test("does not mutate shared preset options", async () => {
  const snapshot = { ...PRESET_OPTIONS.reading };
  const validEpubFile = `${TEMP_FOLDER}/${TEST_EPUB_FILENAME}`;
  await convertFileUsingCLI(validEpubFile, { normalize: false });
  expect(PRESET_OPTIONS.reading).toEqual(snapshot);
});

test("default front matter matches full preset", async () => {
  const validEpubFile = `${TEMP_FOLDER}/${TEST_EPUB_FILENAME}`;
  const implicit = await convertFileUsingCLI(validEpubFile);
  const explicit = await convertFileUsingCLI(validEpubFile, {
    removeFrontMatter: true,
  });
  expect(implicit).toEqual(explicit);
});

describe("should use option when provided", () => {
  test("output folder", async () => {
    const outputFolder = `${TEMP_FOLDER}/nested/wahoo`;
    const validEpubFile = `${TEMP_FOLDER}/${TEST_EPUB_FILENAME}`;
    await convertFileUsingCLI(validEpubFile, { outputFolder });
    expect(fs.existsSync(`${outputFolder}/${TEST_EPUB_BASENAME}.md`)).toBe(
      true,
    );
  });

  test("preset", async () => {
    const validEpubFile = `${TEMP_FOLDER}/${TEST_EPUB_FILENAME}`;
    const full = await convertFileUsingCLI(validEpubFile);
    expect(full).toBeDefined();
    const light = await convertFileUsingCLI(validEpubFile, { preset: "light" });
    expect(light).toBeDefined();
    expect(full).not.toEqual(light);
  });

  test("output format", async () => {
    const validEpubFile = `${TEMP_FOLDER}/${TEST_EPUB_FILENAME}`;
    const markdown = await convertFileUsingCLI(validEpubFile, {
      outputFormat: "markdown",
    });
    expect(markdown).toBeDefined();
    const plain = await convertFileUsingCLI(validEpubFile, {
      outputFormat: "plain",
    });
    expect(plain).toBeDefined();
    expect(markdown).not.toEqual(plain);
    // Test EPUB has headers, easiest difference to test
    const markdownHeadingRe = /^# [A-Za-z]/m;
    expect(markdown).toMatch(markdownHeadingRe);
    expect(plain).not.toMatch(markdownHeadingRe);
    expect(fs.existsSync(`${TEMP_FOLDER}/${TEST_EPUB_BASENAME}.md`)).toBe(true);
    expect(fs.existsSync(`${TEMP_FOLDER}/${TEST_EPUB_BASENAME}.txt`)).toBe(
      true,
    );
  });

  test("output extension", async () => {
    const validEpubFile = `${TEMP_FOLDER}/${TEST_EPUB_FILENAME}`;
    await convertFileUsingCLI(validEpubFile, {
      outputFormat: "markdown",
      outputExtension: "txt",
    });
    expect(fs.existsSync(`${TEMP_FOLDER}/${TEST_EPUB_BASENAME}.txt`)).toBe(
      true,
    );
    expect(fs.existsSync(`${TEMP_FOLDER}/${TEST_EPUB_BASENAME}.md`)).toBe(
      false,
    );
  });

  describe("formatting options", () => {
    const validEpubFile = `${TEMP_FOLDER}/${TEST_EPUB_FILENAME}`;
    const optionsToTest = {
      normalize: [false, true],
      fixEmphasisSpacing: [false, true],
      fixHyphenation: [false, true],
      unwrap: [false, true],
      stripInvisible: [false, true],
      standardizeSceneBreaks: [false, true],
      removeFrontMatter: [false, true],
      maxBlankLines: [0, 2],
    };

    Object.entries(optionsToTest).forEach(([key, value]) => {
      test(`option '${key}'`, async () => {
        const [off, on] = value;
        const optionOff = await convertFileUsingCLI(validEpubFile, {
          [key]: off,
        });
        expect(optionOff).toBeDefined();
        const optionOn = await convertFileUsingCLI(validEpubFile, {
          [key]: on,
        });
        expect(optionOn).toBeDefined();
        expect(optionOn).not.toEqual(optionOff);
      });
    });
  });
});
