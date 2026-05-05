/**
 * Sakeena — Streak Engine
 * Tracks "engagement days" without nagging. A day counts as "engaged" if
 * the user views (not dismisses) at least one zikr.
 *
 * Storage shape (in chrome.storage.local):
 *   streak: {
 *     current: number,
 *     longest: number,
 *     lastEngagedDay: "YYYY-MM-DD",     // local date string
 *     totalDays: number,                 // lifetime count
 *     awardedMilestones: [3, 7, ...]     // already-shown milestones
 *   }
 */

const StreakEngine = (() => {

  function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function dayDiff(aKey, bKey) {
    const a = new Date(aKey + "T00:00:00");
    const b = new Date(bKey + "T00:00:00");
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  }

  /**
   * Call this when the user actually engages (views a zikr).
   * Returns { current, longest, milestoneJustHit } — milestoneJustHit is
   * the milestone number if one was crossed in this call, else null.
   */
  function recordEngagement(streak) {
    const today = todayKey();
    const s = streak || {
      current: 0,
      longest: 0,
      lastEngagedDay: null,
      totalDays: 0,
      awardedMilestones: []
    };

    if (s.lastEngagedDay === today) {
      // Already counted today — no change
      return { streak: s, milestoneJustHit: null };
    }

    if (s.lastEngagedDay) {
      const gap = dayDiff(s.lastEngagedDay, today);
      if (gap === 1) {
        s.current += 1;
      } else if (gap > 1) {
        // Missed at least one day → streak resets
        s.current = 1;
      } else {
        // Same day or backwards (clock skew) — defensive
        s.current = Math.max(1, s.current);
      }
    } else {
      s.current = 1;
    }

    s.lastEngagedDay = today;
    s.longest = Math.max(s.longest, s.current);
    s.totalDays += 1;

    // Check for milestone crossing
    const milestones = [3, 7, 14, 30, 60, 100, 365];
    let milestoneJustHit = null;
    for (const m of milestones) {
      if (s.current === m && !s.awardedMilestones.includes(m)) {
        s.awardedMilestones.push(m);
        milestoneJustHit = m;
        break;
      }
    }

    return { streak: s, milestoneJustHit };
  }

  /**
   * Call this on each scheduling check to detect a broken streak even
   * when the user hasn't engaged. If the last engaged day is older than
   * 1 day from today, current streak resets to 0.
   */
  function reconcile(streak) {
    if (!streak || !streak.lastEngagedDay) return streak;
    const gap = dayDiff(streak.lastEngagedDay, todayKey());
    if (gap > 1 && streak.current > 0) {
      streak.current = 0;
    }
    return streak;
  }

  return { recordEngagement, reconcile, todayKey };
})();

if (typeof self !== "undefined") self.StreakEngine = StreakEngine;
if (typeof globalThis !== "undefined") globalThis.StreakEngine = StreakEngine;
