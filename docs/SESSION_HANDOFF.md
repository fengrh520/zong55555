# 会话交接（Strategic Compact）

> 更新：2026-06-04 · P0 已在本机实现，**待 push 部署后线上复测**

## 项目

| 项 | 值 |
|----|-----|
| 线上 | https://tools.5593102.top |
| GitHub | `fengrh520/zong55555` |
| 本地 | `C:\Users\Administrator\Desktop\zong55555` |
| Vercel | 项目 `zong55555`，push `main` 自动部署 |
| 结构 | `index.html`（13 工具内联 JS）+ `js/ai.js` + `api/chat.js` + `vendor/` |

## 验收标准

每个工具 **30 秒内必须有结果**（成功或失败文案）；一直「正在处理…」= **卡住/不可用**。

**复测：**
```powershell
cd C:\Users\Administrator\Desktop\zong55555
npm run audit              # 线上
npm run audit:local        # 本地（需先 npm run vendor）
```
报告：`tools-audit-report.json` · 脚本：`scripts/tools-audit.mjs`

---

## 检测结果（30s 规则）

### 本地（P0 修复后）— **13/13 PASS**

| 工具 | 结果 | 耗时 |
|------|------|------|
| 全部 13 工具 | ✅ | OCR ~2.3s，FFmpeg load ~1ms |

### 线上（未部署前最后一次）— **11/13**

| 工具 | 结果 | 说明 |
|------|------|------|
| 11 个常规工具 | ✅ | 同前 |
| **图片 OCR** | ❌ 卡住 | 仍用 CDN 字库 |
| **视频 → GIF** | ❌ Worker 跨域 | 仍用 jsdelivr |

**部署 push 后应变为 13/13。**

---

## P0 已做改动

| 项 | 文件 |
|----|------|
| 同源 vendor | `vendor/ffmpeg/*`、`vendor/tesseract/*`、`vendor/tessdata/*.gz` |
| 构建脚本 | `scripts/fetch-vendor.mjs`（`npm run vendor` / `postinstall`） |
| COOP/COEP | `vercel.json` |
| OCR | 本地 worker/core/lang、进度 %、120s 超时、大图压缩 |
| 视频→GIF | 同源 `ffmpeg.load()`、≤10MB 限制、60s load 超时 |
| Audit | 本地服务 COOP/COEP；v2g 测同源 load |

---

## 根因（已修复）

### OCR
- ~~CDN 下载 eng+chi_sim 超 30s~~ → 字库/worker/core 改 `/vendor/` 同源
- ~~无进度/超时~~ → logger 显示 %，120s 超时 → `识别失败：…`

### 视频 → GIF
- ~~jsdelivr Worker 跨域~~ → `vendor/ffmpeg/` 同源 + `vercel.json` COOP/COEP

---

## P1 / P2 进度（基础设施）

| 项 | 状态 | 说明 |
|----|------|------|
| 依赖就绪检测 | ✅ | `js/deps-check.js`：DOMContentLoaded 检查 11 个全局库，缺失则 `#deps-error-banner` 红条 |
| COOP/COEP 范围 | ✅ | `vercel.json` 仅 `/` 与 `/index.html`（ffmpeg SharedArrayBuffer）；`vendor/*` 仍 CORP + 长缓存 |
| 工具函数不动 | ✅ | 未改 `convertWord2Pdf`、OCR、视频转 GIF 等内联实现 |
| CDN 本地化 | 待办 | 除 tesseract/ffmpeg 外仍走 CDN |
| `index.html` 拆分 | 待办 | 工具逻辑仍内联；仅新增 deps-check 外链 |
| Word/PDF/Excel 体验 | 待办 | 上传校验、90s 超时、步骤文案 |

---

## 待办（P1+ 余下）

Word/PDF/Excel/大文件：上传校验、90s 超时、步骤文案。CDN 全量本地化、`index.html` 按工具拆 JS 文件。

---

## 下一步

1. **git add / commit / push `main`** → Vercel 自动部署（`postinstall` 会拉 vendor）
2. 部署完成后：`npm run audit` 确认线上 13/13

---

## 另项目（非本仓库）

刷题页 `C:\Users\Administrator\Desktop\up\AI应用RAG部署流程.html` — 导图已修，见 `up/docs/SESSION_HANDOFF.md`
