import type { SpineItem } from "./epub";
import { documentBody, parseHtmlDocument } from "./html";

const FRONT_MATTER_HREF =
  /(?:^|\/)(nav|toc|cover|title-?page|titlepage|title|copyright|dedication|halftitle|half-?title|contents?|colophon|imprint|acknowledgments?|epigraph|praises?|alsoby|also-by|about-the-\w+|about-?the-?author|author|frontmatter|front-?matter|fm\d|prelim)(?:[._-]|\.|$)/i;

const SKIP_PROPERTIES = new Set(["nav", "cover-image", "cover"]);

const TOC_HEADING =
  /^(table of contents|contents|inhaltsverzeichnis|table des mati[eè]res)$/i;

// Treat a document as nav-only when more than 90% of its visible text is inside
// <nav>; this catches generated TOC files while allowing normal chapters with
// incidental navigation links.
const NAV_TEXT_RATIO_THRESHOLD = 0.9;

// Compact TOC pages often consist almost entirely of links. Require at least
// 45% link text so ordinary short chapters with a few references are kept.
const TOC_LINK_TEXT_RATIO_THRESHOLD = 0.45;

// Keep large linked documents: real chapters can contain many links, while TOC
// files are usually short.
const MAX_TOC_TEXT_LENGTH = 8000;

function bodyFromSource(xhtml: string): Element {
  return documentBody(parseHtmlDocument(xhtml));
}

function isNavBody(body: Element): boolean {
  const nav = body.querySelector("nav");
  if (!nav) return false;

  const bodyText = (body.textContent ?? "").replace(/\s+/g, " ").trim();
  const navText = (nav.textContent ?? "").replace(/\s+/g, " ").trim();
  if (
    navText.length > 0 &&
    bodyText.length > 0 &&
    navText.length / bodyText.length > NAV_TEXT_RATIO_THRESHOLD
  ) {
    return true;
  }

  const blockChildren = Array.from(body.children).filter((el) => {
    const tag = el.tagName.toLowerCase();
    return tag !== "head" && tag !== "script" && tag !== "style";
  });
  return (
    blockChildren.length === 1 &&
    blockChildren[0]!.tagName.toLowerCase() === "nav"
  );
}

export function isNavDocument(xhtml: string): boolean {
  return isNavBody(bodyFromSource(xhtml));
}

function isTableOfContentsBody(body: Element): boolean {
  for (const el of body.querySelectorAll("*")) {
    const epubType = el.getAttribute("epub:type") ?? "";
    if (/\btoc\b/i.test(epubType)) return true;
  }

  const heading =
    body.querySelector("h1,h2,h3")?.textContent?.replace(/\s+/g, " ").trim() ??
    "";
  if (TOC_HEADING.test(heading)) return true;

  const links = body.querySelectorAll("a[href]");
  const text = (body.textContent ?? "").replace(/\s+/g, " ").trim();
  if (
    links.length >= 4 &&
    text.length > 0 &&
    text.length < MAX_TOC_TEXT_LENGTH
  ) {
    const linkText = Array.from(links)
      .map((a) => (a.textContent ?? "").replace(/\s+/g, " ").trim())
      .join(" ");
    if (linkText.length / text.length > TOC_LINK_TEXT_RATIO_THRESHOLD)
      return true;
  }

  return false;
}

export function isTableOfContentsPage(xhtml: string): boolean {
  return isTableOfContentsBody(bodyFromSource(xhtml));
}

export function isFrontMatterItem(item: SpineItem): boolean {
  if (!item.linear) return true;
  if (item.properties.some((p) => SKIP_PROPERTIES.has(p))) return true;

  const base = item.href.split("/").pop() ?? item.href;
  if (FRONT_MATTER_HREF.test(base)) return true;

  const body = documentBody(item.parsed ?? parseHtmlDocument(item.content));
  return isNavBody(body) || isTableOfContentsBody(body);
}

export function filterSpine(
  spine: SpineItem[],
  removeFrontMatter: boolean,
): SpineItem[] {
  if (!removeFrontMatter) return spine;
  return spine.filter((item) => !isFrontMatterItem(item));
}
