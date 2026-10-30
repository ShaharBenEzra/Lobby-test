/*
 * dashboard.js - הליבה: בוחרת בניין וסקין, טוענת אותם, ומנהלת את ערכת הצבעים.
 * ─────────────────────────────────────────────────────────
 * שלושה חלקים, כל אחד בתיקייה משלו:
 *
 *   sites/<בניין>/   מה שמייחד בניין: שם, כתובת, קודי QR, הודעות ברירת מחדל,
 *                    איזה סקין ואיזו ערכת צבעים. (sites/sites.js = רשימת הבניינים)
 *   skins/<סקין>/    איך הדשבורד נראה: מבנה ה-HTML, ה-CSS, ו-3 ערכות צבעים.
 *   core/            כל הלוגיקה, פעם אחת לכל הסקינים: מזג אוויר, שבת ומועדים,
 *                    חדשות, הודעות, סטטוס, רדיו, מצב ניהול.
 *
 * הסדר ב-index.html:
 *   <head>   Dashboard.loadSite()  → sites/<id>/site.js + קבצי ההודעות והסטטוס
 *            Dashboard.loadSkin()  → skins/<id>/skin.js (שטוען בעצמו את ה-CSS שלו)
 *   <body>   Dashboard.mount()     → ערכת הצבעים על ה-body, ואז מבנה ה-HTML של הסקין
 *            core/*.js             → ממלאים את המבנה בנתונים
 *
 * הטעינה ב-document.write ולא ב-fetch בכוונה: הקבצים נטענים לפי הסדר ולפני
 * שהדף מצטייר, בלי שלב build ובלי הבזק של עיצוב חסר.
 *
 * בחירה דרך הכתובת (לבדיקות, ולמסך קיוסק שצריך משהו קבוע):
 *   ?site=tormus8      בניין אחר מזה שמוגדר לדומיין (לא נשמר - חל רק על הכתובת הזו)
 *   ?skin=khelmonit    סקין אחר מזה שמוגדר לבניין (לא נשמר)
 *   ?theme=auto        ערכת צבעים - נשמרת במכשיר, כמו בחירה מהפאנל
 * ─────────────────────────────────────────────────────────
 */
window.Dashboard = (function () {
    "use strict";

    var SKINS = ["tormus6", "tormus8", "khelmonit"];

    var params = new URLSearchParams(location.search);
    var siteId = null;
    var skinId = null;
    var site = null;
    var skin = null;

    // ───────────────────────── עזרים ─────────────────────────

    function load(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    function store(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* מצב פרטי / אחסון מלא - לא קריטי */ }
    }

    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    // Date → "2026-10-30" לפי השעון המקומי (toISOString היה נותן תאריך UTC - יום אחורה אחרי חצות)
    function localIso(date) {
        var pad = function (n) { return String(n).padStart(2, "0"); };
        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
    }

    function write(html) {
        document.write(html);
    }

    // ───────────────────────── בניין ─────────────────────────

    function resolveSiteId() {
        var registry = window.DashboardSites || { sites: [], hosts: {} };
        var fromUrl = params.get("site");
        if (fromUrl && registry.sites.indexOf(fromUrl) !== -1) return fromUrl;
        var byHost = registry.hosts && registry.hosts[location.hostname];
        if (byHost && registry.sites.indexOf(byHost) !== -1) return byHost;
        return registry.default || registry.sites[0];
    }

    function loadSite() {
        siteId = resolveSiteId();
        ["site.js", "notices_data.js", "building_status_data.js"].forEach(function (file) {
            write('<script src="sites/' + siteId + '/' + file + '"><\/script>');
        });
    }

    function defineSite(config) {
        site = config;
        site.id = siteId;
    }

    // נתיב של קובץ מתיקיית הבניין ("qr_paybox.png" → "sites/tormus6/qr_paybox.png").
    // כתובת מלאה (https://...) או נתיב שמתחיל ב-/ נשארים כמו שהם.
    function asset(path) {
        if (!path) return "";
        if (/^(https?:)?\/\//.test(path) || path.charAt(0) === "/") return path;
        return "sites/" + siteId + "/" + path;
    }

    // ───────────────────────── סקין ─────────────────────────

    function loadSkin() {
        var fromUrl = params.get("skin");
        skinId = SKINS.indexOf(fromUrl) !== -1 ? fromUrl
               : SKINS.indexOf(site && site.skin) !== -1 ? site.skin
               : SKINS[0];
        // הכללים המשותפים וחלון הניהול זהים בכל הסקינים ונשענים על משתני
        // הצבע שלהם. נטענים לפני הסקין, כדי שהסקין יוכל לדרוס בהם פרטים
        write('<link rel="stylesheet" href="core/core.css">');
        write('<link rel="stylesheet" href="core/admin.css">');
        write('<script src="skins/' + skinId + '/skin.js"><\/script>');
    }

    function defineSkin(def) {
        skin = def;
        skin.id = skinId;
        (def.styles || []).forEach(function (href) {
            write('<link rel="stylesheet" href="' + href + '">');
        });
    }

    // קריאה לפונקציית ציור של הסקין, אם יש לו כזו. מחזירה את מה שהיא מחזירה.
    function render(name) {
        var fn = skin && skin.render && skin.render[name];
        if (typeof fn !== "function") return undefined;
        var result = fn.apply(skin, Array.prototype.slice.call(arguments, 1));
        if (typeof skin.afterRender === "function") skin.afterRender();
        return result;
    }

    // ───────────────────────── ערכת צבעים ─────────────────────────
    // לכל סקין 3 ערכות. "auto" = ערכת היום של הסקין מהזריחה עד השקיעה,
    // ערכת הלילה בלילה, והחשכת המסך בשעות הלילה המאוחרות.
    // הזריחה והשקיעה נשמרות ע"י core/weather.js; עד שיש אותן - 06:30 עד 18:00.

    var AUTO = "auto";
    var DIM_FROM = 0;   // החשכה מ-00:00...
    var DIM_TO   = 5;   // ...עד 05:00

    function themeKey() {
        return "dashboard-theme:" + skinId;
    }

    function themes() {
        return (skin && skin.themes) || [];
    }

    function hasAuto() {
        return !!(skin && skin.autoTheme);
    }

    function validTheme(id) {
        if (id === AUTO) return hasAuto();
        return themes().some(function (t) { return t.id === id; });
    }

    function isDaytime(now) {
        try {
            var sun = JSON.parse(load("dashboard-sun"));
            if (sun && sun.date === localIso(now)) {
                return now >= new Date(sun.sunrise) && now < new Date(sun.sunset);
            }
        } catch (e) { /* נתון פגום - נופלים לשעות הקבועות */ }
        var minutes = now.getHours() * 60 + now.getMinutes();
        return minutes >= 6 * 60 + 30 && minutes < 18 * 60;
    }

    function isDimTime(now) {
        var h = now.getHours();
        return h >= DIM_FROM && h < DIM_TO;
    }

    // הבחירה השמורה במכשיר → ?theme= → ברירת המחדל של הבניין → של הסקין
    function savedTheme() {
        var fromUrl = params.get("theme");
        if (validTheme(fromUrl)) {
            store(themeKey(), fromUrl);
            return fromUrl;
        }
        var saved = load(themeKey());
        if (validTheme(saved)) return saved;
        if (site && validTheme(site.theme)) return site.theme;
        if (skin && validTheme(skin.defaultTheme)) return skin.defaultTheme;
        return hasAuto() ? AUTO : (themes()[0] && themes()[0].id);
    }

    // id = ערכה או "auto". מחזיר את הערכה שהוחלה בפועל.
    function applyTheme(id, persist) {
        if (!validTheme(id)) id = savedTheme();
        var now = new Date();
        var isAuto = id === AUTO;
        var resolvedId = isAuto ? (isDaytime(now) ? skin.autoTheme.day : skin.autoTheme.night) : id;
        var theme = themes().filter(function (t) { return t.id === resolvedId; })[0] || themes()[0];
        var body = document.body;

        themes().forEach(function (t) { body.classList.remove("theme-" + t.id); });
        if (theme) body.classList.add("theme-" + theme.id);
        body.classList.toggle("dark-mode", !(theme && theme.light));
        body.classList.toggle("is-dimmed", isAuto && isDimTime(now));

        if (persist) store(themeKey(), id);
        return { selected: id, theme: theme };
    }

    // ───────────────────────── הרכבה ─────────────────────────

    function mount() {
        document.body.classList.add("skin-" + skinId);
        (skin.bodyClass || "").split(/\s+/).forEach(function (cls) {
            if (cls) document.body.classList.add(cls);
        });
        applyTheme(savedTheme(), false);
        document.body.insertAdjacentHTML("beforeend", skin.layout(site, esc));
        if (typeof skin.afterRender === "function") skin.afterRender();
    }

    return {
        loadSite: loadSite,
        defineSite: defineSite,
        loadSkin: loadSkin,
        defineSkin: defineSkin,
        mount: mount,

        site: function () { return site; },
        skin: function () { return skin; },
        asset: asset,
        render: render,

        theme: {
            AUTO: AUTO,
            list: themes,
            hasAuto: hasAuto,
            saved: savedTheme,
            apply: applyTheme
        },

        esc: esc,
        localIso: localIso,
        write: write
    };
})();
