const api = typeof browser !== "undefined" ? browser : chrome;

const $ = (id) => document.getElementById(id);

const OCCASION_LABELS = {
  friday: "🤲 يوم الجمعة — أكثر من الصلاة على النبي ﷺ",
  ramadan: "🌙 شهر رمضان المبارك",
  iftar: "🕌 وقت الإفطار",
  dhulHijjah: "🕋 العشر من ذي الحجة",
  laylatAlQadr: "✨ ليلة من العشر الأواخر"
};

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

function nextMilestone(current) {
  return STREAK_MILESTONES.find((m) => m > current) || null;
}

async function loadHijri() {
  try {
    const result = await api.runtime.sendMessage({ type: "SAKEENA_GET_HIJRI" });
    if (!result?.ok) return;

    $("hijriLine").textContent = `${result.dayName} · ${result.hijri}`;

    if (result.occasions?.length > 0) {
      // Show the highest-priority occasion
      const top = result.occasions.sort((a, b) => b.weight - a.weight)[0];
      const label = OCCASION_LABELS[top.key];
      if (label) {
        $("occasionBanner").textContent = label;
        $("occasionBanner").hidden = false;
      }
    }
  } catch (e) {
    console.debug("Hijri fetch failed:", e);
  }
}

async function loadState() {
  const data = await api.storage.local.get(["prefs", "stats", "streak"]);
  const prefs = data.prefs || {};
  const stats = data.stats || { shown: 0, viewed: 0, dismissed: 0 };
  const streak = data.streak || { current: 0, longest: 0 };

  // Toggle
  $("enableToggle").checked = prefs.enabled !== false;

  // Snooze status
  const now = Date.now();
  if (prefs.snoozeUntil && prefs.snoozeUntil > now) {
    const until = new Date(prefs.snoozeUntil);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const isEndOfDay = Math.abs(prefs.snoozeUntil - today.getTime()) < 60000;
    const text = isEndOfDay
      ? "نهاية اليوم"
      : until.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
    $("snoozeUntilText").textContent = text;
    $("snoozeStatus").hidden = false;
  } else {
    $("snoozeStatus").hidden = true;
  }

  // Stats
  $("statShown").textContent = stats.shown || 0;
  $("statViewed").textContent = stats.viewed || 0;
  const ratio = stats.shown > 0
    ? Math.round((stats.viewed / stats.shown) * 100) + "%"
    : "—";
  $("statRatio").textContent = ratio;

  // Streak
  $("streakCurrent").textContent = streak.current || 0;
  $("streakLongest").textContent = streak.longest || 0;

  // Streak progress to next milestone
  const next = nextMilestone(streak.current || 0);
  if (next && (streak.current || 0) > 0) {
    const prev = STREAK_MILESTONES.filter((m) => m <= streak.current).pop() || 0;
    const pct = Math.round(((streak.current - prev) / (next - prev)) * 100);
    $("streakProgress").hidden = false;
    $("streakProgress").style.setProperty("--streak-pct", pct + "%");
    $("streakProgressBar").style.setProperty("--streak-pct", pct + "%");
    $("streakNext").textContent = `${next - streak.current} يوم للمعلم القادم (${next})`;
    // Apply pct to the bar's pseudo-element via a CSS variable
    $("streakProgressBar").style.cssText = `--streak-pct: ${pct}%;`;
  }

  // Theme
  const activeTheme = prefs.theme || "emerald";
  document.querySelectorAll(".theme-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.theme === activeTheme);
  });
}

// Toggle
$("enableToggle").addEventListener("change", async (e) => {
  const { prefs = {} } = await api.storage.local.get("prefs");
  prefs.enabled = e.target.checked;
  await api.storage.local.set({ prefs });
});

// Theme picker
document.querySelectorAll(".theme-chip").forEach((chip) => {
  chip.addEventListener("click", async () => {
    const theme = chip.dataset.theme;
    const { prefs = {} } = await api.storage.local.get("prefs");
    prefs.theme = theme;
    await api.storage.local.set({ prefs });

    document.querySelectorAll(".theme-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
  });
});

// Test
$("testBtn").addEventListener("click", async () => {
  $("testBtn").disabled = true;
  await api.runtime.sendMessage({ type: "SAKEENA_TEST_SHOW" });
  setTimeout(() => { $("testBtn").disabled = false; window.close(); }, 200);
});

// Options
$("optionsBtn").addEventListener("click", () => api.runtime.openOptionsPage());

// Snooze clear
$("snoozeClear").addEventListener("click", async () => {
  const { prefs = {} } = await api.storage.local.get("prefs");
  prefs.snoozeUntil = 0;
  await api.storage.local.set({ prefs });
  $("snoozeStatus").hidden = true;
});

// Init
loadState();
loadHijri();
