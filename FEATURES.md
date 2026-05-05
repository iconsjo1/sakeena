# Sakeena — Features Checklist

> Authoritative status of all features across shipped versions and the planned roadmap.
> Last updated: v1.4

---

## 📊 Summary

| Metric | Count |
| --- | --- |
| Features shipped | **47** |
| Features planned | **8** |
| Du'as in database | **73** |
| Ahadith in database | **12** |
| English translations | **34** |
| Categories | **17** |
| Themes | **5** |
| Supported browsers | Chrome, Edge, Brave, Arc, Firefox |

---

## ✅ v1.0 — Foundation (shipped)

### Architecture
- [x] Manifest V3 cross-browser (Chrome + Firefox via `browser_specific_settings`)
- [x] Closed Shadow DOM overlay (zero CSS conflicts with host page)
- [x] Service-worker-resilient scheduling via `chrome.alarms`
- [x] Web Accessible Resources properly scoped

### Smart Scheduler
- [x] Random interval within configurable range (default 3–10 min)
- [x] Per-zikr cooldown (default 2 min)
- [x] Reschedules itself after every show

### Context Awareness
- [x] Time-of-day detection (morning / evening / night)
- [x] Quiet domains (Docs, Meet, Zoom — no zikr at all)
- [x] Minimal-mode domains (YouTube, Netflix — short tasbih only)
- [x] Idle / locked-screen detection

### Anti-Spam
- [x] Same-zikr-twice block
- [x] 5-zikr sliding window (no recent repeats)
- [x] Activity-aware deferral (defers up to 2.5s if user is typing/scrolling)

### UI
- [x] Floating overlay (bottom-right) with auto-dismiss + progress bar
- [x] Pause-on-hover
- [x] Optional pulse animation
- [x] Optional soft chime (Web Audio API, off by default)
- [x] Popup: enable toggle + stats + "show now" button
- [x] Options page: intervals, behaviour toggles, domain lists

### Stats
- [x] Total shown
- [x] Total viewed
- [x] Total dismissed
- [x] Read rate %

### Performance
- [x] Content script: 4.8 KB
- [x] Zero idle CPU (listeners attached only when active)
- [x] Zero DOM observation (no MutationObserver / polling)
- [x] Compositor layer for overlay (no host page repaint)
- [x] Hidden tabs: skipped entirely
- [x] `prefers-reduced-motion` respected

---

## ✅ v1.1 — Hijri awareness, streak, themes (shipped)

### Hijri Engine
- [x] Local Gregorian → Hijri conversion (Kuwaiti algorithm + Umm al-Qura calibration)
- [x] No internet required for date conversion
- [x] Day-of-week detection (Arabic names)
- [x] Hijri month names (Arabic)

### Hijri Occasions
- [x] Friday → boosted صلاة على النبي ﷺ
- [x] Ramadan → general Ramadan du'as
- [x] Iftar window (Ramadan, ~17:00–20:00 local)
- [x] First 10 of Dhul-Hijjah → التكبير المطلق
- [x] Last 10 nights of Ramadan (odd nights, after 20:00) → Laylat al-Qadr

### Streak System
- [x] Daily engagement streak (counts a day when user *views* a zikr)
- [x] Longest streak tracking
- [x] Auto-reset when a day is missed
- [x] Silent milestone celebrations: 3 → 7 → 14 → 30 → 60 → 100 → 365
- [x] Gold milestone card after the triggering zikr fades
- [x] Progress-to-next-milestone bar in popup

### Themes
- [x] **Emerald** — deep Islamic green + gold (default)
- [x] **Sepia** — warm parchment, like an old kitab
- [x] **Midnight** — deep blue, calm for evening
- [x] **High Contrast** — black + gold for accessibility
- [x] **Auto** — follows OS `prefers-color-scheme`

### Popup additions
- [x] Hijri date + day name display
- [x] Active occasion banner (Friday, Ramadan, etc.)
- [x] Theme picker chips
- [x] Streak card with progress bar

---

## ✅ v1.2 — Custom du'a + sadaqah credit (shipped — current)

### Custom Du'a Manager
- [x] Add personal du'as (up to 100, 500 chars each)
- [x] Per-du'a category selector (Du'a / Light / Focus / Morning / Evening)
- [x] Per-du'a weight selector (Normal / Medium / High)
- [x] Delete with confirmation
- [x] Stored locally only (`chrome.storage.local`)
- [x] Merged into picker rotation alongside built-in azkar

### Du'a Category
- [x] 9 widely-known du'as (Rabbana atina, ihdina, etc.)
- [x] Included as a regular candidate in non-minimal mode

### Sadaqah Credit
- [x] Banner in options page header (gold gradient)
- [x] Compact card in popup footer
- [x] Section in README with developer name
- [x] Optional rotating du'a for the developer (low weight)

---

## ✅ v1.3 — Adaptive intelligence (shipped — current)

### Adaptive Frequency
- [x] Tracks dismiss rate after first 10 shown azkar
- [x] Multiplier formula: `1 + dismissRate × 0.8`
- [x] Range: 1.0× (always read) → 1.8× (always dismiss)
- [x] Self-corrects automatically without user action

### Bilingual Mode
- [x] English translations for 21 core azkar
- [x] Toggle in options ("show translation under text")
- [x] Translation appears under Arabic with LTR direction
- [x] Subtle separator border between Arabic and English

### Snooze
- [x] Three buttons in overlay footer: 15 min / 1 hr / today
- [x] Visual confirmation (✓) before dismiss
- [x] Banner in popup when snooze is active
- [x] One-click "إلغاء" to clear snooze
- [x] Snooze persists across browser restarts

### Do Not Disturb (DND)
- [x] Scheduled quiet hours (e.g., 23:00 → 06:00)
- [x] Cross-midnight time windows supported
- [x] Per-day-of-week chips (toggle Sun–Sat)
- [x] Master toggle to enable/disable schedule

### Import / Export
- [x] Export all custom azkar to JSON (`sakeena-azkar-{date}.json`)
- [x] Import JSON with merge OR replace options
- [x] Validates incoming data (text length, valid categories, valid weights)
- [x] Generates new IDs to prevent collisions
- [x] File-share-ready for spreading the sadaqah

---

## ✅ v1.4 — Context engine (shipped — current)

### Page Context Analyzer
- [x] Reads URL hostname + page title + meta description (never page body)
- [x] Pattern matches against 6 contextual rule sets
- [x] Privacy-respecting: runs only when triggered, sends nothing externally
- [x] Travel detection (Booking, Airbnb, Skyscanner, Maps, airline domains)
- [x] Healing detection (WebMD, Mayo Clinic, NIH, hospital/clinic domains)
- [x] Success detection (LinkedIn, Indeed, education domains, exam keywords)
- [x] Rizq detection (banking, e-commerce, freelance platforms)
- [x] Ummah detection (news domains + conflict-zone keywords in AR + EN)
- [x] Anxiety detection (mental-health subreddits + stress keywords)

### New Du'a Categories
- [x] Travel (4 du'as) — دعاء الركوب، التوكّل، تيسير السفر
- [x] Healing (3 du'as) — دعاء الشفاء النبوي + للأمة
- [x] Success / Tawfiq (4 du'as) — للمقابلات والامتحانات والمشاريع
- [x] Rizq (3 du'as) — دعاء الرزق الحلال
- [x] Ummah (4 du'as) — للمستضعفين، الشهداء، الأقصى
- [x] Anxiety (3 du'as) — دعاء الكرب، حسبي الله

### Hadith Mode
- [x] 12 authentic ahadith with source + narrator
- [x] Toggle in options
- [x] Configurable frequency (1 in N items)
- [x] Distinct visual styling (blue badge instead of gold)
- [x] Source displayed in badge ("حديث · متفق عليه")
- [x] Narrator displayed below text

### Friday extras
- [x] Surat al-Kahf reminder added to Friday rotation

---

## 🔵 v1.5 — Audio + sync (up next)

- [ ] Optional recitation audio (high-quality reciter, opt-in)
- [ ] `chrome.storage.sync` — settings + streak across devices
- [ ] Manual backup / restore (export entire state to JSON)

---

## ⚪ v2.0 — Public release (planned)

### Internationalization
- [ ] Full `_locales/` setup (Arabic + English UI)
- [ ] User-selectable UI language

### Accessibility
- [ ] Full ARIA audit
- [ ] Keyboard navigation for overlay
- [ ] Screen-reader-friendly streak/stats announcements

### Distribution
- [ ] Privacy policy page (no data collection statement)
- [ ] Landing page (sakeena.iconsjo.com)
- [ ] Chrome Web Store listing
- [ ] Firefox AMO signed build
- [ ] Open-source release on GitHub
- [ ] Contribution guide (how to add azkar with proper sourcing)

---

## 🤲 Project intent

This is **صدقة جارية** — a continuous charity offered for the sake of Allah by **Abdul-Fattah** and the Sakeena contributors. No fees, no telemetry, no servers, no ads. The only ask: a du'a for the developers and their parents.

---

*To update this checklist: edit `FEATURES.md` in the extension root and bump versions as features ship.*
