import { expect, test } from "bun:test";

import type { Doc } from "./doc";
import { collapseExcessNewlines, serializeDoc } from "./serialize";

const doc: Doc = {
  title: "T",
  chapters: [
    {
      title: "One",
      blocks: [
        { t: "heading", level: 1, inline: [{ t: "text", value: "One" }] },
        { t: "para", inline: [{ t: "text", value: "Para" }] },
      ],
    },
    {
      title: "Two",
      blocks: [
        { t: "heading", level: 1, inline: [{ t: "text", value: "Two" }] },
        { t: "para", inline: [{ t: "text", value: "More" }] },
      ],
    },
  ],
};

test("markdown joins chapters with extra blank lines", () => {
  expect(serializeDoc(doc, "markdown")).toBe(
    "# One\n\nPara\n\n\n# Two\n\nMore",
  );
});

test("plain uses paragraph breaks and chapter separator", () => {
  expect(serializeDoc(doc, "plain")).toBe(
    "One\n\nPara\n\n\n* * *\n\n\nTwo\n\nMore",
  );
});

test("collapseExcessNewlines caps visible blank lines", () => {
  expect(collapseExcessNewlines("a\n\n\n\nb", 1)).toBe("a\n\nb");
  expect(collapseExcessNewlines("a\n\n\n\nb", 2)).toBe("a\n\n\n\nb");
});

test("serializeDoc applies maxBlankLines", () => {
  expect(serializeDoc(doc, "plain", { maxBlankLines: 1 })).toBe(
    "One\n\nPara\n\n* * *\n\nTwo\n\nMore",
  );
});

test("markdown escapes line-start structural hazards in prose", () => {
  const hazardDoc: Doc = {
    title: "",
    chapters: [
      {
        title: "",
        blocks: [
          { t: "para", inline: [{ t: "text", value: "# not heading" }] },
          { t: "para", inline: [{ t: "text", value: "> not quote" }] },
          { t: "para", inline: [{ t: "text", value: "- not list" }] },
          { t: "para", inline: [{ t: "text", value: "+ not list" }] },
          { t: "para", inline: [{ t: "text", value: "1. not ordered" }] },
        ],
      },
    ],
  };

  expect(serializeDoc(hazardDoc, "markdown")).toBe(
    "\\# not heading\n\\> not quote\n\\- not list\n\\+ not list\n1\\. not ordered",
  );
});

test("markdown preserves asterisk divider paragraphs", () => {
  const dividerDoc: Doc = {
    title: "",
    chapters: [
      {
        title: "",
        blocks: [{ t: "para", inline: [{ t: "text", value: "* * * *" }] }],
      },
    ],
  };

  expect(serializeDoc(dividerDoc, "markdown")).toBe("* * * *");
});

test("markdown unescapes escaped asterisk divider paragraphs", () => {
  const dividerDoc: Doc = {
    title: "",
    chapters: [
      {
        title: "",
        blocks: [
          {
            t: "para",
            inline: [{ t: "text", value: String.raw`\* \* \* \*` }],
          },
        ],
      },
    ],
  };

  expect(serializeDoc(dividerDoc, "markdown")).toBe("* * * *");
});

test("markdown preserves asterisk ornaments in headings", () => {
  const doc: Doc = {
    title: "",
    chapters: [
      {
        title: "",
        blocks: [
          {
            t: "heading",
            level: 2,
            inline: [{ t: "text", value: "* * *" }],
          },
          {
            t: "heading",
            level: 2,
            inline: [{ t: "text", value: "JANE AUSTEN" }],
          },
          {
            t: "heading",
            level: 2,
            inline: [{ t: "text", value: "*" }],
          },
        ],
      },
    ],
  };

  expect(serializeDoc(doc, "markdown")).toBe("* * *\n\n## JANE AUSTEN\n\n*");
});

test("markdown unescapes escaped asterisk ornaments in headings", () => {
  const doc: Doc = {
    title: "",
    chapters: [
      {
        title: "",
        blocks: [
          {
            t: "heading",
            level: 2,
            inline: [{ t: "text", value: String.raw`\* \* \*` }],
          },
          {
            t: "heading",
            level: 2,
            inline: [{ t: "text", value: String.raw`\*` }],
          },
        ],
      },
    ],
  };

  expect(serializeDoc(doc, "markdown")).toBe("* * *\n\n*");
});

test("markdown blank-lines after emphasis that ends with sentence punct", () => {
  const text = (value: string) => ({ t: "text" as const, value });
  const emph = (value: string) => ({
    t: "emph" as const,
    children: [text(value)],
  });
  const strong = (value: string) => ({
    t: "strong" as const,
    children: [text(value)],
  });

  const endingFmtDoc: Doc = {
    title: "",
    chapters: [
      {
        title: "",
        blocks: [
          { t: "para", inline: [emph("She whispered.")] },
          { t: "para", inline: [text("he did not answer.")] },
          { t: "para", inline: [text("End is "), emph("italic.")] },
          { t: "para", inline: [text("continues lowercase.")] },
          { t: "para", inline: [strong("Done.")] },
          { t: "para", inline: [text("next starts lower.")] },
          // still soft-wrap when no sentence punct
          { t: "para", inline: [emph("Fully enclosed")] },
          { t: "para", inline: [text("jumps soft.")] },
        ],
      },
    ],
  };

  expect(serializeDoc(endingFmtDoc, "markdown")).toBe(
    [
      "*She whispered.*",
      "",
      "he did not answer.",
      "",
      "End is *italic.*",
      "",
      "continues lowercase.",
      "",
      "**Done.**",
      "",
      "next starts lower.",
      "",
      "*Fully enclosed*",
      "jumps soft.",
    ].join("\n"),
  );
});
