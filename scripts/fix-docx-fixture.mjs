import JSZip from "jszip";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "test-fixtures", "sample.docx");
const zip = new JSZip();
zip.file(
  "[Content_Types].xml",
  `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
);
zip.folder("_rels").file(
  ".rels",
  `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
);
zip.folder("word").file(
  "document.xml",
  `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello Word Test</w:t></w:r></w:p></w:body></w:document>`
);
const buf = await zip.generateAsync({ type: "nodebuffer" });
fs.writeFileSync(out, buf);
console.log("written", out, buf.length);
