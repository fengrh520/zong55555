import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "test-fixtures");
fs.mkdirSync(dir, { recursive: true });

const pngB64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
fs.writeFileSync(path.join(dir, "sample.png"), Buffer.from(pngB64, "base64"));
fs.writeFileSync(path.join(dir, "sample.txt"), "line1\nline2\nline3\n");
fs.writeFileSync(path.join(dir, "sample.md"), "# Title\n\n**bold** text\n");

const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 20 100 Td (Hi) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
299
%%EOF`;
fs.writeFileSync(path.join(dir, "sample.pdf"), pdf);

// docx (OOXML zip)
const docxDir = path.join(dir, "_docx_build");
fs.rmSync(docxDir, { recursive: true, force: true });
fs.mkdirSync(path.join(docxDir, "word"), { recursive: true });
fs.mkdirSync(path.join(docxDir, "_rels"), { recursive: true });
fs.writeFileSync(
  path.join(docxDir, "[Content_Types].xml"),
  `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
);
fs.writeFileSync(
  path.join(docxDir, "_rels", ".rels"),
  `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
);
fs.writeFileSync(
  path.join(docxDir, "word", "document.xml"),
  `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello Word Test</w:t></w:r></w:p></w:body></w:document>`
);
const docxOut = path.join(dir, "sample.docx");
const zipTmp = path.join(dir, "sample.zip");
try {
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${docxDir}\\*' -DestinationPath '${zipTmp}' -Force"`,
      { stdio: "ignore" }
    );
  } else {
    execSync(`cd "${docxDir}" && zip -r "${zipTmp}" .`, { stdio: "ignore" });
  }
  if (fs.existsSync(zipTmp)) {
    fs.copyFileSync(zipTmp, docxOut);
    fs.unlinkSync(zipTmp);
  }
} catch (e) {
  console.warn("docx fixture skipped:", e.message);
}
fs.rmSync(docxDir, { recursive: true, force: true });

// xlsx via optional xlsx package
try {
  const XLSX = (await import("xlsx")).default;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["name", "value"],
    ["a", 1],
    ["b", 2],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, path.join(dir, "sample.xlsx"));
} catch {
  console.warn("sample.xlsx skipped — run npm install xlsx in project root");
}

console.log("fixtures OK ->", dir);
