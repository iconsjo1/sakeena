const api = typeof browser !== "undefined" ? browser : chrome;
const $ = (id) => document.getElementById(id);

const CATEGORY_LABELS = {
  dua: "أدعية مأثورة",
  morning: "الصباح",
  evening: "المساء",
  light: "خفيفة",
  focus: "للتركيز",
  afterIdle: "بعد انقطاع",
  night: "الليل",
  friday: "الجمعة",
  ramadan: "رمضان",
  dhulHijjah: "ذو الحجة",
  laylatAlQadr: "ليلة القدر",
  quranic: "قرآنية",
  travel: "السفر",
  healing: "الشفاء",
  success: "التوفيق",
  rizq: "الرزق",
  ummah: "للأمة",
  anxiety: "للقلق",
  hadith: "أحاديث",
  milestone: "إنجازات"
};

function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayKeyLocal(timestamp) {
  return dayKey(new Date(timestamp));
}

function fmtRelative(ts) {
  if (!ts) return "—";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "قبل لحظات";
  if (sec < 3600) return `قبل ${Math.floor(sec/60)} دقيقة`;
  if (sec < 86400) return `قبل ${Math.floor(sec/3600)} ساعة`;
  return `قبل ${Math.floor(sec/86400)} يوم`;
}

async function loadStats() {
  const data = await api.storage.local.get(null);
  const stats = data.stats || { shown: 0, viewed: 0, dismissed: 0 };
  const streak = data.streak || { current: 0, longest: 0, totalDays: 0 };
  const history = data.history || [];

  // ===== Hero metrics =====
  $("metricStreak").textContent = streak.current || 0;
  $("metricStreakSub").textContent = streak.longest > 0
    ? `أطول: ${streak.longest} يومًا`
    : "ابدأ بقراءة ذكر اليوم";

  $("metricTotal").textContent = stats.shown || 0;
  $("metricRead").textContent = stats.viewed || 0;
  const ratio = stats.shown > 0
    ? Math.round((stats.viewed / stats.shown) * 100)
    : 0;
  $("metricReadRatio").textContent = stats.shown > 0 ? `${ratio}% معدل القراءة` : "—";

  $("metricDays").textContent = streak.totalDays || 0;
  $("metricLongest").textContent = streak.longest > 0
    ? `أطول صحبة: ${streak.longest} يومًا`
    : "—";

  // ===== Hijri date =====
  if (typeof HijriUtils !== "undefined") {
    const h = HijriUtils.gregorianToHijri(new Date());
    $("hijriToday").textContent = `${HijriUtils.dayName()} · ${HijriUtils.formatHijri(h)}`;
  }

  // ===== Category breakdown =====
  if (history.length === 0) {
    $("catBars").innerHTML = '<div class="empty-state">لم تظهر أذكار بعد</div>';
  } else {
    const counts = {};
    for (const h of history) {
      counts[h.category] = (counts[h.category] || 0) + 1;
    }
    const max = Math.max(...Object.values(counts));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    $("catBars").innerHTML = sorted.map(([cat, count]) => {
      const pct = Math.round((count / max) * 100);
      const label = CATEGORY_LABELS[cat] || cat;
      return `
        <div class="cat-bar-row">
          <div class="cat-bar-label">${label}</div>
          <div class="cat-bar-track"><div class="cat-bar-fill" style="width: ${pct}%"></div></div>
          <div class="cat-bar-count">${count}</div>
        </div>
      `;
    }).join("");
  }

  // ===== Heatmap (last 30 days) =====
  const dayCounts = {};
  for (const h of history) {
    const k = dayKeyLocal(h.at);
    dayCounts[k] = (dayCounts[k] || 0) + 1;
  }

  const heatmap = $("heatmap");
  heatmap.innerHTML = "";
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = dayKey(d);
    const count = dayCounts[k] || 0;
    let level = 0;
    if (count >= 1) level = 1;
    if (count >= 3) level = 2;
    if (count >= 6) level = 3;
    if (count >= 10) level = 4;

    const cell = document.createElement("div");
    cell.className = `heat-cell heat-${level}`;
    cell.dataset.tip = `${k} · ${count} ذكر`;
    heatmap.appendChild(cell);
  }

  // ===== Sync status =====
  const lastSync = data.lastSyncAt;
  $("syncStatus").textContent = lastSync
    ? `آخر مزامنة: ${fmtRelative(lastSync)}`
    : "لم تتم المزامنة بعد";
}

// ===== Sync now =====
$("syncNowBtn").addEventListener("click", async () => {
  $("syncNowBtn").disabled = true;
  $("syncNowBtn").textContent = "جاري المزامنة...";
  const result = await api.runtime.sendMessage({ type: "SAKEENA_SYNC_NOW" });
  $("syncNowBtn").disabled = false;
  $("syncNowBtn").textContent = "مزامنة الآن";
  if (result?.ok) {
    $("syncStatus").textContent = "تمت المزامنة الآن ✓";
  } else {
    $("syncStatus").textContent = "فشلت المزامنة — المتصفح غير مسجّل دخول؟";
  }
});

// ===== Backup =====
$("backupBtn").addEventListener("click", async () => {
  const result = await api.runtime.sendMessage({ type: "SAKEENA_BACKUP" });
  if (!result?.ok) {
    alert("فشل تصدير النسخة الاحتياطية");
    return;
  }

  const blob = new Blob([JSON.stringify(result.backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sakeena-backup-${dayKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

$("restoreBtn").addEventListener("click", () => $("restoreFile").click());

$("restoreFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    if (backup.app !== "Sakeena") {
      alert("ملف غير صالح — هذا ليس backup سكينة");
      return;
    }
    if (!confirm(`استعادة نسخة من تاريخ ${(backup.exportedAt || "").slice(0, 10)}؟ سيتم استبدال كل البيانات الحالية.`)) {
      return;
    }

    const result = await api.runtime.sendMessage({ type: "SAKEENA_RESTORE", backup });
    if (result?.ok) {
      alert(`تمت الاستعادة بنجاح (${result.restored} عنصر)`);
      loadStats();
    } else {
      alert("فشل الاستعادة: " + (result?.error || "خطأ غير معروف"));
    }
  } catch (err) {
    alert("ملف غير صالح: " + err.message);
  } finally {
    e.target.value = "";
  }
});

// ===== Reset stats =====
$("resetStatsBtn").addEventListener("click", async () => {
  if (!confirm("إعادة عداد الأذكار المعروضة والمقروءة؟ (لن يتأثر streak أو الأدعية المخصصة)")) {
    return;
  }
  await api.storage.local.set({
    stats: { shown: 0, viewed: 0, dismissed: 0 },
    history: []
  });
  loadStats();
});

loadStats();
