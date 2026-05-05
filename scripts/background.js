/**
 * Sakeena — Background Service Worker (v2)
 * Smart scheduling, context detection, memory, anti-spam, AND now:
 *  - Hijri-aware occasion detection (Friday, Ramadan, Iftar, Dhul-Hijjah, Laylat al-Qadr)
 *  - Daily streak tracking with milestone rewards
 *  - Theme preference propagation
 */

importScripts("hijri.js", "streak.js", "context.js");

const api = typeof browser !== "undefined" ? browser : chrome;

const CONSTANTS = {
  ALARM_NAME: "sakeena_tick",
  STORAGE_KEYS: {
    PREFS: "prefs",
    HISTORY: "history",
    LAST_SHOWN_AT: "lastShownAt",
    LAST_ZIKR_ID: "lastZikrId",
    STATS: "stats",
    STREAK: "streak"
  },
  DEFAULT_PREFS: {
    enabled: true,
    minIntervalMin: 3,
    maxIntervalMin: 10,
    cooldownMin: 2,
    soundEnabled: false,
    vibrationAnimation: true,
    autoDismissSec: 12,
    respectIdle: true,
    quietDomains: ["docs.google.com", "meet.google.com", "zoom.us"],
    minimalDomains: ["youtube.com", "netflix.com", "twitch.tv"],
    pauseDuringTyping: true,
    historyLimit: 30,
    theme: "emerald",
    hijriAwareness: true,
    showStreak: true,
    // v1.3 additions
    adaptiveFrequency: true,        // self-tune based on dismiss rate
    showTranslation: false,         // bilingual mode
    language: "ar",                 // ar | en — UI not yet, but used for translation toggle
    dndEnabled: false,              // Do Not Disturb scheduled hours
    dndStart: "23:00",
    dndEnd: "06:00",
    dndDays: [0, 1, 2, 3, 4, 5, 6], // 0=Sun ... 6=Sat
    snoozeUntil: 0,                 // timestamp; if > now, no zikr until then
    // v1.4 additions
    contextAware: true,             // analyze page → contextual du'a
    hadithMode: false,              // mix ahadith into rotation
    hadithFrequency: 5              // 1 in N items = hadith
  }
};

// ---------- Initialization ----------

api.runtime.onInstalled.addListener(async (details) => {
  const { prefs } = await api.storage.local.get(CONSTANTS.STORAGE_KEYS.PREFS);
  if (!prefs) {
    await api.storage.local.set({
      [CONSTANTS.STORAGE_KEYS.PREFS]: CONSTANTS.DEFAULT_PREFS,
      [CONSTANTS.STORAGE_KEYS.HISTORY]: [],
      [CONSTANTS.STORAGE_KEYS.STATS]: { shown: 0, dismissed: 0, viewed: 0 },
      [CONSTANTS.STORAGE_KEYS.STREAK]: {
        current: 0, longest: 0, lastEngagedDay: null,
        totalDays: 0, awardedMilestones: []
      }
    });
  } else {
    // Migration: ensure new keys exist
    const merged = { ...CONSTANTS.DEFAULT_PREFS, ...prefs };
    await api.storage.local.set({ [CONSTANTS.STORAGE_KEYS.PREFS]: merged });
    const { streak } = await api.storage.local.get("streak");
    if (!streak) {
      await api.storage.local.set({
        [CONSTANTS.STORAGE_KEYS.STREAK]: {
          current: 0, longest: 0, lastEngagedDay: null,
          totalDays: 0, awardedMilestones: []
        }
      });
    }
  }

  await scheduleNext();

  if (details.reason === "install") {
    api.tabs.create({ url: api.runtime.getURL("options/options.html") });
  }
});

api.runtime.onStartup?.addListener(scheduleNext);

// ---------- Smart Scheduler ----------

async function scheduleNext() {
  const { prefs, stats } = await api.storage.local.get([
    CONSTANTS.STORAGE_KEYS.PREFS,
    CONSTANTS.STORAGE_KEYS.STATS
  ]);
  const p = { ...CONSTANTS.DEFAULT_PREFS, ...prefs };

  if (!p.enabled) {
    await api.alarms.clear(CONSTANTS.ALARM_NAME);
    return;
  }

  let min = Math.max(1, p.minIntervalMin);
  let max = Math.max(min + 1, p.maxIntervalMin);

  // Adaptive frequency: shift the range based on dismiss rate
  if (p.adaptiveFrequency && stats?.shown >= 10) {
    const dismissRate = (stats.dismissed || 0) / stats.shown;
    // 0.0 dismiss → multiplier 1.0 (no change)
    // 0.5 dismiss → multiplier 1.4 (less frequent)
    // 1.0 dismiss → multiplier 1.8 (much less frequent)
    const multiplier = 1 + dismissRate * 0.8;
    min = Math.round(min * multiplier);
    max = Math.round(max * multiplier);
  }

  const delayMin = min + Math.random() * (max - min);
  await api.alarms.create(CONSTANTS.ALARM_NAME, { delayInMinutes: delayMin });
}

api.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== CONSTANTS.ALARM_NAME) return;
  await tryShowZikr();
  await scheduleNext();
});

// ---------- DND Helper ----------

function isInDndWindow(prefs) {
  const now = new Date();
  const dow = now.getDay();
  if (!prefs.dndDays?.includes(dow)) return false;

  const [sh, sm] = (prefs.dndStart || "23:00").split(":").map(Number);
  const [eh, em] = (prefs.dndEnd || "06:00").split(":").map(Number);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (startMin === endMin) return false; // disabled
  if (startMin < endMin) {
    // Same-day window (e.g., 13:00 → 17:00)
    return nowMin >= startMin && nowMin < endMin;
  } else {
    // Crosses midnight (e.g., 23:00 → 06:00)
    return nowMin >= startMin || nowMin < endMin;
  }
}

// ---------- Anti-Spam Gate ----------

async function tryShowZikr() {
  const data = await api.storage.local.get(null);
  const prefs = { ...CONSTANTS.DEFAULT_PREFS, ...(data.prefs || {}) };
  const lastShown = data.lastShownAt || 0;
  const now = Date.now();

  if (now - lastShown < prefs.cooldownMin * 60 * 1000) return;

  // ✨ Snooze gate
  if (prefs.snoozeUntil && now < prefs.snoozeUntil) return;

  // ✨ DND gate (scheduled quiet hours)
  if (prefs.dndEnabled && isInDndWindow(prefs)) return;

  if (prefs.respectIdle) {
    const state = await new Promise((res) => api.idle.queryState(60, res));
    if (state === "locked") return;
  }

  // Reconcile streak — possibly resets it if a day was missed
  if (data.streak) {
    const reconciled = StreakEngine.reconcile(data.streak);
    if (reconciled !== data.streak) {
      await api.storage.local.set({ streak: reconciled });
    }
  }

  const tabs = await api.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab || !tab.id || !tab.url) return;
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("about:") ||
      tab.url.startsWith("edge://") || tab.url.startsWith("moz-extension://")) return;

  const url = new URL(tab.url);
  const host = url.hostname.replace(/^www\./, "");

  if (prefs.quietDomains?.some((d) => host.includes(d))) return;
  const minimalMode = prefs.minimalDomains?.some((d) => host.includes(d));

  // ✨ Context analysis (v1.4): ask the tab for title + meta description,
  // then run pattern matching to find relevant context tags.
  let contextTags = [];
  if (prefs.contextAware && !minimalMode) {
    try {
      const ctx = await api.tabs.sendMessage(tab.id, { type: "SAKEENA_GET_CONTEXT" });
      if (ctx?.ok) {
        contextTags = ContextAnalyzer.analyze({
          url: ctx.url,
          title: ctx.title,
          description: ctx.description
        });
      }
    } catch (_) {
      // Tab not ready yet, skip context boost
    }
  }

  // ✨ Hadith mode: occasionally show a hadith instead of a zikr
  let zikr;
  if (prefs.hadithMode && Math.random() < (1 / Math.max(2, prefs.hadithFrequency))) {
    zikr = await pickHadith();
  }
  if (!zikr) {
    zikr = await pickZikr({ host, minimalMode, prefs, contextTags });
  }
  if (!zikr) return;

  try {
    await api.tabs.sendMessage(tab.id, {
      type: "SAKEENA_SHOW",
      payload: {
        zikr,
        prefs: {
          autoDismissSec: prefs.autoDismissSec,
          soundEnabled: prefs.soundEnabled,
          vibrationAnimation: prefs.vibrationAnimation,
          minimalMode,
          theme: prefs.theme,
          showTranslation: prefs.showTranslation,
          showSnooze: true
        }
      }
    });
    await recordShown(zikr);
  } catch (err) {
    console.debug("[Sakeena] could not deliver:", err?.message);
  }
}

// ---------- Context-Aware Picker (now Hijri-aware) ----------

async function pickZikr({ host, minimalMode, prefs, contextTags = [] }) {
  const dataUrl = api.runtime.getURL("data/azkar.json");
  const res = await fetch(dataUrl);
  const db = await res.json();

  // Merge user's custom azkar into the database
  const { customAzkar = [] } = await api.storage.local.get("customAzkar");
  if (customAzkar.length > 0) {
    for (const item of customAzkar) {
      const targetCat = item.category || "dua";
      if (db.categories[targetCat]) {
        db.categories[targetCat].azkar.push({
          id: item.id,
          text: item.text,
          weight: item.weight || 3,
          custom: true
        });
      }
    }
  }

  const hour = new Date().getHours();
  const { history = [], lastZikrId } = await api.storage.local.get([
    CONSTANTS.STORAGE_KEYS.HISTORY,
    CONSTANTS.STORAGE_KEYS.LAST_ZIKR_ID
  ]);

  const candidates = [];

  // ✨ Context tags from page analysis — strongest signal
  for (const t of contextTags) {
    if (db.categories[t.tag]) {
      candidates.push({ key: t.tag, weight: t.weight });
    }
  }

  // Time-window matches (morning/evening/night)
  for (const [key, cat] of Object.entries(db.categories)) {
    if (cat.timeWindow) {
      const [from, to] = cat.timeWindow;
      if (hour >= from && hour < to) candidates.push({ key, weight: 3 });
    }
  }

  // Hijri-aware additions
  if (prefs.hijriAwareness) {
    const occasions = HijriUtils.getOccasion(new Date());
    for (const occ of occasions) {
      if (db.categories[occ.key]) {
        candidates.push({ key: occ.key, weight: occ.weight });
      }
    }
  }

  if (minimalMode) {
    candidates.length = 0;
    candidates.push({ key: "light", weight: 5 });
  } else {
    candidates.push({ key: "light", weight: 4 });
    candidates.push({ key: "focus", weight: 2 });
    candidates.push({ key: "dua", weight: 2 });
  }

  const idleState = await new Promise((res) => api.idle.queryState(120, res));
  if (idleState === "idle" && !minimalMode) {
    candidates.push({ key: "afterIdle", weight: 4 });
  }

  // Weighted category selection
  const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * totalWeight;
  let chosenKey = candidates[0].key;
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) { chosenKey = c.key; break; }
  }

  const pool = db.categories[chosenKey].azkar.filter((z) => z.id !== lastZikrId);
  if (pool.length === 0) return null;

  const recentIds = new Set(history.slice(-5).map((h) => h.id));
  const fresh = pool.filter((z) => !recentIds.has(z.id));
  const finalPool = fresh.length > 0 ? fresh : pool;

  const wTotal = finalPool.reduce((s, z) => s + (z.weight || 1), 0);
  let wr = Math.random() * wTotal;
  for (const z of finalPool) {
    wr -= (z.weight || 1);
    if (wr <= 0) {
      return {
        ...z,
        category: chosenKey,
        categoryLabel: db.categories[chosenKey].ar
      };
    }
  }
  return finalPool[0];
}

// ---------- Hadith Picker ----------

async function pickHadith() {
  const dataUrl = api.runtime.getURL("data/azkar.json");
  const res = await fetch(dataUrl);
  const db = await res.json();
  const list = db.ahadith?.items || [];
  if (list.length === 0) return null;

  const { history = [] } = await api.storage.local.get(CONSTANTS.STORAGE_KEYS.HISTORY);
  const recentIds = new Set(history.slice(-5).map((h) => h.id));
  const fresh = list.filter((h) => !recentIds.has(h.id));
  const pool = fresh.length > 0 ? fresh : list;

  const h = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: h.id,
    text: h.text,
    category: "hadith",
    categoryLabel: `حديث · ${h.source}`,
    type: "hadith",
    narrator: h.narrator
  };
}

// ---------- Memory ----------

async function recordShown(zikr) {
  const data = await api.storage.local.get(null);
  const prefs = { ...CONSTANTS.DEFAULT_PREFS, ...(data.prefs || {}) };
  const history = data.history || [];
  const stats = data.stats || { shown: 0, dismissed: 0, viewed: 0 };

  history.push({ id: zikr.id, at: Date.now(), category: zikr.category });
  while (history.length > prefs.historyLimit) history.shift();

  stats.shown += 1;

  await api.storage.local.set({
    [CONSTANTS.STORAGE_KEYS.HISTORY]: history,
    [CONSTANTS.STORAGE_KEYS.LAST_ZIKR_ID]: zikr.id,
    [CONSTANTS.STORAGE_KEYS.LAST_SHOWN_AT]: Date.now(),
    [CONSTANTS.STORAGE_KEYS.STATS]: stats
  });
}

// ---------- Engagement (viewed) → Streak ----------

async function recordEngagement() {
  const { streak } = await api.storage.local.get("streak");
  const result = StreakEngine.recordEngagement(streak);
  await api.storage.local.set({ streak: result.streak });
  return result;
}

// ---------- Message bus ----------

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === "SAKEENA_DISMISSED") {
      const { stats = {} } = await api.storage.local.get("stats");
      stats.dismissed = (stats.dismissed || 0) + 1;
      await api.storage.local.set({ stats });
      sendResponse({ ok: true });

    } else if (msg.type === "SAKEENA_VIEWED") {
      const { stats = {} } = await api.storage.local.get("stats");
      stats.viewed = (stats.viewed || 0) + 1;
      await api.storage.local.set({ stats });

      // Engagement counts → maybe a milestone!
      const result = await recordEngagement();
      if (result.milestoneJustHit && sender.tab?.id) {
        await showMilestoneBanner(sender.tab.id, result.milestoneJustHit);
      }
      sendResponse({ ok: true, streak: result.streak });

    } else if (msg.type === "SAKEENA_TEST_SHOW") {
      const tabs = await api.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (tab?.id) {
        const { prefs } = await api.storage.local.get("prefs");
        const p = { ...CONSTANTS.DEFAULT_PREFS, ...(prefs || {}) };

        // Try to gather context for the test, same as live flow
        let contextTags = [];
        if (p.contextAware) {
          try {
            const ctx = await api.tabs.sendMessage(tab.id, { type: "SAKEENA_GET_CONTEXT" });
            if (ctx?.ok) {
              contextTags = ContextAnalyzer.analyze({
                url: ctx.url, title: ctx.title, description: ctx.description
              });
            }
          } catch (_) { /* ignore */ }
        }

        let zikr;
        if (p.hadithMode && Math.random() < (1 / Math.max(2, p.hadithFrequency))) {
          zikr = await pickHadith();
        }
        if (!zikr) {
          zikr = await pickZikr({ host: "", minimalMode: false, prefs: p, contextTags });
        }

        try {
          await api.tabs.sendMessage(tab.id, {
            type: "SAKEENA_SHOW",
            payload: {
              zikr,
              prefs: {
                autoDismissSec: p.autoDismissSec,
                soundEnabled: p.soundEnabled,
                vibrationAnimation: p.vibrationAnimation,
                minimalMode: false,
                theme: p.theme,
                showTranslation: p.showTranslation,
                showSnooze: true
              }
            }
          });
          if (zikr) await recordShown(zikr);
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
      } else {
        sendResponse({ ok: false, error: "no active tab" });
      }

    } else if (msg.type === "SAKEENA_RESCHEDULE") {
      await scheduleNext();
      sendResponse({ ok: true });

    } else if (msg.type === "SAKEENA_SNOOZE") {
      // msg.minutes = 15 | 60 | "today"
      const { prefs = {} } = await api.storage.local.get("prefs");
      const now = Date.now();
      let until = now;
      if (msg.minutes === "today") {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        until = end.getTime();
      } else {
        until = now + (Number(msg.minutes) || 15) * 60 * 1000;
      }
      prefs.snoozeUntil = until;
      await api.storage.local.set({ prefs });
      sendResponse({ ok: true, until });

    } else if (msg.type === "SAKEENA_GET_HIJRI") {
      // For popup display
      const h = HijriUtils.gregorianToHijri(new Date());
      sendResponse({
        ok: true,
        hijri: HijriUtils.formatHijri(h),
        dayName: HijriUtils.dayName(),
        occasions: HijriUtils.getOccasion()
      });
    }
  })();
  return true;
});

// ---------- Milestone Banner ----------

async function showMilestoneBanner(tabId, milestone) {
  const dataUrl = api.runtime.getURL("data/azkar.json");
  const db = await fetch(dataUrl).then((r) => r.json());
  const text = db.milestones?.[String(milestone)] || `${milestone} يومًا متتالية ✨`;
  const { prefs } = await api.storage.local.get("prefs");
  const p = { ...CONSTANTS.DEFAULT_PREFS, ...(prefs || {}) };

  // Send a special "milestone" payload — content script will style it differently
  setTimeout(() => {
    api.tabs.sendMessage(tabId, {
      type: "SAKEENA_SHOW",
      payload: {
        zikr: { id: `ms-${milestone}`, text, category: "milestone", categoryLabel: "إنجاز" },
        prefs: {
          autoDismissSec: 8,
          soundEnabled: false,
          vibrationAnimation: true,
          minimalMode: false,
          theme: p.theme,
          isMilestone: true
        }
      }
    }).catch(() => {});
  }, 1200); // delay so it appears AFTER the zikr that triggered the milestone fades
}

api.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.prefs) {
    scheduleNext();
  }
});
