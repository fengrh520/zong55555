/**
 * 将 FFmpeg / Tesseract 运行时复制到 vendor/（同源，避免 Worker 跨域）
 * 用法: node scripts/fetch-vendor.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = path.join(ROOT, "vendor");
const TESS = path.join(VENDOR, "tessdata");

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) throw new Error("missing: " + src);
  fs.copyFileSync(src, dest);
  console.log("copy", path.relative(ROOT, dest));
}

function copyDirFiles(srcDir, destDir, filter = () => true) {
  mkdirp(destDir);
  for (const name of fs.readdirSync(srcDir)) {
    if (!filter(name)) continue;
    copyFile(path.join(srcDir, name), path.join(destDir, name));
  }
}

function download(url, dest, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("download timeout " + url)), timeoutMs);
    const go = (u) => {
      const mod = u.startsWith("https") ? https : http;
      mod.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return go(res.headers.location);
        }
        if (res.statusCode !== 200) {
          clearTimeout(timer);
          return reject(new Error("HTTP " + res.statusCode + " " + u));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          clearTimeout(timer);
          fs.writeFileSync(dest, Buffer.concat(chunks));
          console.log("download", path.relative(ROOT, dest), "(" + Math.round(fs.statSync(dest).size / 1024) + " KB)");
          resolve();
        });
      }).on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
    };
    go(url);
  });
}

async function main() {
  const marker = path.join(VENDOR, "ffmpeg/ffmpeg-core.wasm");
  if (fs.existsSync(marker)) {
    console.log("vendor/ already present, skip build");
    return;
  }

  mkdirp(VENDOR);
  mkdirp(TESS);

  const nm = path.join(ROOT, "node_modules");

  // FFmpeg UMD + worker chunks (必须整目录，含 814.ffmpeg.js)
  copyDirFiles(
    path.join(nm, "@ffmpeg/ffmpeg/dist/umd"),
    path.join(VENDOR, "ffmpeg"),
    (n) => n.endsWith(".js")
  );
  copyFile(
    path.join(nm, "@ffmpeg/core/dist/umd/ffmpeg-core.js"),
    path.join(VENDOR, "ffmpeg/ffmpeg-core.js")
  );
  copyFile(
    path.join(nm, "@ffmpeg/core/dist/umd/ffmpeg-core.wasm"),
    path.join(VENDOR, "ffmpeg/ffmpeg-core.wasm")
  );
  copyFile(
    path.join(nm, "@ffmpeg/util/dist/umd/index.js"),
    path.join(VENDOR, "ffmpeg/ffmpeg-util.js")
  );
  copyFile(
    path.join(nm, "pdf-lib/dist/pdf-lib.min.js"),
    path.join(VENDOR, "pdf-lib/pdf-lib.min.js")
  );

  // Tesseract worker（同源）
  const tessDist = path.join(nm, "tesseract.js/dist");
  mkdirp(path.join(VENDOR, "tesseract"));
  copyFile(path.join(tessDist, "worker.min.js"), path.join(VENDOR, "tesseract/worker.min.js"));
  copyFile(path.join(tessDist, "tesseract.min.js"), path.join(VENDOR, "tesseract/tesseract.min.js"));
  const coreDir = path.join(nm, "tesseract.js-core");
  for (const name of fs.readdirSync(coreDir)) {
    if (name.endsWith(".wasm.js")) {
      copyFile(path.join(coreDir, name), path.join(VENDOR, "tesseract/" + name));
    }
  }

  // 字库（gzip，tesseract.js 4.0.0 路径）
  const langs = ["eng", "chi_sim"];
  for (const lang of langs) {
    const dest = path.join(TESS, lang + ".traineddata.gz");
    if (!fs.existsSync(dest)) {
      const urls = [
        `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0/${lang}.traineddata.gz`,
        `https://tessdata.projectnaptha.com/4.0.0/${lang}.traineddata.gz`,
      ];
      let ok = false;
      for (const url of urls) {
        try {
          await download(url, dest);
          ok = true;
          break;
        } catch (e) {
          console.warn("retry", lang, url, e.message);
        }
      }
      if (!ok) throw new Error("failed to download " + lang);
    } else {
      console.log("skip existing", path.relative(ROOT, dest));
    }
  }

  console.log("\nVendor ready at vendor/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
