/*
 * Ynet_script.js
 * ─────────────────────────────────────────────────────────
 * מה זה עושה:
 *   מושך כותרות חדשות מ-Ynet ומציג אותן כ-ticker רץ בתחתית המסך
 *
 * למה הבר "עבד במקום אחד ולא באחר" (הבעיה שתוקנה כאן):
 *   Ynet חוסם בקשות ישירות מהדפדפן (CORS), אז חייבים פרוקסי.
 *   בבדיקה בפועל הפרוקסי היחיד שעובד באופן יציב (allorigins) מחזיר
 *   תשובה תוך 3 עד 12 שניות, תלוי בעומס עליו וברשת.
 *   הגרסה הקודמת נתנה 8 שניות בלבד לכל פרוקסי, וניסתה אותם
 *   אחד-אחרי-השני - כך שברשת קצת איטית הפרוקסי הראשון נחתך ב-8 שניות,
 *   השני (codetabs) היה למטה, והשלישי כבר לא הספיק. ברשת מהירה
 *   הראשון הספיק להחזיר בזמן והכל עבד. זה בדיוק ההבדל בין מקום למקום.
 *
 *   התיקון: (1) מריצים את כל המקורות *במקביל* ולוקחים את הראשון שמחזיר
 *   RSS תקין, (2) מעלים את הזמן המותר לכל מקור ל-20 שניות - במרוץ
 *   מקבילי זה לא עולה כלום, כי מקור מהיר עונה מיד ממילא.
 *
 * המקורות (כולם נבדקו מול הדפדפן שהם באמת מחזירים CORS תקין):
 *   allorigins (שתי גרסאות) + codetabs → ה-RSS החי של Ynet
 *   rss2json → ספק אחר לגמרי, כגיבוי אם allorigins נופל. הוא מגיש
 *   עותק מ-cache (בערך חצי שעה מאחור), ולכן הוא יוצא לדרך רק אחרי
 *   השהיה קצרה - כדי לתת למקורות החיים צ'אנס לנצח קודם.
 *
 * גיבוי אחרון:
 *   הכותרות האחרונות נשמרות ב-localStorage ומוצגות מיד בטעינה, עוד לפני
 *   שהרשת עונה. אם כל המקורות נכשלו - הבר ממשיך להציג אותן ומנסה שוב
 *   אחרי דקה (במקום לחכות 10 דקות מלאות).
 *
 * תדירות עדכון: כל 10 דקות (ובכישלון - ניסיון חוזר מהיר)
 * ─────────────────────────────────────────────────────────
 */

const RSS_URL     = "https://www.ynet.co.il/Integration/StoryRss1854.xml";
const STORAGE_KEY = "ynet-news-cache"; // מפתח ה-localStorage לשמירת גיבוי

const MAX_ITEMS      = 15;
const SOURCE_TIMEOUT = 20000;           // מקסימום המתנה למקור בודד
const REFRESH_MS     = 10 * 60 * 1000;  // רענון רגיל
const RETRY_BASE_MS  = 60 * 1000;       // ניסיון חוזר אחרי כישלון (גדל בהדרגה)
const RETRY_MAX_MS   = 5 * 60 * 1000;
const SCROLL_SPEED   = 55;              // פיקסלים לשנייה - קובע את מהירות הגלילה

// delay = כמה להמתין לפני שהמקור הזה יוצא לדרך. 0 = מיד.
// כולם רצים במקביל, אז הסדר ברשימה לא משנה - רק ה-delay.
const SOURCES = [
    {
        name: "allorigins-get", delay: 0,
        url:  u => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
        read: async res => (await res.json()).contents,
        parse: parseRssXml
    },
    {
        name: "allorigins-raw", delay: 0,
        url:  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        read: res => res.text(),
        parse: parseRssXml
    },
    {
        name: "codetabs", delay: 0,
        url:  u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
        read: res => res.text(),
        parse: parseRssXml
    },
    {
        name: "rss2json", delay: 4000, // ספק גיבוי עם תוכן מה-cache - יוצא מאוחר בכוונה
        url:  u => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(u)}`,
        read: res => res.json(),
        parse: parseRss2Json
    },
];

let refreshTimer = null;
let failStreak   = 0;

/* ── פירסור ── */

function toTimeStr(date) {
    return isNaN(date) ? "" : date.toLocaleTimeString("he-IL", {
        hour: "2-digit", minute: "2-digit",
        hour12: false, timeZone: "Asia/Jerusalem"
    });
}

// RSS רגיל. pubDate בפורמט RFC-822 וכולל אזור זמן, אז new Date מספיק
function parseRssXml(xmlText) {
    const xmlDoc = new DOMParser().parseFromString(xmlText || "", "text/xml");
    const items  = Array.from(xmlDoc.querySelectorAll("item"));
    return items.slice(0, MAX_ITEMS).map(item => ({
        title:   item.querySelector("title")?.textContent || "",
        link:    item.querySelector("link")?.textContent  || "#",
        timeStr: toTimeStr(new Date(item.querySelector("pubDate")?.textContent || ""))
    }));
}

// rss2json מחזיר JSON. ה-pubDate שלו הוא "YYYY-MM-DD HH:MM:SS" ב-UTC
// (נבדק מול הפיד החי), ולכן מוסיפים Z - אחרת השעות יזוזו ב-3 שעות
function parseRss2Json(json) {
    if (!json || json.status !== "ok" || !Array.isArray(json.items)) {
        throw new Error("rss2json: " + ((json && json.message) || "תשובה לא תקינה"));
    }
    return json.items.slice(0, MAX_ITEMS).map(item => ({
        title:   item.title || "",
        link:    item.link  || "#",
        timeStr: toTimeStr(new Date(String(item.pubDate || "").replace(" ", "T") + "Z"))
    }));
}

// בדיקות שפיות. מקור שנופל בהן "מפסיד" במרוץ ואחר תופס את מקומו -
// כך פרוקסי שמחזיר דף שגיאה או קידוד שבור לא משתלט על הבר
function validate(items, sourceName) {
    if (!items || !items.length) throw new Error(sourceName + ": אין כותרות");

    const allTitles = items.map(i => i.title).join("");
    let hebrew = 0, broken = 0;
    for (let i = 0; i < allTitles.length; i++) {
        const code = allTitles.charCodeAt(i);
        if (code >= 0x0590 && code <= 0x05FF) hebrew++;  // טווח האותיות העבריות
        if (code === 0xFFFD) broken++;                   // "�" - סימן של קידוד שגוי
    }
    if (broken)  throw new Error(sourceName + ": קידוד שבור");
    if (!hebrew) throw new Error(sourceName + ": אין טקסט עברי");

    return items;
}

/* ── שליפה ── */

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSource(source, round) {
    if (source.delay) await sleep(source.delay);
    if (round.signal.aborted) throw new Error(source.name + ": מקור אחר כבר ניצח");

    const controller = new AbortController();
    round.signal.addEventListener("abort", () => controller.abort());
    const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT);
    try {
        const res = await fetch(source.url(RSS_URL), {
            signal: controller.signal,
            cache: "no-store" // בלי זה חלק מהדפדפנים מגישים עותק ישן מה-cache
        });
        if (!res.ok) throw new Error(source.name + " HTTP " + res.status);
        return validate(source.parse(await source.read(res)), source.name);
    } finally {
        clearTimeout(timer);
    }
}

// מחזיר את הערך של המשימה הראשונה שהצליחה, ונדחה רק אם כולן נכשלו.
// (שקול ל-Promise.any, בכתיבה ידנית כדי לא להיות תלויים בתמיכת ה-WebView
//  של אפליקציות הקיוסק)
function firstSuccess(tasks) {
    return new Promise((resolve, reject) => {
        let pending = tasks.length;
        let done = false;
        const errors = [];
        if (!pending) return reject([new Error("אין מקורות")]);
        tasks.forEach(task => {
            Promise.resolve(task).then(
                value => { if (!done) { done = true; resolve(value); } },
                error => { errors.push(error); if (--pending === 0 && !done) reject(errors); }
            );
        });
    });
}

/* ── תצוגה ── */

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function setStatus(text) {
    const el = document.getElementById("status-msg");
    if (!el) return;
    el.textContent = text || "";
    el.style.display = text ? "" : "none";
}

// בניית ה-HTML של ה-ticker הרץ
function renderTicker(items) {
    const ticker = document.getElementById("ticker");
    if (!ticker || !items || !items.length) return;

    // אם הכותרות לא השתנו - לא נוגעים ב-DOM, אחרת האנימציה מתאתחלת
    // וקופצת לאחור מול העיניים בכל רענון
    const signature = items.map(i => i.timeStr + i.title).join("|");
    if (ticker.dataset.signature === signature) return;
    ticker.dataset.signature = signature;

    const oneCopy = items.map(item => `
        <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener" class="ticker-item">
            ${item.timeStr ? `<span class="ticker-time">${escapeHtml(item.timeStr)}</span>` : ""}
            <span class="ticker-title">${escapeHtml(item.title)}</span>
        </a>
        <span class="separator">•</span>
    `).join("");

    // האנימציה מזיזה את הרצועה ב-50% מרוחבה, ולכן צריך בדיוק שני עותקים
    ticker.innerHTML = oneCopy + oneCopy;

    // אם עותק בודד צר מהבר עצמו, נפער "חור" ריק באמצע הלולאה - משכפלים עוד
    const containerW = ticker.parentElement ? ticker.parentElement.clientWidth : 0;
    let copyW = ticker.scrollWidth / 2;
    if (copyW > 0 && containerW > copyW) {
        const block = oneCopy.repeat(Math.ceil(containerW / copyW));
        ticker.innerHTML = block + block;
        copyW = ticker.scrollWidth / 2;
    }

    // משך האנימציה נגזר מרוחב התוכן, כדי שמהירות הגלילה תישאר קבועה
    // בלי קשר לכמות הכותרות ולאורכן
    if (copyW > 0) {
        ticker.style.setProperty("--ticker-speed", (copyW / SCROLL_SPEED).toFixed(1) + "s");
    }
}

/* ── גיבוי ב-localStorage ── */

function saveCache(items) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), items }));
    } catch (e) { /* מצב פרטי / אחסון מלא - לא קריטי */ }
}

function loadCache() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        const items  = Array.isArray(parsed) ? parsed : parsed.items; // תאימות לפורמט הישן
        if (!items || !items.length) return false;
        renderTicker(items);
        return true;
    } catch (e) {
        return false;
    }
}

/* ── לולאת הרענון ── */

function scheduleNext(ms) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(fetchYnetNews, ms);
}

async function fetchYnetNews() {
    const round = new AbortController(); // ברגע שמקור אחד ניצח - עוצרים את השאר
    try {
        const items = await firstSuccess(SOURCES.map(s => fetchSource(s, round)));
        round.abort();
        renderTicker(items);
        saveCache(items);
        setStatus("");
        failStreak = 0;
        scheduleNext(REFRESH_MS);
    } catch (errors) {
        failStreak++;
        console.warn("Ynet: כל המקורות נכשלו",
            Array.isArray(errors) ? errors.map(e => e.message) : errors);

        // ממשיכים להציג את הכותרות האחרונות שיש לנו במקום בר ריק
        if (!loadCache()) setStatus("אין חיבור לחדשות - מנסה שוב...");

        scheduleNext(Math.min(RETRY_BASE_MS * failStreak, RETRY_MAX_MS));
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // מציגים מיד את הגיבוי כדי שהבר לא יהיה ריק בזמן שהרשת עונה
    if (loadCache()) setStatus("");
    fetchYnetNews();
});
