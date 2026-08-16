/** Happy DOM's XML parser rejects single quotes in `<?xml ...?>`. */
function normalizeXmlDeclaration(source: string): string {
  return source.replace(/<\?xml\s+([^?]*)\?>/, (_decl, attrs: string) => {
    return `<?xml ${attrs.replace(/=\s*'([^']*)'/g, '="$1"')}?>`;
  });
}

export function parseXmlDocument(source: string): Document {
  return new DOMParser().parseFromString(
    normalizeXmlDeclaration(source),
    "application/xml",
  );
}

export function parseHtmlDocument(source: string): Document {
  const doc = new DOMParser().parseFromString(source, "application/xhtml+xml");
  if (!doc.querySelector("parsererror")) return doc;
  return new DOMParser().parseFromString(source, "text/html");
}

export function documentBody(doc: Document): Element {
  return doc.querySelector("body") ?? doc.documentElement;
}
