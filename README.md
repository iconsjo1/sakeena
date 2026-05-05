# Sakeena — سكينة (v1.2)

> Smart Islamic remembrance for your browser. Now with custom du'a support.
> تذكير ذكي بالأذكار — يفهم الزمن الهجري، يحترم تركيزك، ولا يزعجك.

A privacy-first, calm, context-aware browser extension that delivers Islamic remembrances at the right moment.

## 🤲 صدقة جارية

> هذا العمل مجاني — صدقة جارية لوجه الله تعالى، أُهدي ثوابه لوالديّ ولكل المسلمين.
> أخوكم: **عبد الفتاح** — لا تنسوني من صالح دعائكم.

This is a free work — offered as **صدقة جارية (continuous charity)** by **Abdul-Fattah** for the sake of Allah. Please keep us in your du'a — no fees, no telemetry, no tracking, no ads, no servers. Only the hope of accepted intention.

---

## ✨ What's new in v1.2

### 📿 Custom Azkar & Du'a Manager
You can now add your own personal du'as inside the extension:

- **Personal du'as** — for parents, loved ones, deceased relatives
- **Cause-specific** — du'a for Palestine, the ummah, ill family
- **Categorize** them into: Du'a / Light / Focus / Morning / Evening
- **Weight** them — high importance items appear more often
- **Stored locally** — never sent anywhere
- Up to 100 custom items

### 🆕 Du'a category
A built-in category of 9 widely-known du'as is now in rotation alongside the lighter dhikr.

---

## 🕌 Hijri-Aware Intelligence (from v1.1)
The extension knows the Islamic date and adapts:

- **Friday** → boosts صلاة على النبي ﷺ
- **Ramadan** → دعاء "اللهم إنك عفو كريم..." + أذكار الإفطار في الـ 17:00–20:00
- **First 10 of Dhul-Hijjah** → التكبير المطلق
- **Last 10 nights of Ramadan (odd nights)** → ليلة القدر mode
- All conversion is **local** (no internet required)

## 🔥 Streak System (from v1.1)
Daily streak counter with silent milestones at 3 → 7 → 14 → 30 → 60 → 100 → 365 days.

## 🎨 Themes (from v1.1)
Emerald · Sepia · Midnight · High Contrast · Auto

---

## 🧠 The full intelligence stack

| Layer | What it does |
| --- | --- |
| **Time-of-day** | Morning / evening / night categories auto-activate |
| **Hijri occasion** | Friday / Ramadan / Dhul-Hijjah / Iftar / Laylat al-Qadr |
| **Domain context** | Quiet on Docs/Meet/Zoom; minimal mode on YouTube/Netflix |
| **Idle detection** | Pauses on locked screen; offers reconnection azkar after long idle |
| **Activity gate** | Defers if you're typing/scrolling |
| **Anti-repeat** | 5-zikr sliding window + same-zikr-twice block |
| **Cooldown** | Configurable minimum gap between azkar |
| **Engagement** | Tracks viewed vs dismissed; feeds streak |

---

## 📁 Project structure

```
azkar-extension/
├── manifest.json
├── data/
│   └── azkar.json             ← 42 azkar across 10 categories
├── scripts/
│   ├── background.js          ← service worker: scheduling + picking
│   ├── content.js             ← overlay injection + activity tracking
│   ├── hijri.js               ← Gregorian↔Hijri + occasion detection
│   └── streak.js              ← daily engagement streak engine
├── overlay/
│   └── overlay.css            ← 4 themes via CSS variables
├── popup/
│   ├── popup.html             ← Hijri date + streak + theme picker
│   ├── popup.css
│   └── popup.js
├── options/
│   ├── options.html           ← advanced preferences
│   ├── options.css
│   └── options.js
└── icons/
    └── icon{16,32,48,128}.png
```

**Total content script size: 4.8 KB** — zero idle CPU.

---

## 🚀 Installation

### Chrome / Edge / Brave / Arc
1. `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `azkar-extension` folder

### Firefox
1. `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…** → select `manifest.json`

---

## 🔬 Performance characteristics

- **Idle CPU**: 0%
- **Idle event listeners**: 0 (attached only when overlay is about to show)
- **Idle DOM mutations**: 0
- **Memory per tab**: ~5 KB
- **Network requests**: 0 (everything is local — even Hijri conversion)
- **Compositor layer**: separate (no host page repaints)
- **Hidden tab handling**: skipped entirely
- **Style isolation**: closed Shadow DOM (host CSS cannot affect, and vice versa)

---

## 🛣️ Roadmap

### v1.2 (planned)
- [ ] Adaptive frequency (learns from your dismiss rate)
- [ ] Custom azkar manager (add personal duas)
- [ ] Bilingual mode (Arabic + English translations)

### v1.3+
- [ ] High-quality recitation audio (optional)
- [ ] Du'a suggestions based on page context (travel, work, medical)
- [ ] Hadith of the day mode
- [ ] Cross-device sync via `chrome.storage.sync`
- [ ] Webstore publication (Chrome + Firefox AMO)

---

## 🤲 Intent

This extension is offered as **صدقة جارية** — a continuous charity. If it helps even one person remember their Lord more often during their workday, that is the entire reward sought.

Suggestions, corrections to azkar wording, and additional categories are welcome.

**Made with ♥ in Amman, Jordan** — by Icon Software (iconsjo.com)
