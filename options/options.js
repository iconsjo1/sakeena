const api = typeof browser === 'undefined' ? chrome : browser;

const DEFAULT_PREFS = {
  enabled: true,
  minIntervalMin: 3,
  maxIntervalMin: 10,
  cooldownMin: 2,
  soundEnabled: false,
  vibrationAnimation: true,
  autoDismissSec: 12,
  respectIdle: true,
  pauseDuringTyping: true,
  quietDomains: ['docs.google.com', 'meet.google.com', 'zoom.us'],
  minimalDomains: ['youtube.com', 'netflix.com', 'twitch.tv'],
  historyLimit: 30,
  theme: 'emerald',
  hijriAwareness: true,
  showStreak: true,
  adaptiveFrequency: true,
  showTranslation: false,
  language: 'ar',
  position: 'bottom-right',
  dndEnabled: false,
  dndStart: '23:00',
  dndEnd: '06:00',
  dndDays: [0, 1, 2, 3, 4, 5, 6],
  snoozeUntil: 0,
  contextAware: true,
  hadithMode: false,
  hadithFrequency: 5,
  syncEnabled: true,
  ttsEnabled: false,
  ttsRate: 0.85,
  ttsVolume: 0.6,
};

const $ = (id) => document.getElementById(id);

const rangeFields = [
  ['minInterval', 'minIntervalVal', 'minIntervalMin'],
  ['maxInterval', 'maxIntervalVal', 'maxIntervalMin'],
  ['cooldown', 'cooldownVal', 'cooldownMin'],
  ['autoDismiss', 'autoDismissVal', 'autoDismissSec'],
  ['ttsRate', 'ttsRateVal', 'ttsRate', true],
  ['ttsVolume', 'ttsVolumeVal', 'ttsVolume', true],
];

const checkFields = [
  ['contextAware', 'contextAware'],
  ['adaptiveFrequency', 'adaptiveFrequency'],
  ['hijriAwareness', 'hijriAwareness'],
  ['hadithMode', 'hadithMode'],
  ['showTranslation', 'showTranslation'],
  ['respectIdle', 'respectIdle'],
  ['pauseDuringTyping', 'pauseDuringTyping'],
  ['vibrationAnimation', 'vibrationAnimation'],
  ['soundEnabled', 'soundEnabled'],
  ['showStreak', 'showStreak'],
  ['syncEnabled', 'syncEnabled'],
  ['ttsEnabled', 'ttsEnabled'],
  ['dndEnabled', 'dndEnabled'],
];

const CATEGORY_LABELS = {
  dua: 'أدعية',
  light: 'خفيفة',
  focus: 'للتركيز',
  morning: 'الصباح',
  evening: 'المساء',
};

const WEIGHT_LABELS = {
  1: 'عادية',
  3: 'متوسطة',
  5: 'عالية',
};

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function flash(msg) {
  const el = $('savedMsg');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

function parseDomains(text) {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function handleDeleteAzkar(id) {
  if (!confirm('حذف هذا الذكر؟')) return;
  const { customAzkar = [] } = await api.storage.local.get('customAzkar');
  const filtered = customAzkar.filter((z) => z.id !== id);
  await api.storage.local.set({ customAzkar: filtered });
  loadCustomAzkar();
  flash('تم الحذف');
}

async function loadCustomAzkar() {
  const { customAzkar = [] } = await api.storage.local.get('customAzkar');
  const list = $('customList');

  if (customAzkar.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'لم تُضِف أذكارًا بعد';
    list.textContent = '';
    list.appendChild(empty);
    return;
  }

  list.textContent = '';
  customAzkar.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'custom-item';
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(`
      <div style="flex: 1;">
        <div class="custom-item-text">${escapeHtml(item.text)}</div>
        <div class="custom-item-meta">
          <span class="custom-item-tag">${escapeHtml(CATEGORY_LABELS[item.category] || item.category)}</span>
          <span class="custom-item-tag">أهمية: ${escapeHtml(WEIGHT_LABELS[item.weight] || item.weight)}</span>
        </div>
      </div>
      <button class="custom-delete" data-id="${item.id}" aria-label="حذف">×</button>
    `, 'text/html');
    
    while (doc.body.firstChild) {
      div.appendChild(doc.body.firstChild);
    }
    list.appendChild(div);
  });

  list.querySelectorAll('.custom-delete').forEach((btn) => {
    btn.addEventListener('click', () => handleDeleteAzkar(btn.dataset.id));
  });
}

async function load() {
  const { prefs = {} } = await api.storage.local.get('prefs');
  const p = { ...DEFAULT_PREFS, ...prefs };

  for (const field of rangeFields) {
    const [inputId, valId, prefKey, isFloat] = field;
    $(inputId).value = p[prefKey];
    $(valId).textContent = isFloat ? Number(p[prefKey]).toFixed(2) : p[prefKey];
    $(inputId).addEventListener('input', (e) => {
      $(valId).textContent = isFloat ? Number(e.target.value).toFixed(2) : e.target.value;
    });
  }

  for (const [inputId, prefKey] of checkFields) {
    $(inputId).checked = !!p[prefKey];
  }

  $('quietDomains').value = (p.quietDomains || []).join('\n');
  $('minimalDomains').value = (p.minimalDomains || []).join('\n');
  $('languageSelect').value = p.language || 'ar';
  $('positionSelect').value = p.position || 'bottom-right';

  $('dndStart').value = p.dndStart || '23:00';
  $('dndEnd').value = p.dndEnd || '06:00';

  SakeenaI18n.translatePage(p.language || 'ar');

  const activeDays = p.dndDays || [0, 1, 2, 3, 4, 5, 6];
  document.querySelectorAll('.dnd-day').forEach((btn) => {
    const day = Number.parseInt(btn.dataset.day, 10);
    btn.classList.toggle('active', activeDays.includes(day));
  });
}

async function save() {
  const { prefs = {} } = await api.storage.local.get('prefs');
  const updated = { ...DEFAULT_PREFS, ...prefs };

  for (const field of rangeFields) {
    const [inputId, , prefKey, isFloat] = field;
    updated[prefKey] = isFloat ? Number.parseFloat($(inputId).value) : Number.parseInt($(inputId).value, 10);
  }

  if (updated.maxIntervalMin <= updated.minIntervalMin) {
    updated.maxIntervalMin = updated.minIntervalMin + 1;
  }

  for (const [inputId, prefKey] of checkFields) {
    updated[prefKey] = $(inputId).checked;
  }

  updated.quietDomains = parseDomains($('quietDomains').value);
  updated.minimalDomains = parseDomains($('minimalDomains').value);
  updated.language = $('languageSelect').value || 'ar';
  updated.position = $('positionSelect').value || 'bottom-right';

  updated.dndStart = $('dndStart').value || '23:00';
  updated.dndEnd = $('dndEnd').value || '06:00';
  updated.dndDays = Array.from(document.querySelectorAll('.dnd-day.active')).map((btn) =>
    Number.parseInt(btn.dataset.day, 10),
  );

  await api.storage.local.set({ prefs: updated });
  SakeenaI18n.translatePage(updated.language);
  flash(SakeenaI18n.getMessage(updated.language, 'saved'));
}

$('saveBtn').addEventListener('click', save);

$('resetBtn').addEventListener('click', async () => {
  const { prefs = {} } = await api.storage.local.get('prefs');
  const language = prefs.language || 'ar';
  if (!confirm(SakeenaI18n.getMessage(language, 'resetConfirm'))) return;

  await api.storage.local.set({ prefs: DEFAULT_PREFS });
  await load();
  flash(SakeenaI18n.getMessage(language, 'resetSaved'));
});

$('privacyBtn').addEventListener('click', () => {
  api.tabs.create({ url: '../privacy.html' });
});

$('libraryBtn').addEventListener('click', () => {
  api.tabs.create({ url: '../library/library.html' });
});

$('addCustomBtn').addEventListener('click', async () => {
  const text = $('customText').value.trim();
  const category = $('customCategory').value;
  const weight = Number.parseInt($('customWeight').value, 10);

  if (!text) {
    $('customText').focus();
    return;
  }

  if (text.length > 500) {
    alert('النص طويل جدًا (الحد الأقصى 500 حرف)');
    return;
  }

  const { customAzkar = [] } = await api.storage.local.get('customAzkar');

  if (customAzkar.length >= 100) {
    alert('الحد الأقصى 100 ذكر مخصص');
    return;
  }

  const newItem = {
    id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6),
    text,
    category,
    weight,
    createdAt: Date.now(),
  };

  customAzkar.push(newItem);
  await api.storage.local.set({ customAzkar });

  $('customText').value = '';
  loadCustomAzkar();
  flash('أُضيف بنجاح');
});

document.querySelectorAll('.dnd-day').forEach((btn) => {
  btn.addEventListener('click', () => btn.classList.toggle('active'));
});

$('exportBtn').addEventListener('click', async () => {
  const { customAzkar = [] } = await api.storage.local.get('customAzkar');
  if (customAzkar.length === 0) {
    alert('لا توجد أذكار مخصصة لتصديرها');
    return;
  }

  const exportData = {
    app: 'Sakeena',
    version: '1.3.0',
    exportedAt: new Date().toISOString(),
    azkar: customAzkar.map((z) => ({
      text: z.text,
      category: z.category,
      weight: z.weight,
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = new Date().toISOString().slice(0, 10);
  a.download = `sakeena-azkar-${today}.json`;
  a.click();
  URL.revokeObjectURL(url);
  flash(`تم تصدير ${customAzkar.length} ذكر`);
});

$('importBtn').addEventListener('click', () => $('importFile').click());

$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const textFileContent = await file.text();
    const data = JSON.parse(textFileContent);

    if (!data.azkar || !Array.isArray(data.azkar)) {
      throw new Error('ملف غير صالح — لا يحتوي على قائمة أذكار');
    }

    const validCategories = new Set(['dua', 'light', 'focus', 'morning', 'evening']);
    const imported = data.azkar
      .filter((z) => z.text && typeof z.text === 'string' && z.text.trim().length > 0)
      .map((z) => ({
        id: 'c' + Date.now() + Math.random().toString(36).slice(2, 8),
        text: z.text.slice(0, 500).trim(),
        category: validCategories.has(z.category) ? z.category : 'dua',
        weight: [1, 3, 5].includes(z.weight) ? z.weight : 3,
        createdAt: Date.now(),
      }));

    if (imported.length === 0) {
      alert('لم يتم العثور على أذكار صالحة في الملف');
      return;
    }

    const choice = confirm(
      `وُجد ${imported.length} ذكر في الملف.\n\n` +
        `[OK] = إضافتهم لقائمتك الحالية\n` +
        `[Cancel] = استبدال قائمتك الحالية بالكامل`,
    );

    const { customAzkar = [] } = await api.storage.local.get('customAzkar');
    let merged;
    if (choice) {
      merged = [...customAzkar, ...imported].slice(0, 100);
    } else {
      if (!confirm('هل أنت متأكد من استبدال جميع الأذكار الحالية؟')) return;
      merged = imported.slice(0, 100);
    }

    await api.storage.local.set({ customAzkar: merged });
    loadCustomAzkar();
    flash(`تم استيراد ${imported.length} ذكر`);
  } catch (err) {
    alert('خطأ في استيراد الملف: ' + err.message);
  } finally {
    e.target.value = '';
  }
});

await load();
await loadCustomAzkar();