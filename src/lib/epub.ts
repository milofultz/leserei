import { assertNotDrmProtected, assertSpineContentReadable } from "./drm";
import { parseHtmlDocument, parseXmlDocument } from "./html";
import { ZipArchive } from "./zip";

export interface SpineItem {
  href: string; // path relative to OPF directory
  content: string; // raw XHTML string
  parsed: Document;
  linear: boolean;
  properties: string[];
}

interface ManifestEntry {
  href: string;
  properties: string[];
}

export async function loadEpub(file: File): Promise<SpineItem[]> {
  const buf = await file.arrayBuffer();
  const zip = await ZipArchive.loadAsync(buf);

  await assertNotDrmProtected(zip);

  // 1. Find OPF path from META-INF/container.xml
  const containerXml = await requireEntry(zip, "META-INF/container.xml");
  const opfPath = parseOpfPath(containerXml);
  const opfDir = opfPath.includes("/")
    ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1)
    : "";

  // 2. Parse OPF — manifest + spine
  const opfXml = await requireEntry(zip, opfPath);
  const spineEntries = parseSpineEntries(opfXml, opfDir);

  // 3. Load each spine item
  const items: SpineItem[] = [];
  for (const entry of spineEntries) {
    const zipEntry =
      zip.file(entry.href) ?? zip.file(decodeURIComponent(entry.href));
    if (!zipEntry) continue;
    const content = await zipEntry.async("string");
    items.push({
      href: entry.href,
      content,
      parsed: parseHtmlDocument(content),
      linear: entry.linear,
      properties: entry.properties,
    });
  }

  assertSpineContentReadable(
    items.filter((item) => item.linear).map((item) => item.content),
  );

  return items;
}

async function requireEntry(zip: ZipArchive, path: string): Promise<string> {
  const entry = zip.file(path);
  if (!entry) throw new Error(`EPUB missing: ${path}`);
  return entry.async("string");
}

function parseOpfPath(containerXml: string): string {
  const doc = parseXmlDocument(containerXml);
  const rootfile = doc.querySelector("rootfile");
  const path = rootfile?.getAttribute("full-path");
  if (!path) throw new Error("container.xml: no rootfile full-path");
  return path;
}

function parseSpineEntries(
  opfXml: string,
  opfDir: string,
): Array<{ href: string; linear: boolean; properties: string[] }> {
  const doc = parseXmlDocument(opfXml);

  const manifestMap = new Map<string, ManifestEntry>();
  doc.querySelectorAll("manifest item").forEach((item) => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    const mt = item.getAttribute("media-type") ?? "";
    if (
      id &&
      href &&
      (mt.includes("xhtml") || mt.includes("html") || href.match(/\.x?html?$/i))
    ) {
      const properties = (item.getAttribute("properties") ?? "")
        .split(/\s+/)
        .filter(Boolean);
      manifestMap.set(id, { href: opfDir + href, properties });
    }
  });

  const entries: Array<{
    href: string;
    linear: boolean;
    properties: string[];
  }> = [];
  doc.querySelectorAll("spine itemref").forEach((ref) => {
    const idref = ref.getAttribute("idref");
    const linear = ref.getAttribute("linear") !== "no";
    if (!idref || !manifestMap.has(idref)) return;
    const manifest = manifestMap.get(idref)!;
    entries.push({
      href: manifest.href,
      linear,
      properties: manifest.properties,
    });
  });

  return entries;
}
