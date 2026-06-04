/**
 * 逐个检测 13 个工具：30 秒内必须有明确结果（成功或失败文案），否则判「卡住/不可用」
 * 用法: node scripts/tools-audit.mjs [url]
 * 默认测线上 https://tools.5593102.top
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { spawn } from "child_process";

const TIMEOUT_MS = 30_000;
const BASE_URL = process.argv[2] || "https://tools.5593102.top";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX = path.join(ROOT, "test-fixtures");

const LIBS = [
  "QRCode",
  "imageCompression",
  "mammoth",
  "html2pdf",
  "pdfjsLib",
  "JSZip",
  "marked",
  "XLSX",
  "Tesseract",
  "FFmpegWASM",
  "FFmpegUtil",
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForCondition(page, fn, timeoutMs = TIMEOUT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await fn();
    if (v) return { ok: true, value: v, ms: Date.now() - start };
    await wait(200);
  }
  return { ok: false, ms: Date.now() - start };
}

async function openTool(page, tabId, title) {
  await page.evaluate(
    ({ id, t }) => {
      if (typeof openTool === "function") openTool(id, t);
    },
    { id: tabId, t: title || tabId }
  );
  await page.waitForSelector(`#${tabId}.active`, { timeout: 8000 });
  await wait(400);
}

async function checkLibs(page) {
  return page.evaluate((names) => {
    const missing = names.filter((n) => typeof window[n] === "undefined");
    return { missing, ok: missing.length === 0 };
  }, LIBS);
}

const TOOLS = [
  {
    id: "time",
    name: "时间计算器",
    tab: "tool-time",
    async run(page) {
      await openTool(page, "tool-time");
      await page.fill("#start-time", "2025-01-01T08:00");
      await page.fill("#end-time", "2025-01-02T08:00");
      await page.click('button:has-text("计算时间差")');
      const r = await waitForCondition(page, async () => {
        const el = await page.$("#time-result");
        if (!el) return null;
        const hidden = await el.evaluate((e) => e.classList.contains("hidden"));
        const text = await el.innerText();
        return !hidden && text.includes("相差") ? text : null;
      });
      return r.ok ? { status: "pass", detail: r.value, ms: r.ms } : { status: "hang", detail: "30s 内无结果", ms: r.ms };
    },
  },
  {
    id: "qr",
    name: "二维码生成器",
    tab: "tool-qr",
    async run(page) {
      await openTool(page, "tool-qr");
      await page.fill("#qr-text", "https://tools.5593102.top");
      await page.click('button:has-text("生成二维码")');
      const r = await waitForCondition(page, async () => {
        const box = await page.$("#qrcode-container canvas, #qrcode-container img");
        return box ? "qr rendered" : null;
      });
      return r.ok ? { status: "pass", detail: r.value, ms: r.ms } : { status: "hang", detail: "30s 内未生成二维码", ms: r.ms };
    },
  },
  {
    id: "ic",
    name: "图片压缩",
    tab: "tool-ic",
    async run(page) {
      await openTool(page, "tool-ic");
      await page.setInputFiles("#ic-file", path.join(FIX, "sample.png"));
      await page.click('button:has-text("开始压缩")');
      const r = await waitForCondition(page, async () => {
        const t = await page.locator("#ic-status").innerText();
        if (/压缩完成|压缩失败/.test(t)) return t;
        return null;
      });
      return classifyStatus(r, "ic-status");
    },
  },
  {
    id: "w2p",
    name: "Word 转 PDF",
    tab: "tool-w2p",
    async run(page) {
      const docx = path.join(FIX, "sample.docx");
      if (!fs.existsSync(docx)) return { status: "skip", detail: "缺少 sample.docx 夹具", ms: 0 };
      await openTool(page, "tool-w2p");
      await page.setInputFiles("#w2p-file", docx);
      await page.click('button:has-text("转换为 PDF")');
      const r = await waitForCondition(page, async () => {
        const t = await page.locator("#w2p-status").innerText();
        if (/转换完成|转换失败/.test(t)) return t;
        return null;
      });
      return classifyStatus(r, "w2p");
    },
  },
  {
    id: "p2i",
    name: "PDF 转图片",
    tab: "tool-p2i",
    async run(page) {
      await openTool(page, "tool-p2i");
      await page.setInputFiles("#p2i-file", path.join(FIX, "sample.pdf"));
      await page.click('button:has-text("转换为图片包")');
      const r = await waitForCondition(page, async () => {
        const t = await page.locator("#p2i-status").innerText();
        if (/转换完成|转换失败/.test(t)) return t;
        return null;
      });
      return classifyStatus(r, "p2i");
    },
  },
  {
    id: "i2i",
    name: "图片转 ico",
    tab: "tool-i2i",
    async run(page) {
      await openTool(page, "tool-i2i");
      await page.setInputFiles("#i2i-file", path.join(FIX, "sample.png"));
      await page.click('button:has-text("生成 .ico")');
      const r = await waitForCondition(page, async () => {
        const t = await page.locator("#i2i-status").innerText();
        if (/转换完成|转换失败/.test(t)) return t;
        return null;
      });
      return classifyStatus(r, "i2i");
    },
  },
  {
    id: "t2j",
    name: "txt 转 json",
    tab: "tool-t2j",
    async run(page) {
      await openTool(page, "tool-t2j");
      await page.setInputFiles("#t2j-file", path.join(FIX, "sample.txt"));
      await page.click('button:has-text("转换为 JSON")');
      const r = await waitForCondition(page, async () => {
        const t = await page.locator("#t2j-status").innerText();
        if (/转换完成|转换失败/.test(t)) return t;
        return null;
      });
      return classifyStatus(r, "t2j");
    },
  },
  {
    id: "m2w",
    name: "markdown 转 Word",
    tab: "tool-m2w",
    async run(page) {
      await openTool(page, "tool-m2w");
      await page.fill("#m2w-text", "# test\n\nhello");
      const dlPromise = page.waitForEvent("download", { timeout: TIMEOUT_MS }).catch(() => null);
      await page.click('button:has-text("导出为 Word")');
      const dl = await dlPromise;
      if (dl) return { status: "pass", detail: "download triggered", ms: 0 };
      return { status: "hang", detail: "30s 内无下载", ms: TIMEOUT_MS };
    },
  },
  {
    id: "m2h",
    name: "markdown 转 HTML",
    tab: "tool-m2h",
    async run(page) {
      await openTool(page, "tool-m2h");
      await page.fill("#m2h-text", "# test\n\nhello");
      const dlPromise = page.waitForEvent("download", { timeout: TIMEOUT_MS }).catch(() => null);
      await page.click('button:has-text("导出为 HTML")');
      const dl = await dlPromise;
      if (dl) return { status: "pass", detail: "download triggered", ms: 0 };
      return { status: "hang", detail: "30s 内无下载", ms: TIMEOUT_MS };
    },
  },
  {
    id: "e2c",
    name: "Excel 转 CSV",
    tab: "tool-e2c",
    async run(page) {
      const xls = path.join(FIX, "sample.xlsx");
      if (!fs.existsSync(xls)) return { status: "skip", detail: "缺少 sample.xlsx", ms: 0 };
      await openTool(page, "tool-e2c");
      await page.setInputFiles("#e2c-file", xls);
      await page.click('button:has-text("转换为 CSV")');
      const r = await waitForCondition(page, async () => {
        const t = await page.locator("#e2c-status").innerText();
        if (/转换完成|转换失败/.test(t)) return t;
        return null;
      });
      return classifyStatus(r, "e2c");
    },
  },
  {
    id: "ocr",
    name: "图片提取文字 OCR",
    tab: "tool-ocr",
    async run(page) {
      await openTool(page, "tool-ocr");
      await page.setInputFiles("#ocr-file", path.join(FIX, "sample.png"));
      await page.click("#ocr-btn");
      const r = await waitForCondition(page, async () => {
        const t = await page.locator("#ocr-status").innerText();
        if (/识别完成|识别失败/.test(t)) return t;
        return null;
      });
      return classifyStatus(r, "ocr");
    },
  },
  {
    id: "v2g",
    name: "视频转 GIF",
    tab: "tool-v2g",
    async run(page) {
      await openTool(page, "tool-v2g");
      const cdnOk = await page.evaluate(() => typeof FFmpegWASM !== "undefined");
      if (!cdnOk) return { status: "fail", detail: "FFmpeg CDN 未加载", ms: 0 };

      await page.evaluate(async () => {
        try {
          const { FFmpeg } = FFmpegWASM;
          const base = new URL("./vendor/ffmpeg/", location.href).href;
          const f = new FFmpeg();
          await Promise.race([
            f.load({
              coreURL: base + "ffmpeg-core.js",
              wasmURL: base + "ffmpeg-core.wasm",
            }),
            new Promise((_, rej) => setTimeout(() => rej(new Error("load timeout 30s")), 30000)),
          ]);
          window.__ffmpegLoadOk = true;
        } catch (e) {
          window.__ffmpegLoadErr = String(e.message || e);
        }
      });

      const r2 = await waitForCondition(
        page,
        async () =>
          page.evaluate(() => {
            if (window.__ffmpegLoadOk) return "ok";
            if (window.__ffmpegLoadErr) return "err:" + window.__ffmpegLoadErr;
            return null;
          }),
        TIMEOUT_MS
      );

      if (r2.ok && r2.value === "ok") return { status: "pass", detail: "FFmpeg 引擎 30s 内加载成功", ms: r2.ms };
      if (r2.ok && String(r2.value).startsWith("err:"))
        return { status: "fail", detail: r2.value.slice(4), ms: r2.ms };
      return { status: "hang", detail: "FFmpeg 30s 无响应", ms: r2.ms || TIMEOUT_MS };
    },
  },
  {
    id: "wifi",
    name: "扫码链接 WiFi",
    tab: "tool-wifi",
    async run(page) {
      await openTool(page, "tool-wifi");
      await page.fill("#wifi-ssid", "TestWiFi");
      await page.fill("#wifi-password", "12345678");
      await page.click('button:has-text("生成连接二维码")');
      const r = await waitForCondition(page, async () => {
        const box = await page.$("#wifi-qrcode-container canvas, #wifi-qrcode-container img");
        return box ? "wifi qr ok" : null;
      });
      return r.ok ? { status: "pass", detail: r.value, ms: r.ms } : { status: "hang", detail: "30s 内未生成", ms: r.ms };
    },
  },
];

function classifyStatus(r, _id) {
  if (!r.ok) return { status: "hang", detail: "30s 内仍停留在处理中", ms: r.ms };
  if (/失败/.test(r.value)) return { status: "fail", detail: r.value, ms: r.ms };
  return { status: "pass", detail: r.value, ms: r.ms };
}

async function resolveUrl(base) {
  if (base.startsWith("http")) return base.replace(/\/$/, "");
  const port = 8765;
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".wasm": "application/wasm",
    ".gz": "application/gzip",
    ".png": "image/png",
    ".gif": "image/gif",
  };
  const coop = [
    ["Cross-Origin-Opener-Policy", "same-origin"],
    ["Cross-Origin-Embedder-Policy", "require-corp"],
    ["Cross-Origin-Resource-Policy", "same-origin"],
  ];
  const server = http.createServer((req, res) => {
    let p = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    const file = path.join(ROOT, decodeURIComponent(p));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end("not found");
    }
    const ext = path.extname(file);
    res.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream",
      ...Object.fromEntries(coop),
    });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(port, r));
  return { url: `http://127.0.0.1:${port}`, close: () => server.close() };
}

async function main() {
  if (!fs.existsSync(FIX)) {
    console.error("Run: node scripts/generate-fixtures.mjs first");
    process.exit(1);
  }

  let closeServer = () => {};
  let pageUrl = BASE_URL;
  if (BASE_URL === "local") {
    const s = await resolveUrl("local");
    pageUrl = s.url;
    closeServer = s.close;
  }

  console.log("Testing:", pageUrl);
  console.log("Timeout per tool:", TIMEOUT_MS / 1000, "s\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 60000 });
  const libs = await checkLibs(page);
  console.log("CDN 库检测:", libs.ok ? "全部加载" : "缺失: " + libs.missing.join(", "));
  console.log("");

  const results = [];
  for (const tool of TOOLS) {
    process.stdout.write(`[${tool.name}] `);
    try {
      await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await wait(1500);
      const res = await tool.run(page);
      results.push({ ...tool, ...res });
      console.log(`${res.status.toUpperCase()} (${res.ms}ms) — ${res.detail}`);
    } catch (e) {
      results.push({ ...tool, status: "error", detail: e.message, ms: 0 });
      console.log("ERROR —", e.message);
    }
    await page.keyboard.press("Escape").catch(() => {});
    await wait(500);
  }

  await browser.close();
  closeServer();

  const summary = {
    url: pageUrl,
    timeoutSec: TIMEOUT_MS / 1000,
    cdnMissing: libs.missing,
    results: results.map(({ id, name, status, detail, ms }) => ({ id, name, status, detail, ms })),
    counts: {
      pass: results.filter((r) => r.status === "pass").length,
      fail: results.filter((r) => r.status === "fail").length,
      hang: results.filter((r) => r.status === "hang").length,
      skip: results.filter((r) => r.status === "skip").length,
      error: results.filter((r) => r.status === "error").length,
    },
  };

  fs.writeFileSync(path.join(ROOT, "tools-audit-report.json"), JSON.stringify(summary, null, 2));
  console.log("\n--- 汇总 ---");
  console.log("可用(pass):", summary.counts.pass);
  console.log("有反应但失败(fail):", summary.counts.fail);
  console.log("超时卡住(hang):", summary.counts.hang);
  console.log("跳过(skip):", summary.counts.skip);
  console.log("Report:", path.join(ROOT, "tools-audit-report.json"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
