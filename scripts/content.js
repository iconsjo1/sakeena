/**
 * Sakeena — Content Script v2
 * Now handles: theme application, milestone overlays, optional streak footer.
 */

const api = typeof browser === 'object' ? browser : chrome;

const ACTIVITY_WINDOW_MS = 1500;
let lastInputAt = 0;
let pendingShow = null;
let currentOverlay = null;
let activityListenersAttached = false;

const markActive = () => {
  lastInputAt = Date.now();
};

function attachActivityListeners() {
  if (activityListenersAttached) return;
  activityListenersAttached = true;
  globalThis.addEventListener('keydown', markActive, { passive: true });
  globalThis.addEventListener('mousedown', markActive, { passive: true });
  globalThis.addEventListener('wheel', markActive, { passive: true });
  globalThis.addEventListener('touchstart', markActive, { passive: true });
}

function detachActivityListeners() {
  if (!activityListenersAttached) return;
  activityListenersAttached = false;
  globalThis.removeEventListener('keydown', markActive);
  globalThis.removeEventListener('mousedown', markActive);
  globalThis.removeEventListener('wheel', markActive);
  globalThis.removeEventListener('touchstart', markActive);
}

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SAKEENA_GET_CONTEXT') {
    try {
      const desc =
        document.querySelector('meta[name="description"]')?.content ||
        document.querySelector('meta[property="og:description"]')?.content ||
        '';
      sendResponse({
        ok: true,
        title: document.title || '',
        description: desc.slice(0, 500),
        url: globalThis.location.href,
      });
    } catch (e) {
      sendResponse({ ok: true, error: e.message });
    }
    return true;
  }

  if (msg.type !== 'SAKEENA_SHOW') return;
  if (!msg.payload?.zikr) return;

  if (document.hidden || document.visibilityState === 'hidden') {
    sendResponse({ ok: false, reason: 'hidden' });
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
  if (theme === 'auto') {
    const prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'midnight' : 'sepia';
  }
  return theme || 'emerald';
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getOverlayStrings(language) {
  if (language === 'en') {
    return {
      rootLabel: 'Sakeena reminder',
      close: 'Close',
      snooze15: 'Snooze 15 minutes',
      snooze60: 'Snooze 1 hour',
      snoozeToday: 'Snooze until end of day',
      hint: 'Click to dismiss',
      brand: 'Sakeena',
      categoryDefault: 'Zikr',
      snooze15Label: '15m',
      snooze60Label: '1h',
      snoozeTodayLabel: 'Today',
    };
  }
  return {
    rootLabel: 'إشعار سكينة',
    close: 'إغلاق',
    snooze15: 'تأجيل 15 دقيقة',
    snooze60: 'تأجيل ساعة',
    snoozeToday: 'تأجيل لنهاية اليوم',
    hint: 'انقر للإخفاء',
    brand: 'سكينة',
    categoryDefault: 'ذكر',
    snooze15Label: '15د',
    snooze60Label: '1س',
    snoozeTodayLabel: 'اليوم',
  };
}

function playSoftChime() {
  try {
    const ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.debug('Chime failed:', e);
  }
}

function speakArabic(text, prefs) {
  try {
    if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return;
    globalThis.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = Math.max(0.5, Math.min(1.5, prefs.ttsRate || 0.85));
    utterance.volume = Math.max(0, Math.min(1, prefs.ttsVolume || 0.6));
    utterance.pitch = 1;

    const pickArabicVoice = () => {
      const voices = globalThis.speechSynthesis.getVoices();
      if (!voices.length) return null;
      return voices.find((v) => v.lang === 'ar-SA') || 
             voices.find((v) => v.lang === 'ar-EG') || 
             voices.find((v) => v.lang.startsWith('ar'));
    };

    const voice = pickArabicVoice();
    if (voice) {
      utterance.voice = voice;
    } else if (globalThis.speechSynthesis.onvoiceschanged !== undefined) {
      globalThis.speechSynthesis.onvoiceschanged = () => {
        const v = pickArabicVoice();
        if (v) utterance.voice = v;
      };
    }
    globalThis.speechSynthesis.speak(utterance);
  } catch (e) {
    console.debug('TTS failed:', e);
  }
}

function buildOverlayMarkup(zikr, prefs, strings, styleHref, cardClasses) {
  const narratorMarkup = (zikr.type === 'hadith' && zikr.narrator)
    ? `<div class="narrator">— ${escapeHtml(zikr.narrator)}</div>` : '';
  const translationMarkup = (prefs.showTranslation && zikr.en)
    ? `<div class="translation">${escapeHtml(zikr.en)}</div>` : '';
  const footerContent = (prefs.showSnooze && !prefs.isMilestone)
    ? `
      <div class="snooze-group">
        <button class="snooze-btn" data-snooze="15" title="${strings.snooze15}">15${strings.snooze15Label}</button>
        <button class="snooze-btn" data-snooze="60" title="${strings.snooze60}">${strings.snooze60Label}</button>
        <button class="snooze-btn" data-snooze="today" title="${strings.snoozeToday}">${strings.snoozeTodayLabel}</button>
      </div>
    ` : `<span class="hint">${strings.hint}</span>`;

  return `
    <link rel="stylesheet" href="${styleHref}">
    <div class="${cardClasses}" role="document" aria-describedby="sakeenaText">
      <button class="close" aria-label="${strings.close}" title="${strings.close}" aria-keyshortcuts="Escape">×</button>
      <div class="badge">${escapeHtml(zikr.categoryLabel || strings.categoryDefault)}</div>
      <div class="text" id="sakeenaText">${escapeHtml(zikr.text)}</div>
      ${narratorMarkup}
      ${translationMarkup}
      <div class="footer">
        <span class="brand">${strings.brand}</span>
        ${footerContent}
      </div>
      <div class="progress"><div class="progress-bar"></div></div>
    </div>
  `;
}

function wireOverlayEvents(shadow, card, dismiss, viewedTimer, dismissMs) {
  const autoTimer = setTimeout(dismiss, dismissMs);
  const progressBar = shadow.querySelector('.progress-bar');
  
  card.addEventListener('mouseenter', () => {
    clearTimeout(autoTimer);
    progressBar.style.animationPlayState = 'paused';
  });

  shadow.querySelector('.close').addEventListener('click', (e) => {
    e.stopPropagation();
    api.runtime.sendMessage({ type: 'SAKEENA_DISMISSED' }).catch((err) => console.debug('Dismiss message failed:', err));
    dismiss();
  });

  shadow.querySelectorAll('.snooze-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const minutes = btn.dataset.snooze === 'today' ? 'today' : Number(btn.dataset.snooze);
      api.runtime.sendMessage({ type: 'SAKEENA_SNOOZE', minutes }).catch((err) => console.debug('Snooze message failed:', err));
      api.runtime.sendMessage({ type: 'SAKEENA_DISMISSED' }).catch((err) => console.debug('Dismiss message failed:', err));
      btn.textContent = '✓';
      btn.classList.add('snooze-confirmed');
      setTimeout(dismiss, 600);
    });
  });

  card.addEventListener('click', dismiss);
}

function setupOverlayA11y(shadow, dismiss) {
  const focusable = Array.from(shadow.querySelectorAll('button:not([disabled])'));
  if (focusable.length > 0) focusable[0].focus();

  shadow.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      dismiss();
    } else if (e.key === 'Tab' && focusable.length > 0) {
      const idx = focusable.indexOf(e.target);
      if (idx === -1) return;
      if (e.shiftKey && idx === 0) {
        e.preventDefault();
        focusable.at(-1).focus();
      } else if (!e.shiftKey && idx === focusable.length - 1) {
        e.preventDefault();
        focusable[0].focus();
      }
    }
  });
}

function showOverlay(payload) {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }

  const { zikr, prefs } = payload;
  if (!zikr) return;

  const theme = resolveTheme(prefs.theme);
  const strings = getOverlayStrings(prefs.language);
  const root = document.createElement('div');
  root.className = 'sakeena-root';
  root.setAttribute('dir', prefs.language === 'en' ? 'ltr' : 'rtl');
  root.setAttribute('lang', prefs.language === 'en' ? 'en' : 'ar');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', strings.rootLabel);

  const shadow = root.attachShadow({ mode: 'closed' });
  const cardClasses = [
    'card', `theme-${theme}`,
    prefs.minimalMode ? 'card--minimal' : '',
    prefs.vibrationAnimation ? 'card--vibrate' : '',
    prefs.isMilestone ? 'card--milestone' : '',
    zikr.type === 'hadith' ? 'card--hadith' : '',
  ].filter(Boolean).join(' ');

  shadow.innerHTML = buildOverlayMarkup(zikr, prefs, strings, api.runtime.getURL('overlay/overlay.css'), cardClasses);

  document.documentElement.appendChild(root);
  currentOverlay = root;

  const card = shadow.querySelector('.card');
  card.setAttribute('data-position', prefs.position || 'bottom-right');
  
  const dismissMs = (prefs.autoDismissSec || 12) * 1000;
  shadow.querySelector('.progress-bar').style.animationDuration = `${dismissMs}ms`;

  if (prefs.soundEnabled) playSoftChime();
  if (prefs.ttsEnabled) speakArabic(zikr.text, prefs);

  const viewedTimer = setTimeout(() => {
    api.runtime.sendMessage({ type: 'SAKEENA_VIEWED' }).catch((err) => console.debug('Viewed message failed:', err));
  }, 2000);

  const dismiss = () => {
    clearTimeout(viewedTimer);
    if (!currentOverlay) return;
    try { 
      globalThis.speechSynthesis?.cancel(); 
    } catch (e) { 
      console.debug('Speech cancel failed:', e); 
    }
    card.classList.add('card--leaving');
    setTimeout(() => {
      currentOverlay?.remove();
      currentOverlay = null;
      detachActivityListeners();
    }, 400);
  };

  wireOverlayEvents(shadow, card, dismiss, viewedTimer, dismissMs);
  setupOverlayA11y(shadow, dismiss);
}
