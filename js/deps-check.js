/**
 * 页面加载后检查 CDN / vendor 依赖全局变量是否就绪。
 * 缺失时在顶部显示固定红色横幅，便于排查网络或脚本阻塞。
 */
(function () {
  const REQUIRED_GLOBALS = [
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

  function showDepsErrorBanner(missing) {
    if (!missing.length) return;

    let banner = document.getElementById("deps-error-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "deps-error-banner";
      banner.setAttribute("role", "alert");
      banner.style.cssText = [
        "position:fixed",
        "top:0",
        "left:0",
        "right:0",
        "z-index:99999",
        "background:#b91c1c",
        "color:#fff",
        "padding:12px 16px",
        "text-align:center",
        "font-size:14px",
        "font-weight:600",
        "box-shadow:0 2px 8px rgba(0,0,0,.3)",
      ].join(";");
      document.body.prepend(banner);
    }
    banner.textContent =
      "依赖加载失败: [" + missing.join(", ") + "]，请刷新或检查网络";
  }

  function checkDeps() {
    const missing = REQUIRED_GLOBALS.filter(
      (name) => typeof window[name] === "undefined"
    );
    showDepsErrorBanner(missing);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkDeps);
  } else {
    checkDeps();
  }
})();
