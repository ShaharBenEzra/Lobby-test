// בודק את תאריך התפוגה (subscription ב-sites/<בניין>/site.js), ואם הגיע -
// מסתיר את הדשבורד ומציג במקומו מסך "נא לחדש מנוי". בניין בלי subscription
// (null) - אין בדיקה בכלל.
//
// נטען ב-<head> (אחרי site.js) כדי שהדשבורד לא יספיק להבהב
// לפני שהוא מוסתר. הבדיקה חוזרת כל 10 דקות, כך שמסך שרץ כל היום
// עובר למסך החידוש ביום התפוגה גם בלי רענון. מסך החידוש עצמו מרענן
// את הדף כל 30 דקות, כדי לקלוט חידוש (תאריך חדש ב-site.js).
(function () {
    "use strict";

    var CHECK_EVERY_MS = 10 * 60 * 1000;
    var RELOAD_EXPIRED_MS = 30 * 60 * 1000;

    // "2027-10-12" → חצות מקומית של אותו יום. תאריך לא תקין → null.
    function parseDate(str) {
        var m = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$/.exec(str || "");
        if (!m) return null;
        var d = new Date(+m[1], +m[2] - 1, +m[3]);
        return d.getDate() === +m[3] ? d : null;
    }

    var sub = window.Dashboard && Dashboard.site() && Dashboard.site().subscription;
    if (!sub) return;

    var expires = parseDate(sub.expires);
    if (!expires) {
        // טעות הקלדה בקובץ לא אמורה להשבית ללקוח את האתר
        console.error("site.js: תאריך מנוי לא תקין -", sub.expires);
        return;
    }

    function isExpired() {
        return Date.now() >= expires.getTime();
    }

    function pad(n) { return (n < 10 ? "0" : "") + n; }

    var CSS = [
        "html.sub-expired #tv-stage, html.sub-expired #admin-btn,",
        "html.sub-expired #theme-picker-btn, html.sub-expired #theme-picker-panel { display: none !important; }",
        "html.sub-expired, html.sub-expired body { background: #0b0f14 !important; overflow: hidden; }",

        "#sub-screen { position: fixed; inset: 0; z-index: 2147483000; display: flex;",
        "  align-items: center; justify-content: center; direction: rtl;",
        "  font-family: 'Heebo', 'Segoe UI', Arial, sans-serif; color: #eef2f6;",
        "  --sub-accent: var(--gold, #d4af37);",
        "  background:",
        "    radial-gradient(ellipse at 20% 15%, color-mix(in srgb, var(--sub-accent) 22%, transparent), transparent 55%),",
        "    radial-gradient(ellipse at 85% 90%, color-mix(in srgb, var(--sub-accent) 14%, transparent), transparent 50%),",
        "    linear-gradient(160deg, #10161e 0%, #0b0f14 60%, #07090c 100%); }",

        "#sub-screen .sub-card { position: relative; text-align: center;",
        "  width: min(88vw, 760px); padding: clamp(28px, 5vh, 56px) clamp(24px, 4vw, 64px);",
        "  border-radius: 28px; background: rgba(255,255,255,0.04);",
        "  border: 1px solid rgba(255,255,255,0.09);",
        "  box-shadow: 0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06);",
        "  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);",
        "  animation: sub-rise 900ms cubic-bezier(.2,.8,.2,1) both; }",

        "#sub-screen .sub-badge { position: relative; width: clamp(84px, 14vh, 128px); aspect-ratio: 1;",
        "  margin: 0 auto clamp(18px, 3.5vh, 32px); display: grid; place-items: center; }",
        "#sub-screen .sub-ring { position: absolute; inset: 0; border-radius: 50%;",
        "  background: conic-gradient(from 0deg, transparent 0 25%, var(--sub-accent) 60%, transparent 100%);",
        "  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));",
        "          mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));",
        "  animation: sub-spin 3.2s linear infinite; }",
        "#sub-screen .sub-core { width: 78%; aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center;",
        "  background: color-mix(in srgb, var(--sub-accent) 16%, #0b0f14);",
        "  box-shadow: 0 0 40px color-mix(in srgb, var(--sub-accent) 35%, transparent); }",
        "#sub-screen .sub-core .material-symbols-outlined { font-size: clamp(40px, 6.5vh, 60px); color: var(--sub-accent); }",

        "#sub-screen h1 { margin: 0 0 12px; font-weight: 900; letter-spacing: -0.5px;",
        "  font-size: clamp(30px, 6vh, 56px); line-height: 1.1; }",
        "#sub-screen .sub-text { margin: 0 auto; max-width: 30em; color: #a9b6c3; font-weight: 300;",
        "  font-size: clamp(16px, 2.6vh, 24px); line-height: 1.55; }",

        "#sub-screen .sub-divider { width: 64px; height: 3px; border-radius: 3px; margin: clamp(18px, 3.5vh, 30px) auto;",
        "  background: linear-gradient(90deg, transparent, var(--sub-accent), transparent); }",

        "#sub-screen .sub-chip { display: inline-flex; align-items: center; gap: 8px;",
        "  padding: 8px 18px; border-radius: 999px; font-size: clamp(14px, 2.1vh, 19px);",
        "  color: var(--sub-accent); background: color-mix(in srgb, var(--sub-accent) 12%, transparent);",
        "  border: 1px solid color-mix(in srgb, var(--sub-accent) 35%, transparent); }",
        "#sub-screen .sub-chip .material-symbols-outlined { font-size: 1.2em; }",
        "#sub-screen .sub-contact { margin-top: 16px; color: #d8e0e8; font-size: clamp(15px, 2.3vh, 21px); font-weight: 700; }",
        "#sub-screen .sub-contact:empty { display: none; }",

        "@keyframes sub-spin { to { transform: rotate(360deg); } }",
        "@keyframes sub-rise { from { opacity: 0; transform: translateY(18px) scale(.98); } to { opacity: 1; transform: none; } }",
        "@media (prefers-reduced-motion: reduce) { #sub-screen .sub-ring, #sub-screen .sub-card { animation: none; } }"
    ].join("\n");

    function buildScreen() {
        if (document.getElementById("sub-screen")) return;

        var screen = document.createElement("div");
        screen.id = "sub-screen";
        screen.setAttribute("role", "alert");
        screen.innerHTML =
            '<div class="sub-card">' +
                '<div class="sub-badge"><div class="sub-ring"></div>' +
                    '<div class="sub-core"><span class="material-symbols-outlined">autorenew</span></div>' +
                '</div>' +
                '<h1>נא לחדש מנוי</h1>' +
                '<p class="sub-text">תוקף המנוי ללוח הבניין הסתיים.<br>לחידוש המנוי והחזרת התצוגה, נא לפנות לוועד הבית.</p>' +
                '<div class="sub-divider"></div>' +
                '<div class="sub-chip"><span class="material-symbols-outlined">event_busy</span>' +
                    '<span class="sub-date"></span></div>' +
                '<div class="sub-contact"></div>' +
            '</div>';

        screen.querySelector(".sub-date").textContent =
            "המנוי הסתיים ב-" + pad(expires.getDate()) + "/" + pad(expires.getMonth() + 1) + "/" + expires.getFullYear();
        screen.querySelector(".sub-contact").textContent = sub.contact || "";

        document.body.appendChild(screen);
    }

    function activate() {
        if (document.documentElement.classList.contains("sub-expired")) return;
        document.documentElement.classList.add("sub-expired");

        var audio = document.getElementById("lobby-audio");
        if (audio) audio.pause();

        if (document.body) buildScreen();
        else document.addEventListener("DOMContentLoaded", buildScreen);

        // ממשיך לבדוק אם חודש המנוי (הקובץ עודכן) - רענון קולט את התאריך החדש
        setTimeout(function () { location.reload(); }, RELOAD_EXPIRED_MS);
    }

    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    if (isExpired()) {
        activate();
    } else {
        var timer = setInterval(function () {
            if (isExpired()) {
                clearInterval(timer);
                activate();
            }
        }, CHECK_EVERY_MS);
    }
})();
