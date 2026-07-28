import { expect, test } from "bun:test";

import type { SpineItem } from "./epub";
import { extractDoc } from "./extract";
import { parseHtmlDocument } from "./html";
import { runPipeline } from "./pipeline";
import { PRESETS } from "./presets";
import { serializeDoc } from "./serialize";
import type { Options, OutputFormat } from "./types";

function spine(html: string, overrides: Partial<SpineItem> = {}): SpineItem[] {
  return [
    {
      href: "ch1.xhtml",
      content: html,
      parsed: parseHtmlDocument(html),
      linear: true,
      properties: [],
      ...overrides,
    },
  ];
}

function render(
  html: string,
  format: OutputFormat = "markdown",
  opts?: Options,
): string {
  const doc = extractDoc(spine(html), "Test");
  const processed = opts ? runPipeline(doc, opts) : doc;
  return serializeDoc(processed, format, opts);
}

test("markdown: headings, emphasis, scene break", () => {
  expect(
    render(`<html><body>
      <h1>Chapter One</h1>
      <p>She said <em>hello</em> and <strong>goodbye</strong>.</p>
      <hr/>
      <p>Next scene.</p>
    </body></html>`),
  ).toBe(
    "# Chapter One\n\nShe said *hello* and **goodbye**.\n\n* * *\n\nNext scene.",
  );
});

test("markdown: unordered list", () => {
  expect(
    render(`<html><body><ul><li>One</li><li>Two</li></ul></body></html>`),
  ).toBe("+ One\n+ Two");
});

test("markdown: list with li>p and wrapper div", () => {
  expect(
    render(`<html><body>
      <div class="liste_ungeordnet"><ul class="listtype_dash">
        <li class="firstincontainer2"><p class="firstinsequence">First list item.</p></li>
        <li class="firstincontainer2"><p class="firstinsequence">Second list item.</p></li>
        <li class="firstincontainer2"><p class="firstinsequence"><span class="origpage" epub:type="pagebreak" title="20"></span>Third list item.</p></li>
      </ul></div>
    </body></html>`),
  ).toBe("+ First list item.\n+ Second list item.\n+ Third list item.");
});

test("markdown: wrapped dash list with pagebreak spans", () => {
  expect(
    render(`<html><body>
      <div class="liste_ungeordnet"><ul class="listtype_dash">
        <li class="firstincontainer2"><p class="firstinsequence">Alpha item.</p></li>
        <li class="firstincontainer2"><p class="firstinsequence">Beta item with extra words.</p></li>
        <li class="firstincontainer2"><p class="firstinsequence"><span aria-hidden="true" class="origpage" epub:type="pagebreak" id="origpage_20" role="doc-pagebreak" title="20"></span>Gamma item after page break.</p></li>
        <li class="firstincontainer2"><p class="firstinsequence">Delta item (parenthetical aside.)</p></li>
        <li class="firstincontainer2"><p class="firstinsequence">Epsilon item (maybe).</p></li>
      </ul></div>
    </body></html>`),
  ).toBe(
    "+ Alpha item.\n+ Beta item with extra words.\n+ Gamma item after page break.\n+ Delta item (parenthetical aside.)\n+ Epsilon item (maybe).",
  );
});

test("markdown: plus sign in prose is not escaped after pipeline", () => {
  expect(
    render(
      `<html><body><p>2+2 equals 4.</p></body></html>`,
      "markdown",
      PRESETS.find((p) => p.id === "reading")!.options,
    ),
  ).toBe("2+2 equals 4.");
});

test("markdown: external link", () => {
  expect(
    render(
      `<html><body><p>See <a href="https://example.com">here</a>.</p></body></html>`,
    ),
  ).toBe("See [here](https://example.com).");
});

test("markdown: omits images", () => {
  expect(
    render(`<html><body>
      <p>Before <img src="pic.png" alt="diagram"/> after.</p>
      <p><img src="solo.png" alt="solo"/></p>
      <figure><img src="fig.png"/><figcaption>Caption</figcaption></figure>
    </body></html>`),
  ).toBe("Before  after.\n\nCaption");
});

test("markdown: headings inside div keep level", () => {
  expect(
    render(`<html><body>
      <div>
        <h2>Section</h2>
        <p>Body text.</p>
      </div>
    </body></html>`),
  ).toBe("## Section\n\nBody text.");
});

test("markdown: preserves spaces around inline spans in headings", () => {
  expect(
    render(
      `<html><body>
        <h2 class="titel1" id="hid3"><span class="text" epub:type="title"><span aria-hidden="true" class="origpage2" epub:type="pagebreak" id="origpage_11" role="doc-pagebreak" title="11"></span>Nummer <span class="ziffer">1</span></span></h2>
      </body></html>`,
      "markdown",
      PRESETS.find((p) => p.id === "reading")!.options,
    ),
  ).toBe("## Nummer 1");
});

test("markdown: preserves spaces around adjacent styled spans", () => {
  expect(
    render(
      `<html><body>
        <p class="calibre2">Ich schlenderte über den Friedhof und schaute auf den Grabsteinen nach etwas Besonderem: <span class="kapitaelchen">MARTHA F. SUDEROW, </span><span class="ziffer1">24</span>. <span class="kapitaelchen">APRIL</span> <span class="ziffer1">1876</span> – <span class="ziffer1">1</span>. <span class="kapitaelchen">MÄRZ</span> <span class="ziffer1">1979</span>; hundertzwei Jahre!</p>
      </body></html>`,
      "markdown",
      PRESETS.find((p) => p.id === "reading")!.options,
    ),
  ).toBe(
    "Ich schlenderte über den Friedhof und schaute auf den Grabsteinen nach etwas Besonderem: MARTHA F. SUDEROW, 24. APRIL 1876 -- 1. MÄRZ 1979; hundertzwei Jahre!",
  );
});

test("markdown: h1-h6 map to correct hash count", () => {
  expect(
    render(`<html><body>
      <h1>L1</h1><h2>L2</h2><h3>L3</h3><h4>L4</h4><h5>L5</h5><h6>L6</h6>
    </body></html>`),
  ).toBe("# L1\n\n## L2\n\n### L3\n\n#### L4\n\n##### L5\n\n###### L6");
});

test("markdown: p with br keeps inline text", () => {
  expect(
    render(
      `<html><body><p>Line1<br/>Line2</p><p>Para A</p><p>Para B</p></body></html>`,
    ),
  ).toBe("Line1  \nLine2\n\nPara A\n\nPara B");
});

test("plain: p with br keeps line breaks", () => {
  expect(
    render(`<html><body><p>Line1<br/>Line2</p></body></html>`, "plain"),
  ).toBe("Line1\nLine2");
});

test("plain: collapses source newlines inside p", () => {
  expect(
    render(
      `<html><body><p>The quick brown fox\njumps over the lazy dog.</p></body></html>`,
      "plain",
    ),
  ).toBe("The quick brown fox jumps over the lazy dog.");
});

test("plain: strips formatting", () => {
  expect(
    render(`<html><body><p><em>italic</em> text</p></body></html>`, "plain"),
  ).toBe("italic text");
});

test("plain: serializer does not duplicate heading", () => {
  const text = render(
    `<html><body><h1>Chapter One</h1><p>First para.</p><p>Second para.</p></body></html>`,
    "plain",
  );
  expect(text.match(/Chapter One/g)?.length).toBe(1);
  expect(text).toBe("Chapter One\n\nFirst para.\n\nSecond para.");
});

test("markdown: soft-wrapped p tags omit blank gap", () => {
  expect(
    render(
      `<html><body><p>The quick brown fox</p><p>jumps over the lazy dog.</p></body></html>`,
    ),
  ).toBe("The quick brown fox\njumps over the lazy dog.");
});

test("processed preset unwraps soft-wrapped paragraphs", () => {
  expect(
    render(
      `<html><body><p>The quick brown fox</p><p>jumps over the lazy dog.</p><p>Second paragraph.</p><p>Third starts here.</p></body></html>`,
      "markdown",
      PRESETS.find((p) => p.id === "processed")!.options,
    ),
  ).toBe(
    "The quick brown fox jumps over the lazy dog.\n\nSecond paragraph.\n\nThird starts here.",
  );
});

test("processed preset preserves scene break text", () => {
  expect(
    render(
      `<html><body><p>* * *</p></body></html>`,
      "markdown",
      PRESETS.find((p) => p.id === "processed")!.options,
    ),
  ).toBe("* * *");
});

test("processed preset spaces emphasis after punctuation", () => {
  expect(
    render(
      `<html><body><p>She paused.<i class="calibre5"> "Hello there!</i></p></body></html>`,
      "markdown",
      PRESETS.find((p) => p.id === "processed")!.options,
    ),
  ).toBe('She paused. *"Hello there!*');
});

test("processed preset keeps emphasis glued to opening quote", () => {
  expect(
    render(
      `<html><body><p>"<em>You</em> want to tell me, and I have no objection to hearing it."</p></body></html>`,
      "markdown",
      PRESETS.find((p) => p.id === "processed")!.options,
    ),
  ).toBe('"*You* want to tell me, and I have no objection to hearing it."');
});
