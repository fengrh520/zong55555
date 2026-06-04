/**
 * 重文件工具防卡死：按钮锁定、超时、友好错误
 */
(function () {
  function raceWithTimeout(promise, ms, message) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error(message));
        }, ms);
      }),
    ]);
  }

  function assertFileSize(file, maxBytes, label) {
    if (file.size > maxBytes) {
      var maxMB = (maxBytes / 1024 / 1024).toFixed(0);
      var curMB = (file.size / 1024 / 1024).toFixed(2);
      throw new Error(label + "请小于 " + maxMB + "MB（当前 " + curMB + "MB）");
    }
  }

  async function runWithToolGuard(options) {
    var btn = options.btn;
    var statusEl = options.statusEl;
    var validate = options.validate;
    var task = options.task;
    var timeoutMs = options.timeoutMs;
    var onSuccessStatus = options.onSuccessStatus;
    var failPrefix = options.failPrefix || "转换失败：";

    if (validate) {
      try {
        await Promise.resolve(validate());
      } catch (err) {
        if (statusEl) statusEl.innerText = failPrefix + err.message;
        return;
      }
    }

    if (btn) {
      btn.disabled = true;
      btn.classList.add("opacity-50", "cursor-not-allowed");
    }

    try {
      var result = await raceWithTimeout(
        Promise.resolve().then(task),
        timeoutMs,
        "操作超时（" + Math.round(timeoutMs / 1000) + "s），请缩小文件后重试"
      );
      if (statusEl && onSuccessStatus !== undefined) {
        statusEl.innerText =
          typeof onSuccessStatus === "function"
            ? onSuccessStatus(result)
            : onSuccessStatus;
      }
    } catch (err) {
      if (statusEl) statusEl.innerText = failPrefix + err.message;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("opacity-50", "cursor-not-allowed");
      }
    }
  }

  window.assertFileSize = assertFileSize;
  window.runWithToolGuard = runWithToolGuard;
})();
