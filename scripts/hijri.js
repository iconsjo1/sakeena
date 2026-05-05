/**
 * Sakeena — Hijri date utilities
 * Self-contained Umm al-Qura-style conversion using the standard
 * Kuwaiti algorithm. Accurate to ±1 day vs official sightings —
 * suitable for daily-zikr context, not for fiqh-critical timing.
 *
 * Exports a single object: HijriUtils
 */

const HijriUtils = (() => {

  /**
   * Gregorian → Hijri conversion.
   * Algorithm from Fliegel & Van Flandern (Kuwaiti algorithm).
   * Returns { year, month (1-12), day (1-30) }.
   */
  function gregorianToHijri(date) {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    let jd;
    if ((year > 1582) ||
        (year === 1582 && month > 10) ||
        (year === 1582 && month === 10 && day > 14)) {
      jd = Math.floor((1461 * (year + 4800 + Math.floor((month - 14) / 12))) / 4) +
           Math.floor((367 * (month - 2 - 12 * Math.floor((month - 14) / 12))) / 12) -
           Math.floor((3 * Math.floor((year + 4900 + Math.floor((month - 14) / 12)) / 100)) / 4) +
           day - 32075;
    } else {
      jd = 367 * year - Math.floor((7 * (year + 5001 + Math.floor((month - 9) / 7))) / 4) +
           Math.floor((275 * month) / 9) + day + 1729777;
    }

    // Correction factor: Kuwaiti algorithm tends to run ~2 days ahead of
    // Umm al-Qura observed dates. Subtracting 2 brings us closer in practice.
    jd -= 2;

    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j = (Math.floor((10985 - l2) / 5316)) * (Math.floor((50 * l2) / 17719)) +
              (Math.floor(l2 / 5670)) * (Math.floor((43 * l2) / 15238));
    const l3 = l2 - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) -
               (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
    const hMonth = Math.floor((24 * l3) / 709);
    const hDay = l3 - Math.floor((709 * hMonth) / 24);
    const hYear = 30 * n + j - 30;

    return { year: hYear, month: hMonth, day: hDay };
  }

  const MONTHS_AR = [
    "محرّم", "صفر", "ربيع الأول", "ربيع الآخر",
    "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
    "رمضان", "شوّال", "ذو القعدة", "ذو الحجة"
  ];

  const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  function formatHijri(h) {
    return `${h.day} ${MONTHS_AR[h.month - 1]} ${h.year}هـ`;
  }

  /**
   * Get the active "occasion" for a given date.
   * Returns one of: "friday", "ramadan", "iftar", "dhulHijjah",
   *                 "laylatAlQadr", or null.
   * Multiple may apply — return them in priority order.
   */
  function getOccasion(date = new Date()) {
    const d = new Date(date);
    const dow = d.getDay(); // 0=Sun ... 5=Fri
    const hour = d.getHours();
    const h = gregorianToHijri(d);

    const occasions = [];

    // Laylat al-Qadr: odd nights of last 10 of Ramadan (21,23,25,27,29)
    if (h.month === 9 && h.day >= 21 && h.day % 2 === 1 && hour >= 20) {
      occasions.push({ key: "laylatAlQadr", weight: 10 });
    }

    // Iftar window: Ramadan, ~17:00–19:00 local (rough sunset proxy)
    // Note: exact sunset would need geolocation. For now we use a window.
    if (h.month === 9 && hour >= 17 && hour < 20) {
      occasions.push({ key: "iftar", weight: 8 });
    }

    // Ramadan in general
    if (h.month === 9) {
      occasions.push({ key: "ramadan", weight: 6 });
    }

    // First 10 of Dhul-Hijjah
    if (h.month === 12 && h.day >= 1 && h.day <= 10) {
      occasions.push({ key: "dhulHijjah", weight: 7 });
    }

    // Friday (in Islamic calendar the day starts at maghrib, but for
    // a browser zikr extension matching civil Friday is what users expect)
    if (dow === 5) {
      occasions.push({ key: "friday", weight: 5 });
    }

    return occasions;
  }

  function dayName(date = new Date()) {
    return DAYS_AR[new Date(date).getDay()];
  }

  return {
    gregorianToHijri,
    formatHijri,
    getOccasion,
    dayName,
    MONTHS_AR,
    DAYS_AR
  };
})();

// Make available in service-worker module scope and content scripts
if (typeof self !== "undefined") self.HijriUtils = HijriUtils;
if (typeof globalThis !== "undefined") globalThis.HijriUtils = HijriUtils;
