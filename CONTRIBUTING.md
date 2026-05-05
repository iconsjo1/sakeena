# Contributing to Sakeena

First of all, thank you for considering contributing to Sakeena! This project is a **Sadaqah Jariya (continuous charity)**, and your contributions help spread the remembrance of Allah to users worldwide.

---

## 📜 Principles
1.  **Authenticity First**: Every zikr or du'a added must be from an authentic source (Qur'an or authentic Sunnah).
2.  **Privacy Always**: We do not add features that track users or collect data.
3.  **Calm & Focused**: UI additions should be subtle and respect the user's workflow.

---

## 📿 Contributing Azkar (Content)

The Azkar database is located at `data/azkar.json`. To add a new zikr, follow these steps:

### 1. Verification & Sourcing
We only accept Azkar from reputable sources such as:
-   **Hisn al-Muslim** (Fortress of the Muslim)
-   **Sahih al-Bukhari** / **Sahih Muslim**
-   **Riyad as-Salihin**

**Required Information**:
-   **Arabic Text**: With proper diacritics (harakat).
-   **English Translation**: Accurate and clear.
-   **Category**: Where does it fit best? (Morning, Healing, Travel, etc.)

### 2. JSON Structure
Add your entry to the appropriate category in `data/azkar.json`. Each entry follows this format:

```json
{
  "id": "unique-id",
  "text": "Arabic text with harakat here...",
  "en": "English translation here...",
  "weight": 3
}
```

-   **`id`**: Use a short prefix based on the category (e.g., `tr1` for travel, `h1` for healing). Ensure it doesn't conflict with existing IDs.
-   **`weight`**: Determines frequency (1–5). Use `3` for standard, `5` for very common/short tasbih.

---

## 💻 Contributing Code

### Technical Stack
-   **Manifest V3**: Cross-browser compatibility.
-   **Vanilla JS**: No frameworks are used in the content script to keep it ultra-lightweight.
-   **Shadow DOM**: All UI overlays use a closed Shadow DOM to prevent CSS conflicts.

### Workflow
1.  **Fork** the repository.
2.  **Create a branch** for your feature (`feat/awesome-thing`).
3.  **Test** your changes locally (see README for installation).
4.  **Submit a Pull Request** with a clear description of what changed.

### Style Guide
-   Use **Prettier** for formatting.
-   Keep the content script (`scripts/content.js`) as small as possible.
-   Add translation keys to `scripts/i18n.js` for any new UI text.

---

## 🤲 Rewards
By contributing to this project, you are helping thousands of people remember Allah. May Allah accept your work as a continuous charity for you and your parents.

> "Whoever guides someone to goodness will have a reward like one who did it." — Prophet Muhammad ﷺ

---

**Questions?** Reach out at [sakeena@iconsjo.com](mailto:sakeena@iconsjo.com) or open an issue on GitHub.
