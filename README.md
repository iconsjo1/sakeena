# Sakeena — سكينة (v1.5.0)

> Smart Islamic remembrance for your browser. Now with cross-device sync, audio recitation, and detailed activity analytics.
> تذكير ذكي بالأذكار — يفهم سياقك، يحترم تركيزك، ولا يزعجك.

A privacy-first, calm, context-aware browser extension that delivers Islamic remembrances at the right moment.

## 📊 Project Summary (v1.5)

| Metric | Count |
| --- | --- |
| Features shipped | **54** |
| Du'as in database | **127** |
| English translations | **127 (100%)** |
| Categories | **18** |
| Themes | **5** |
| Supported browsers | Chrome, Edge, Brave, Arc, Firefox |

## 📬 Contact & Feedback
- **GitHub**: [github.com/iconsjo1/sakeena](https://github.com/iconsjo1/sakeena)
- **Email**: [sakeena@iconsjo.com](mailto:sakeena@iconsjo.com)

---

## 🧠 The Intelligence Stack

Sakeena doesn't just show random popups. It uses a multi-layered intelligence engine to decide the *right* zikr for the *right* moment:

| Layer | What it does |
| --- | --- |
| **Page Context** | Analyzes URL/Title for Travel, Healing, Success, or Anxiety to pick relevant du'as. |
| **Time-of-Day** | Morning / Evening / Night categories auto-activate based on local time. |
| **Hijri Occasion** | Recognizes Friday, Ramadan, Iftar time, and the first 10 of Dhul-Hijjah. |
| **Activity Gate** | Deferral logic: pauses if you're actively typing or scrolling. |
| **Adaptive Logic** | Automatically reduces frequency if it detects you are frequently dismissing. |
| **Anti-Repeat** | 5-zikr sliding window + same-zikr-twice block for variety. |
| **Domain Context** | Completely quiet on Docs/Meet/Zoom; minimal mode on YouTube/Netflix. |

---

## ✨ Key Pillar Features

### 🕌 Hijri & Occasion Awareness
The extension knows the Islamic date and adapts its rotation:
- **Friday** → Boosts *Salawat* upon the Prophet ﷺ and Surat al-Kahf reminders.
- **Ramadan** → Special du'as, Iftar window reminders (~17:00–20:00), and Laylat al-Qadr mode.
- **Dhul-Hijjah** → *Takbir* during the first 10 days.
- **Local Engine**: All conversion is done locally; no internet required.

### 🔥 Milestone Streak System
Build a daily habit with your zikr:
- **Daily Streak**: Counter increments when you *view* a zikr.
- **Milestones**: Celebrates 3 → 7 → 14 → 30 → 60 → 100 → 365 days.
- **Visual Rewards**: Special Gold milestone cards and progress tracking.

### 🌐 Bilingual & Content Expansion
- **127 Du'as**: A massive expansion curated for variety and authenticity.
- **100% Translated**: Every single Arabic text has a high-quality English translation.
- **Ahadith Mode**: 12 authentic ahadith with source and narrator attribution.

---

## 🚀 Modern Power Features (v1.5)

### ☁️ Cross-Device Sync
Seamlessly sync your settings, streak, and custom du'as across all your computers using your browser profile. Includes a manual "Sync Now" button and defensive merge logic.

### 🎙️ Audio Recitation (TTS)
Optional high-quality Arabic recitation using your browser's native speech engine. Configurable speed and volume.

### 📊 Stats Dashboard
A dedicated dashboard featuring:
- **Hero Metrics**: Total shown vs. viewed and active days.
- **Category Breakdown**: Bar chart of your last 30 azkar.
- **Activity Heatmap**: A GitHub-style 30-day grid showing your engagement levels.

### 📿 Custom Du'a Manager
Add up to 100 personal du'as (parents, loved ones, specific needs). Categorize and weight them so they appear in your rotation.

---

## 🔬 Performance & Privacy

- **Privacy First**: No telemetry, no tracking, no external servers.
- **Zero Idle CPU**: Listeners are attached only when an overlay is about to show.
- **Lightweight**: Content script is ~5 KB; zero DOM observation or polling.
- **Styling**: Uses closed Shadow DOM to prevent CSS conflicts with any website.

---

## 🚀 Installation

### Chrome / Edge / Brave / Arc
1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `azkar-extension` folder.

### Firefox
## 🤲 Intent

This extension is offered as **صدقة جارية** — a continuous charity. If it helps even one person remember their Lord more often during their workday, that is the entire reward sought.

Suggestions, corrections to azkar wording, and additional categories are welcome.

**Made with ♥ in Amman, Jordan** — [iconsjo.com](https://iconsjo.com)

---

### 🤝 How to Contribute
Want to help add more authentic azkar or improve the code? Check out our [Contribution Guide](CONTRIBUTING.md).
