import { parseXmlDocument } from "./html";
import type { ZipArchive } from "./zip";

const FONT_OBFUSCATION_ALGORITHMS = new Set([
  "http://www.idpf.org/2008/embedding",
  "http://ns.adobe.com/pdf/enc#RC",
]);

const CONTENT_PATH = /\.(xhtml?|html?|css|svg|xml|ncx|opf)$/i;
const FONT_PATH = /\.(otf|ttf|woff2?|eot)$/i;

export class DrmProtectedError extends Error {
  constructor(
    message = "This EPUB is DRM-protected and cannot be opened here. Leserei only works with unencrypted books.",
  ) {
    super(message);
    this.name = "DrmProtectedError";
  }
}

export function encryptionXmlIndicatesDrm(xml: string): boolean {
  const doc = parseXmlDocument(xml);
  for (const data of Array.from(doc.querySelectorAll("EncryptedData"))) {
    const algorithm =
      data.querySelector("EncryptionMethod")?.getAttribute("Algorithm") ?? "";
    const uri =
      data.querySelector("CipherReference")?.getAttribute("URI") ?? "";
    if (!algorithm && !uri) continue;

    const fontObfuscation = FONT_OBFUSCATION_ALGORITHMS.has(algorithm);
    if (fontObfuscation && FONT_PATH.test(uri)) continue;
    if (fontObfuscation && !CONTENT_PATH.test(uri)) continue;

    return true;
  }
  return false;
}

export function contentLooksEncrypted(text: string): boolean {
  const sample = text.slice(0, 512);
  if (!sample.trim()) return false;
  const trimmed = sample.trimStart();
  if (trimmed.startsWith("<") || trimmed.startsWith("<?xml")) return false;

  let nonPrintable = 0;
  for (const char of sample) {
    const code = char.charCodeAt(0);
    if (code < 9 || (code > 13 && code < 32) || code === 0xfffd) nonPrintable++;
  }
  return nonPrintable > sample.length * 0.08;
}

export async function assertNotDrmProtected(zip: ZipArchive): Promise<void> {
  if (zip.file("META-INF/rights.xml")) {
    throw new DrmProtectedError();
  }

  if (
    zip.file("META-INF/license.lcpl") ||
    zip.file("META-INF/license.lcpl.sha256")
  ) {
    throw new DrmProtectedError(
      "This EPUB uses Readium LCP DRM and cannot be opened here.",
    );
  }

  const encryptionEntry = zip.file("META-INF/encryption.xml");
  if (encryptionEntry) {
    const encryptionXml = await encryptionEntry.async("string");
    if (encryptionXmlIndicatesDrm(encryptionXml)) {
      throw new DrmProtectedError();
    }
  }
}

export function assertSpineContentReadable(contents: string[]): void {
  const encrypted = contents.filter(contentLooksEncrypted);
  if (encrypted.length === 0) return;
  if (encrypted.length >= Math.max(1, Math.ceil(contents.length * 0.5))) {
    throw new DrmProtectedError();
  }
}
