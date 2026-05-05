/**
 * Sakeena — Page Context Analyzer
 * Reads minimal page signals (URL hostname, page title, meta description)
 * and returns a list of context tags relevant to the page.
 *
 * Privacy: never reads page body content, never sends data anywhere.
 * Runs only when triggered, not on every page load.
 */

const ContextAnalyzer = (() => {

  // Each rule has: tag (matches a category), patterns (array of regex), weight
  const RULES = [
    {
      tag: "travel",
      weight: 6,
      hosts: [
        /(^|\.)booking\.com/i, /(^|\.)airbnb\./i, /(^|\.)expedia\./i, /(^|\.)skyscanner\./i,
        /(^|\.)kayak\./i, /(^|\.)tripadvisor\./i, /(^|\.)hotels\.com/i, /(^|\.)agoda\./i,
        /(^|\.)maps\.google\./i, /\/maps(\/|$)/i,
        /\bairlines?\./i, /\bairways\./i, /-airport\./i, /(^|\.)airport\./i
      ],
      keywords: [
        /\b(flight|booking|hotel|reservation|itinerary|boarding|baggage)\b/i,
        /(طيران|حجز فندق|فندق|رحلة|سفر|تذكرة طيران|مطار|تأشيرة)/
      ]
    },
    {
      tag: "healing",
      weight: 7,
      hosts: [
        /(^|\.)webmd\./i, /(^|\.)mayoclinic\./i, /(^|\.)healthline\./i, /(^|\.)medlineplus\./i,
        /(^|\.)nih\.gov/i, /(^|\.)who\.int/i, /(^|\.)cdc\.gov/i, /(^|\.)altibbi\./i,
        /\bhospital\./i, /\bclinic\./i
      ],
      keywords: [
        /\b(diagnosis|treatment|symptoms|cancer|surgery|hospital|patient|illness|disease)\b/i,
        /(مستشفى|عيادة|طبيب|مرض|علاج|أعراض|تشخيص|سرطان|عملية)/
      ]
    },
    {
      tag: "success",
      weight: 5,
      hosts: [
        /(^|\.)linkedin\.com/i, /(^|\.)indeed\./i, /(^|\.)glassdoor\./i, /(^|\.)monster\./i,
        /(^|\.)bayt\.com/i, /(^|\.)wuzzuf\./i,
        /(^|\.)coursera\./i, /(^|\.)udemy\./i, /(^|\.)edx\./i, /(^|\.)khanacademy\./i,
        /\.edu(\.|\/|$)/i, /\.ac\.[a-z]{2,3}(\/|$)/i
      ],
      keywords: [
        /\b(interview|application|cv|resume|exam|test|certification|deadline|presentation|jobs?)\b/i,
        /(مقابلة|توظيف|سيرة ذاتية|امتحان|اختبار|تخرج|شهادة|عرض تقديمي|وظيفة)/
      ]
    },
    {
      tag: "rizq",
      weight: 4,
      hosts: [
        /\bbank\./i, /(^|\.)paypal\./i, /(^|\.)stripe\.com/i,
        /(^|\.)amazon\./i, /(^|\.)noon\.com/i, /(^|\.)jumia\./i,
        /(^|\.)etsy\./i, /(^|\.)shopify\./i, /\.shop(\/|$)/i,
        /(^|\.)freelancer\./i, /(^|\.)upwork\./i, /(^|\.)fiverr\./i
      ],
      keywords: [
        /\b(invoice|payment|salary|earnings|investment|trading|profit|cart|checkout)\b/i,
        /(فاتورة|راتب|تجارة|بيع|شراء|استثمار|ربح|سلة)/
      ]
    },
    {
      tag: "ummah",
      weight: 5,
      hosts: [
        /(^|\.)aljazeera\./i, /(^|\.)alarabiya\./i, /bbc\.com\/arabic/i,
        /(^|\.)reuters\./i, /(^|\.)apnews\./i, /\.news(\/|$)/i, /(^|\.)news\./i
      ],
      keywords: [
        /\b(palestine|gaza|syria|yemen|sudan|kashmir|uyghur|war|crisis|refugees)\b/i,
        /(فلسطين|غزة|سوريا|اليمن|السودان|كشمير|الإيغور|حرب|أزمة|لاجئين|الأقصى)/
      ]
    },
    {
      tag: "anxiety",
      weight: 5,
      hosts: [
        /reddit\.com\/r\/(anxiety|depression|mentalhealth)/i
      ],
      keywords: [
        /\b(anxiety|depression|panic|stress|burnout|overwhelmed|insomnia)\b/i,
        /(قلق|اكتئاب|ضغط نفسي|توتر|أرق|إرهاق)/
      ]
    }
  ];

  /**
   * Analyze a context object: { url, title, description }
   * Returns array of { tag, weight } sorted by weight desc.
   */
  function analyze({ url, title = "", description = "" }) {
    const matches = [];
    let host = "";
    let pathname = "";
    try {
      const u = new URL(url);
      host = u.hostname.toLowerCase();
      pathname = u.pathname.toLowerCase();
    } catch (_) {
      return [];
    }

    const hostAndPath = host + pathname;
    const haystack = `${title} ${description}`.toLowerCase();

    for (const rule of RULES) {
      let matched = false;

      // Host match (strong signal)
      if (rule.hosts) {
        for (const re of rule.hosts) {
          if (re.test(hostAndPath)) { matched = true; break; }
        }
      }

      // Keyword match (weaker, requires title or description hit)
      if (!matched && rule.keywords && haystack.length > 0) {
        let hits = 0;
        for (const re of rule.keywords) {
          if (re.test(haystack)) hits += 1;
          if (hits >= 1) break;
        }
        if (hits >= 1) matched = true;
      }

      if (matched) {
        matches.push({ tag: rule.tag, weight: rule.weight });
      }
    }

    return matches;
  }

  return { analyze };
})();

if (typeof self !== "undefined") self.ContextAnalyzer = ContextAnalyzer;
if (typeof globalThis !== "undefined") globalThis.ContextAnalyzer = ContextAnalyzer;
