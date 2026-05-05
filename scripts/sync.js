/**
 * Sakeena — Sync Manager
 *
 * Bridges chrome.storage.local (everything) with chrome.storage.sync
 * (small subset that should travel between devices).
 *
 * Sync quota constraints (Chrome):
 *   - 100 KB total
 *   - 8 KB per item
 *   - 1800 writes/hour
 *   - 120 writes/min
 *
 * Strategy: only sync the user-meaningful state. Stats reset locally
 * if a fresh device is set up; settings + streak + custom du'as travel.
 */

const SyncManager = (() => {

  const SYNC_KEYS = ["prefs", "streak", "customAzkar"];

  // Debounced write tracker
  let pendingWriteTimer = null;
  const PENDING_DELAY_MS = 2500;

  async function pushToSync() {
    if (!chrome.storage.sync) return { ok: false, reason: "no sync API" };

    const local = await chrome.storage.local.get(SYNC_KEYS);
    const payload = {};
    for (const k of SYNC_KEYS) {
      if (local[k] !== undefined) {
        // Trim customAzkar to fit 8KB per-item limit; keep most recent 50
        if (k === "customAzkar" && Array.isArray(local[k]) && local[k].length > 50) {
          payload[k] = local[k].slice(-50);
        } else {
          payload[k] = local[k];
        }
      }
    }

    try {
      await chrome.storage.sync.set(payload);
      await chrome.storage.local.set({
        lastSyncAt: Date.now(),
        lastSyncStatus: "ok"
      });
      return { ok: true };
    } catch (err) {
      console.warn("[Sakeena] Sync push failed:", err.message);
      await chrome.storage.local.set({
        lastSyncAt: Date.now(),
        lastSyncStatus: "error",
        lastSyncError: err.message
      });
      return { ok: false, error: err.message };
    }
  }

  async function pullFromSync() {
    if (!chrome.storage.sync) return { ok: false, reason: "no sync API" };

    try {
      const remote = await chrome.storage.sync.get(SYNC_KEYS);
      const updates = {};

      // Pull preferences (last-write-wins)
      if (remote.prefs && typeof remote.prefs === "object") {
        const { prefs: localPrefs = {} } = await chrome.storage.local.get("prefs");
        updates.prefs = { ...localPrefs, ...remote.prefs };
      }

      // Pull streak — keep the higher current/longest (defensive merge)
      if (remote.streak) {
        const { streak: localStreak } = await chrome.storage.local.get("streak");
        if (localStreak) {
          updates.streak = {
            current: Math.max(remote.streak.current || 0, localStreak.current || 0),
            longest: Math.max(remote.streak.longest || 0, localStreak.longest || 0),
            lastEngagedDay: remote.streak.lastEngagedDay > localStreak.lastEngagedDay
              ? remote.streak.lastEngagedDay : localStreak.lastEngagedDay,
            totalDays: Math.max(remote.streak.totalDays || 0, localStreak.totalDays || 0),
            awardedMilestones: [...new Set([
              ...(remote.streak.awardedMilestones || []),
              ...(localStreak.awardedMilestones || [])
            ])]
          };
        } else {
          updates.streak = remote.streak;
        }
      }

      // Pull customAzkar — merge by id, prefer remote if conflict
      if (Array.isArray(remote.customAzkar)) {
        const { customAzkar: localCustom = [] } = await chrome.storage.local.get("customAzkar");
        const byId = new Map();
        for (const item of localCustom) byId.set(item.id, item);
        for (const item of remote.customAzkar) byId.set(item.id, item);
        updates.customAzkar = Array.from(byId.values()).slice(-100);
      }

      if (Object.keys(updates).length > 0) {
        await chrome.storage.local.set(updates);
      }

      await chrome.storage.local.set({
        lastSyncAt: Date.now(),
        lastSyncStatus: "ok"
      });
      return { ok: true, updated: Object.keys(updates).length };
    } catch (err) {
      console.warn("[Sakeena] Sync pull failed:", err.message);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Schedule a debounced sync push.
   * Called on every storage change to syncable keys.
   */
  function schedulePush() {
    if (pendingWriteTimer) clearTimeout(pendingWriteTimer);
    pendingWriteTimer = setTimeout(() => {
      pendingWriteTimer = null;
      pushToSync();
    }, PENDING_DELAY_MS);
  }

  /**
   * Initialize sync — pulls on startup, then sets up auto-push.
   */
  async function init() {
    if (!chrome.storage.sync) return;

    const { prefs } = await chrome.storage.local.get("prefs");
    if (prefs?.syncEnabled === false) return; // user opted out

    await pullFromSync();

    // Listen to local changes; push if any sync key changed
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      const touched = Object.keys(changes).some(k => SYNC_KEYS.includes(k));
      if (touched) schedulePush();
    });

    // Listen to remote sync changes; pull them in
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      // Avoid loop: only pull if change came from another device
      // (Chrome doesn't tell us, so we just refresh on remote changes)
      pullFromSync();
    });
  }

  return { init, pushToSync, pullFromSync };
})();

if (typeof self !== "undefined") self.SyncManager = SyncManager;
if (typeof globalThis !== "undefined") globalThis.SyncManager = SyncManager;
