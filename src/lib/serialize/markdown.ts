import type { Block, Doc, Inline, ListItem } from "../doc";
import { inlineText } from "../docTransforms";
import { isAsteriskDividerLine, SCENE_BREAK } from "../markdown";
import type { SerializeOptions } from "./types";

const PARAGRAPH_END_RE = /[.!?:)\]"'»…\u2026\u201D\u2019]$/u;

function headingPrefix(level: number): string {
  return `${"#".repeat(Math.min(Math.max(level, 1), 6))} `;
}

function escapeText(text: string): string {
  return text.replace(/([\\`*[])/g, "\\$1");
}

function escapeLineStart(line: string): string {
  return line
    .replace(/^([#+>-])(?=\s|$)/, "\\$1")
    .replace(/^(\d+)\. /, "$1\\. ");
}

function ornamentLineText(inline: Inline[]): string | null {
  const text = inlineText(inline);
  const unescaped = text.trim().replace(/\\\*/g, "*");
  if (isAsteriskDividerLine(unescaped)) return unescaped;
  if (unescaped === "*") return unescaped;
  return null;
}

export function serializeMarkdownInline(inline: Inline[]): string {
  let text = "";
  for (const node of inline) {
    if (node.t === "text") {
      text += escapeText(node.value);
    } else if (node.t === "emph") {
      text += `*${serializeMarkdownInline(node.children).trim()}*`;
    } else if (node.t === "strong") {
      text += `**${serializeMarkdownInline(node.children).trim()}**`;
    } else if (node.t === "code") {
      text += `\`${node.value.replace(/`/g, "\\`").replace(/\s+/g, " ")}\``;
    } else if (node.t === "link") {
      const inner = serializeMarkdownInline(node.children);
      if (node.href.includes("://")) {
        const title = node.title ? ` "${node.title.replace(/\s+/g, " ")}"` : "";
        text += `[${inner}](${node.href}${title})`;
      } else {
        text += inner;
      }
    } else if (node.t === "break") {
      text += "  \n";
    }
  }
  return text.trim();
}

interface RenderedBlock {
  lines: string[];
  kind: Block["t"] | "listItem";
}

function renderListItem(
  item: ListItem,
  index: number,
  ordered: boolean,
): string[] {
  const prefix = ordered ? `${index + 1}. ` : "+ ";
  const blocks = renderBlocks(item.children);
  if (blocks.length === 0) return [];
  return blocks.flatMap((block, blockIndex) =>
    block.lines.map((line, lineIndex) => {
      if (blockIndex === 0 && lineIndex === 0) return prefix + line;
      return `  ${line}`;
    }),
  );
}

function renderBlock(block: Block): RenderedBlock {
  if (block.t === "heading") {
    const ornament = ornamentLineText(block.inline);
    if (ornament) return { kind: block.t, lines: [ornament] };
    const text = serializeMarkdownInline(block.inline);
    return {
      kind: block.t,
      lines: text ? [headingPrefix(block.level) + text] : [],
    };
  }
  if (block.t === "para") {
    const ornament = ornamentLineText(block.inline);
    if (ornament) return { kind: block.t, lines: [ornament] };
    const text = serializeMarkdownInline(block.inline);
    return { kind: block.t, lines: text ? [escapeLineStart(text)] : [] };
  }
  if (block.t === "sceneBreak") return { kind: block.t, lines: [SCENE_BREAK] };
  if (block.t === "codeBlock") {
    return {
      kind: block.t,
      lines: block.value.split("\n").map((line) => `    ${line}`),
    };
  }
  if (block.t === "quote") {
    return {
      kind: block.t,
      lines: renderBlocks(block.children)
        .flatMap((rendered) => rendered.lines)
        .map((line) => `> ${line}`),
    };
  }
  return {
    kind: block.t,
    lines: block.items.flatMap((item, index) =>
      renderListItem(item, index, block.ordered),
    ),
  };
}

function renderBlocks(blocks: Block[]): RenderedBlock[] {
  return blocks.map(renderBlock).filter((block) => block.lines.length > 0);
}

function needsBlankLine(prev: RenderedBlock, next: RenderedBlock): boolean {
  if (prev.kind === "list" && next.kind === "list") return false;
  if (prev.kind !== "para" || next.kind !== "para") return true;
  const prevLine = prev.lines[prev.lines.length - 1] ?? "";
  const nextLine = next.lines[0] ?? "";
  if (PARAGRAPH_END_RE.test(prevLine)) return true;
  if (/^[A-Z]/u.test(nextLine)) return true;
  return false;
}

function joinRenderedBlocks(blocks: RenderedBlock[]): string {
  let text = "";
  let prev: RenderedBlock | undefined;
  for (const block of blocks) {
    if (!text) {
      text = block.lines.join("\n");
    } else {
      text += prev && needsBlankLine(prev, block) ? "\n\n" : "\n";
      text += block.lines.join("\n");
    }
    prev = block;
  }
  return text;
}

export function serializeMarkdown(
  doc: Doc,
  _opts: SerializeOptions = {},
): string {
  return doc.chapters
    .map((chapter) => joinRenderedBlocks(renderBlocks(chapter.blocks)))
    .filter(Boolean)
    .join("\n\n\n");
}
