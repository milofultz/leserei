import { expect, test } from "bun:test";

import { parseXmlDocument } from "./html";

test("parseXmlDocument accepts single-quoted XML declaration", () => {
  const xml = `<?xml version='1.0' encoding='utf-8'?>
<package xmlns="http://www.idpf.org/2007/opf">
  <manifest>
    <item id="c1" href="a.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
  </spine>
</package>`;
  const doc = parseXmlDocument(xml);
  expect(doc.querySelector("parsererror")).toBeNull();
  expect(doc.querySelectorAll("manifest item").length).toBe(1);
  expect(doc.querySelectorAll("spine itemref").length).toBe(1);
});
