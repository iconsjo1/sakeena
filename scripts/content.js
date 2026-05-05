/**
 * Sakeena — Content Script v2
 * Now handles: theme application, milestone overlays, optional streak footer.
 */

const api = typeof browser !== "undefined" ? browser : chrome;

const ACTIVITY_WINDOW_MS = 1500;
let lastInputAt = 0;
let pendingShow = null;
let currentOverlay = null;
let activityListenersAttached = false;

const markActive = () => { lastInputAt = Date.now(); };

function attachActivityListeners() {
  if (activityListenersAttached) return;
  activityListenersAttached = true;
  window.addEventListener("keydown", markActive, { passive: true });
  window.addEventListener("mousedown", markActive, { passive: true });
  window.addEventListener("wheel", markActive, { passive: true });
  window.addEventListener("touchstart", markActive, { passive: true });
}

function detachActivityListeners() {
  if (!activityListenersAttached) return;
  activityListenersAttached = false;
  window.removeEventListener("keydown", markActive);
  window.removeEventListener("mousedown", markActive);
  window.removeEventListener("wheel", markActive);
  window.removeEventListener("touchstart", markActive);
}

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SAKEENA_GET_CONTEXT") {
    // Background asks us for page metadata to analyze
    try {
      const desc = document.querySelector('meta[name="description"]')?.content
                || document.querySelector('meta[property="og:description"]')?.content
                || "";
      sendResponse({
        ok: true,
        title: document.title || "",
        description: desc.slice(0, 500), // cap length, never read body
        url: window.location.href
      });
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
    return true;
  }

  if (msg.type !== "SAKEENA_SHOW") return;
  if (!msg.payload?.zikr) return;

  if (document.hidden || document.visibilityState === "hidden") {
    sendResponse({ ok: false, reason: "hidden" });
    return;
  }

  scheduleShow(msg.payload);
  sendResponse({ ok: true });
});

function scheduleShow(payload) {
  attachActivityListeners();
  const now = Date.now();
  const sinceInput = now - lastInputAt;

  if (sinceInput < ACTIVITY_WINDOW_MS) {
    if (pendingShow) clearTimeout(pendingShow);
    pendingShow = setTimeout(() => showOverlay(payload), 2500);
  } else {
    showOverlay(payload);
  }
}

function resolveTheme(theme) {
  if (theme === "auto") {
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "midnight" : "sepia";
  }
  return theme || "emerald";
}

function showOverlay(payload) {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }

  const { zikr, prefs } = payload;
  if (!zikr) return;

  const theme = resolveTheme(prefs.theme);

  const root = document.createElement("div");
  root.className = "sakeena-root";
  root.setAttribute("dir", "rtl");
  root.setAttribute("lang", "ar");
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");

  const shadow = root.attachShadow({ mode: "closed" });
  const styleHref = api.runtime.getURL("overlay/overlay.css");

  const cardClasses = [
    "card",
    `theme-${theme}`,
    prefs.minimalMode ? "card--minimal" : "",
    prefs.vibrationAnimation ? "card--vibrate" : "",
    prefs.isMilestone ? "card--milestone" : "",
    zikr.type === "hadith" ? "card--hadith" : ""
  ].filter(Boolean).join(" ");

  const narratorMarkup = zikr.type === "hadith" && zikr.narrator
    ? `<div class="narrator">— ${escapeHtml(zikr.narrator)}</div>`
    : "";

  shadow.innerHTML = `
    <link rel="stylesheet" href="${styleHref}">
    <div class="${cardClasses}">
      <button class="close" aria-label="إغلاق" title="إغلاق">×</button>
      <div class="badge">${escapeHtml(zikr.categoryLabel || "ذكر")}</div>
      <div class="text">${escapeHtml(zikr.text)}</div>
      ${narratorMarkup}
      ${prefs.showTranslation && zikr.en ? `<div class="translation">${escapeHtml(zikr.en)}</div>` : ""}
      <div class="footer">
        <span class="brand">سكينة</span>
        ${prefs.showSnooze && !prefs.isMilestone ? `
          <div class="snooze-group">
            <button class="snooze-btn" data-snooze="15" title="تأجيل 15 دقيقة">15د</button>
            <button class="snooze-btn" data-snooze="60" title="تأجيل ساعة">1س</button>
            <button class="snooze-btn" data-snooze="today" title="تأجيل لنهاية اليوم">اليوم</button>
          </div>
        ` : `<span class="hint">انقر للإخفاء</span>`}
      </div>
      <div class="progress"><div class="progress-bar"></div></div>
    </div>
  `;

  document.documentElement.appendChild(root);
  currentOverlay = root;

  const card = shadow.querySelector(".card");
  const closeBtn = shadow.querySelector(".close");
  const progressBar = shadow.querySelector(".progress-bar");

  const dismissMs = (prefs.autoDismissSec || 12) * 1000;
  progressBar.style.animationDuration = `${dismissMs}ms`;

  if (prefs.soundEnabled) playSoftChime();

  const viewedTimer = setTimeout(() => {
    api.runtime.sendMessage({ type: "SAKEENA_VIEWED" }).catch(() => {});
  }, 2000);

  const autoTimer = setTimeout(dismiss, dismissMs);

  card.addEventListener("mouseenter", () => {
    clearTimeout(autoTimer);
    progressBar.style.animationPlayState = "paused";
  });

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    api.runtime.sendMessage({ type: "SAKEENA_DISMISSED" }).catch(() => {});
    dismiss();
  });

  // Snooze buttons (do not bubble to card click)
  shadow.querySelectorAll(".snooze-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const value = btn.dataset.snooze;
      const minutes = value === "today" ? "today" : Number(value);
      api.runtime.sendMessage({ type: "SAKEENA_SNOOZE", minutes }).catch(() => {});
      api.runtime.sendMessage({ type: "SAKEENA_DISMISSED" }).catch(() => {});
      // Brief feedback then dismiss
      btn.textContent = "✓";
      btn.classList.add("snooze-confirmed");
      setTimeout(dismiss, 600);
    });
  });

  card.addEventListener("click", dismiss);

  function dismiss() {
    clearTimeout(viewedTimer);
    if (!currentOverlay) return;
    card.classList.add("card--leaving");
    setTimeout(() => {
      currentOverlay?.remove();
      currentOverlay = null;
      detachActivityListeners();
    }, 400);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function playSoftChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) { /* ignore */ }
}
