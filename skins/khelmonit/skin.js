/*
 * סקין "החלמונית" - גרסת Premium: זכוכית כהה, Tailwind (מקומפל מראש) ואייקוני Lucide.
 * כותרת: שעון | תחזית 7 ימים | מיקום וטמפרטורה | כלים. מתחת: 3 עמודות.
 *
 * החוזה של סקין (styles / themes / autoTheme / layout / render) - README.md.
 *
 * ⚠️ tailwind.css כולל רק את המחלקות שכבר בשימוש. מחלקת Tailwind חדשה כאן לא
 *    תעבוד עד שיקמפלו מחדש - לעיצוב חדש עדיף CSS רגיל ב-skin.css.
 */
(function () {
    "use strict";

    var DAYS = ["יום א׳", "יום ב׳", "יום ג׳", "יום ד׳", "יום ה׳", "יום ו׳", "שבת"];
    var WEEKDAYS = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "שבת"];
    var MONTH_NAMES = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני",
                       "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];

    var esc = Dashboard.esc;

    function $(id) { return document.getElementById(id); }

    // ───────────── אייקוני Lucide ─────────────

    function icon(name, cls) {
        return '<i data-lucide="' + name + '" class="' + (cls || "") + '"></i>';
    }

    // מצייר את כל ה-<i data-lucide> שעוד לא צוירו (קריאה אחת לכמה שינויים רצופים).
    // setTimeout ולא requestAnimationFrame - rAF מושהה כשהדף מוסתר (מסך כבוי /
    // קיוסק ברקע) ואז האייקונים לא היו מצוירים
    var pending = false;
    function paint() {
        if (pending) return;
        pending = true;
        setTimeout(function () {
            pending = false;
            if (window.lucide) lucide.createIcons({ attrs: { "stroke-width": 1.75 } });
        }, 0);
    }

    // נטען ברקע (לא חוסם את הדף); כשהוא מוכן - מציירים את כל מה שכבר על המסך
    var lucideScript = document.createElement("script");
    lucideScript.src = "https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js";
    lucideScript.onload = paint;
    document.head.appendChild(lucideScript);

    // קוד WMO → אייקון Lucide
    function weatherIcon(code) {
        if (code === 0)                 return "sun";
        if (code <= 3)                  return "cloud-sun";
        if (code === 45 || code === 48) return "cloud-fog";
        if (code >= 51 && code <= 57)   return "cloud-drizzle";
        if (code >= 61 && code <= 67)   return "cloud-rain";
        if (code >= 71 && code <= 77)   return "snowflake";
        if (code >= 80 && code <= 82)   return "cloud-rain";
        if (code >= 95)                 return "cloud-lightning";
        return "cloud";
    }

    // הוועד בוחר אייקוני סטטוס בשמות Font Awesome - ממופים ל-Lucide;
    // שם שלא במפה מוצג כאייקון Font Awesome כגיבוי
    var FA_TO_LUCIDE = {
        "trash-can": "trash-2", "trash-alt": "trash-2", "trash": "trash-2",
        "recycle": "recycle", "elevator": "arrow-up-down", "arrow-up": "arrow-up",
        "broom": "brush", "droplet": "droplet", "faucet": "droplets",
        "fire-extinguisher": "fire-extinguisher", "bolt": "zap", "lightbulb": "lightbulb",
        "plug": "plug", "wifi": "wifi", "car": "car", "bicycle": "bike", "key": "key-round",
        "door-open": "door-open", "wrench": "wrench", "screwdriver-wrench": "wrench",
        "hammer": "hammer", "paint-roller": "paint-roller", "envelope": "mail",
        "box": "package", "dog": "dog", "leaf": "leaf", "tree": "trees",
        "dumbbell": "dumbbell", "stairs": "chevrons-up", "video": "cctv",
        "shield-halved": "shield-half", "snowflake": "snowflake", "sun": "sun",
        "temperature-half": "thermometer", "calendar-days": "calendar-days",
        "phone": "phone", "users": "users", "file-invoice-dollar": "receipt",
        "building": "building-2", "truck": "truck", "circle-check": "circle-check",
        "triangle-exclamation": "triangle-alert"
    };

    // צבעי הסטטוס: ירוק רך = תקין, אדום = דורש תשומת לב, אפור = ניטרלי
    var TONES = {
        good:    { tile: "bg-good/10 text-good ring-1 ring-inset ring-good/20",
                   row:  "border-good/25 bg-good/[0.04]",
                   value:"text-good font-semibold",
                   dot:  "bg-good" },
        warning: { tile: "bg-bad/10 text-bad ring-1 ring-inset ring-bad/20",
                   row:  "border-bad/30 bg-bad/[0.05]",
                   value:"text-bad font-bold",
                   dot:  "bg-bad" },
        "":      { tile: "bg-ink/[0.06] text-ink/75 ring-1 ring-inset ring-line/60",
                   row:  "border-line/70 bg-ink/[0.02]",
                   value:"text-muted font-medium",
                   dot:  "" }
    };

    function statusIcon(name) {
        var lucideName = FA_TO_LUCIDE[name];
        return lucideName ? icon(lucideName, "h-5 w-5") : '<i class="fas fa-' + esc(name) + ' text-[17px]"></i>';
    }

    function formatTime(date) {
        return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    }

    function timeBlock(iconName, label, value) {
        return '' +
            '<div class="flex flex-1 items-center gap-3 px-4 py-3">' +
                '<div class="icon-tile h-9 w-9 bg-accent/10 text-accent">' + icon(iconName, "h-[18px] w-[18px]") + '</div>' +
                '<div class="flex flex-col">' +
                    '<span class="text-[12px] text-muted">' + label + '</span>' +
                    '<span class="tabular text-[22px] font-semibold leading-tight tracking-tight text-ink">' + value + '</span>' +
                '</div>' +
            '</div>';
    }

    var TOOL_BTN = "grid h-10 w-10 place-items-center rounded-xl border border-line/80 bg-ink/[0.03] text-muted " +
                   "transition-all duration-300 hover:border-accent/50 hover:bg-accent/10 hover:text-accent";

    Dashboard.defineSkin({
        styles: [
            "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Heebo:wght@300;400;500;600;700;800;900&display=swap",
            "skins/khelmonit/tailwind.css",
            "skins/khelmonit/skin.css"
        ],
        bodyClass: "font-sans",

        themes: [
            { id: "gold", label: "זהב קלאסי",   dots: ["#d4a84b", "#a1a1aa", "#09090b"] },
            { id: "lime", label: "גרפיט וליים", dots: ["#bef264", "#9ca398", "#0a0b0a"] },
            { id: "sand", label: "חול וטרקוטה", dots: ["#ba522c", "#6b6052", "#f4efe5"], light: true }
        ],
        autoTheme: {
            day: "sand",
            night: "gold",
            label: "אוטומטי: חול ביום, זהב בלילה",
            dots: ["#ba522c", "#f4efe5", "#d4a84b", "#09090b"]
        },
        defaultTheme: "gold",

        afterRender: paint,

        layout: function (site, esc) {
            return '' +
'<div id="tv-stage">' +
'<div class="flex h-full flex-col gap-4 p-5">' +

   // כותרת: שעון · תחזית 7 ימים · מיקום וטמפרטורה · כלים
'  <header class="glass relative z-30 flex h-[128px] shrink-0 items-center rounded-2xl px-8">' +
'    <div class="flex w-[300px] shrink-0 flex-col justify-center">' +
'      <div id="time" class="tabular text-[84px] font-bold leading-none tracking-[-0.04em] text-ink">--:--</div>' +
'      <div class="mt-3 flex items-center gap-2 text-[15px] font-medium text-muted">' +
'        <span class="h-1.5 w-1.5 rounded-full bg-accent"></span><span id="date">טוען...</span>' +
'      </div>' +
'    </div>' +
'    <div class="mx-6 h-16 w-px shrink-0 bg-line/70"></div>' +
'    <div id="forecast-container" class="grid flex-1 grid-cols-7 gap-1.5"></div>' +
'    <div class="mx-6 h-16 w-px shrink-0 bg-line/70"></div>' +
'    <div class="flex shrink-0 items-center gap-4">' +
'      <div class="flex flex-col items-start">' +
'        <div class="text-[19px] font-bold leading-tight text-ink">' + esc(site.name) + '</div>' +
'        <div class="mt-1 flex items-center gap-1.5 text-[13px] text-muted">' +
'          ' + icon("map-pin", "h-3.5 w-3.5 text-accent") +
'          <span>' + esc(site.city) + '</span><span class="text-faint">·</span><span>' + esc(site.area) + '</span>' +
'        </div>' +
'      </div>' +
'      <div class="flex items-center gap-2">' +
'        <span id="main-weather-icon" class="text-accent">' + icon("sun", "h-9 w-9") + '</span>' +
'        <span class="main-temp tabular text-[40px] font-semibold leading-none tracking-tight text-ink">--°</span>' +
'      </div>' +
'    </div>' +
'    <div class="relative mr-6 flex shrink-0 flex-col gap-2 border-r border-line/70 pr-6">' +
'      <button type="button" id="theme-picker-btn" title="בחירת ערכת צבעים" class="' + TOOL_BTN + '">' + icon("palette", "h-[18px] w-[18px]") + '</button>' +
'      <button type="button" id="admin-btn" title="מצב ניהול - עריכת הודעות וסטטוס" class="' + TOOL_BTN + '">' + icon("lock", "h-[18px] w-[18px]") + '</button>' +
'      <div id="theme-picker-panel" class="absolute z-50 w-[300px] rounded-2xl border border-line/80 bg-card/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl"' +
'           style="top: calc(100% + 30px); left: -12px;">' +
'        <div class="flex items-center justify-between px-2 pb-3 pt-1">' +
'          <div class="text-[13px] font-semibold text-ink">ערכת צבעים</div>' + icon("sparkles", "h-4 w-4 text-accent") +
'        </div>' +
'        <div id="theme-picker-rows" class="flex flex-col gap-1" role="radiogroup" aria-label="ערכת צבעים"></div>' +
'      </div>' +
'    </div>' +
'  </header>' +

'  <main class="grid min-h-0 flex-1 grid-cols-3 gap-4">' +

     // עמודה 1: הודעות ועד בית + נגן + קודי QR
'    <section class="glass flex min-h-0 flex-col rounded-2xl p-6">' +
'      <div class="mb-4 flex items-center gap-3">' +
'        <div class="icon-tile h-9 w-9 bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">' + icon("bell", "h-[18px] w-[18px]") + '</div>' +
'        <h2 class="text-[18px] font-bold tracking-tight text-ink">הודעות ועד בית</h2>' +
'      </div>' +
'      <div class="radio-bar mb-4 flex shrink-0 select-none items-center gap-3 rounded-xl border border-line/80 bg-ink/[0.03] px-3 py-2 transition-all duration-300 hover:border-accent/40" id="radio-bar">' +
'        <div class="radio-play flex cursor-pointer items-center gap-3" id="radio-toggle" role="button" aria-pressed="false" title="הפעל גלגלצ">' +
'          <div class="radio-icon-wrap grid h-8 w-8 place-items-center rounded-full border border-line bg-card text-accent transition-all duration-300">' +
'            ' + icon("play", "ico-play h-3.5 w-3.5 translate-x-[-1px] fill-current") + icon("pause", "ico-pause h-3.5 w-3.5 fill-current") +
'            <span id="radio-icon" hidden>play_arrow</span>' +
'          </div>' +
'          <span class="whitespace-nowrap text-[14px] font-semibold text-ink" id="radio-label">גלגלצ</span>' +
'        </div>' +
'        <div class="radio-bars flex h-3.5 items-end gap-[2px]"><span></span><span></span><span></span><span></span></div>' +
'        <div class="radio-source-switch ms-auto flex shrink-0 gap-1 rounded-full border border-line/80 bg-card/80 p-[3px]" role="radiogroup" aria-label="בחירת מקור מוזיקה">' +
'          <div class="radio-source-chip grid h-6 w-8 cursor-pointer place-items-center rounded-full text-faint transition-all duration-300 hover:text-ink" data-source="galgalatz" role="radio" aria-checked="true" title="גלגלצ - שידור חי">' + icon("radio", "h-3.5 w-3.5") + '</div>' +
'          <div class="radio-source-chip grid h-6 w-8 cursor-pointer place-items-center rounded-full text-faint transition-all duration-300 hover:text-ink" data-source="custom" role="radio" aria-checked="false" title="מוזיקת הבית">' + icon("music-2", "h-3.5 w-3.5") + '</div>' +
'        </div>' +
'      </div>' +
'      <div class="min-h-0 flex-1 overflow-hidden" id="notices-list"></div>' +
'      <div id="qr-codes" class="mt-4 shrink-0"></div>' +
'    </section>' +

     // עמודה 2: שבת ומועדים
'    <section class="glass flex min-h-0 flex-col rounded-2xl p-6">' +
'      <div class="mb-4 flex items-center gap-3">' +
'        <div class="icon-tile h-9 w-9 bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">' + icon("calendar-days", "h-[18px] w-[18px]") + '</div>' +
'        <h2 class="text-[18px] font-bold tracking-tight text-ink">מועדים ואירועים</h2>' +
'      </div>' +
'      <div id="shabbat-times" class="shrink-0"></div>' +
'      <div id="holidays-list" class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">' +
'        <p class="px-1 py-2 text-[14px] text-muted">טוען מועדים...</p>' +
'      </div>' +
'    </section>' +

     // עמודה 3: סטטוס בניין + חלון תמונה
'    <section class="glass flex min-h-0 flex-col rounded-2xl p-6">' +
'      <div class="mb-4 flex items-center gap-3">' +
'        <div class="icon-tile h-9 w-9 bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">' + icon("building-2", "h-[18px] w-[18px]") + '</div>' +
'        <h2 class="text-[18px] font-bold tracking-tight text-ink">סטטוס בניין</h2>' +
'        <div class="me-0 ms-auto grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-line/80 text-muted transition-all duration-300 hover:border-accent/40 hover:text-ink"' +
'             id="image-toggle-btn" role="button" aria-pressed="false" title="הצג/הסתר תמונה">' +
'          ' + icon("image", "ico-show h-4 w-4") + icon("image-off", "ico-hide h-4 w-4") +
'          <span id="image-toggle-icon" hidden>image</span>' +
'        </div>' +
'      </div>' +
'      <div class="flex shrink-0 flex-col gap-2.5" id="building-status-list"></div>' +
'      <div class="side-image-window mt-4 min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-line/80 bg-ink/[0.03]" id="side-image-window"></div>' +
'    </section>' +
'  </main>' +

   // בר החדשות (core/news.js)
'  <footer class="news-bar glass flex h-12 shrink-0 items-center overflow-hidden rounded-2xl">' +
'    <div class="flex h-full shrink-0 items-center gap-3 border-l border-line/70 pl-4 pr-4">' +
'      <span class="relative h-2 w-2 rounded-full bg-[#e5323b] live-dot"></span>' +
'      <span class="rounded-md bg-white px-1.5 py-1 shadow-sm"><img src="https://ynet-pic1.yit.co.il/picserver5/wcm_upload/2024/07/09/B1LH3j5DR/new_logo_gif_ynet.gif" alt="ynet" class="block h-[14px]"></span>' +
'      <span class="text-[12px] font-semibold uppercase tracking-wider text-muted">מבזקים</span>' +
'    </div>' +
'    <div class="ticker-container flex h-full min-w-0 flex-1 items-center overflow-hidden">' +
'      <div id="status-msg">טוען כותרות...</div><div id="ticker" class="ticker-track"></div>' +
'    </div>' +
'  </footer>' +
'</div>' +
'</div>';
        },

        render: {
            weather: function (data) {
                var c = data.current;
                var tempEl = document.querySelector(".main-temp");
                if (tempEl) tempEl.textContent = c ? c.temp + "°" : "--°";
                if (c) $("main-weather-icon").innerHTML = icon(weatherIcon(c.code), "h-9 w-9");

                $("forecast-container").innerHTML = data.days.map(function (d) {
                    var today = d.isToday;
                    return '<div class="forecast-item flex flex-col items-center justify-center gap-2 rounded-xl py-3 transition-all duration-300 ' +
                               (today ? 'bg-accent/10 ring-1 ring-inset ring-accent/25' : 'hover:bg-ink/[0.04]') + '">' +
                        '<span class="fc-day text-[12px] font-medium ' + (today ? 'text-accent' : 'text-muted') + '">' +
                            (today ? "היום" : DAYS[d.weekday]) + '</span>' +
                        icon(d.code != null ? weatherIcon(d.code) : "cloud", "fc-icon h-6 w-6 " + (today ? "text-accent" : "text-ink/80")) +
                        '<span class="fc-temp tabular text-[16px] font-semibold text-ink">' + (d.max != null ? d.max + "°" : "--°") + '</span>' +
                    '</div>';
                }).join("");
            },

            shabbat: function (data) {
                var box = $("shabbat-times");
                if (!data) { box.innerHTML = ""; return; }
                box.innerHTML =
                    '<div class="shabbat-card mb-4 overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-bl from-accent/[0.09] via-transparent to-transparent shadow-lg shadow-black/20">' +
                        '<div class="flex items-center gap-2 border-b border-accent/15 px-4 py-2.5">' +
                            icon("moon-star", "h-4 w-4 text-accent") +
                            '<span class="text-[14px] font-semibold text-ink">שבת' + (data.parasha ? " — " + esc(data.parasha) : "") + '</span>' +
                        '</div>' +
                        '<div class="flex divide-x divide-x-reverse divide-accent/15">' +
                            timeBlock("flame", "כניסת שבת", formatTime(data.candles)) +
                            timeBlock("sparkles", "צאת שבת", formatTime(data.havdalah)) +
                        '</div>' +
                    '</div>';
            },

            holidays: function (list) {
                var box = $("holidays-list");
                if (!list) {
                    box.innerHTML = '<p class="px-1 py-2 text-[14px] text-muted">שגיאה בטעינת מועדים</p>';
                    return;
                }
                box.innerHTML = list.map(function (ev) {
                    var d = ev.date;
                    return '' +
                        '<div class="event-card group flex items-center gap-4 rounded-xl border border-line/70 bg-ink/[0.02] px-3 py-2 transition-all duration-300 hover:border-accent/40 hover:bg-ink/[0.04]">' +
                            '<div class="flex w-[48px] shrink-0 flex-col overflow-hidden rounded-xl border border-line/80 bg-card text-center shadow-lg shadow-black/20">' +
                                '<span class="bg-accent/15 py-px text-[11px] font-semibold text-accent">' + MONTH_NAMES[d.getMonth()] + '</span>' +
                                '<span class="tabular py-0.5 text-[18px] font-bold leading-tight text-ink">' + d.getDate() + '</span>' +
                            '</div>' +
                            '<div class="min-w-0 flex-1">' +
                                '<h4 class="truncate text-[15px] font-semibold text-ink">' + esc(ev.title) + '</h4>' +
                                '<p class="mt-0.5 text-[12px] text-muted">חג / מועד · ' + WEEKDAYS[d.getDay()] + '</p>' +
                            '</div>' +
                            '<span class="days-chip' + (ev.days <= 2 ? ' is-soon' : '') + ' shrink-0 rounded-full border border-line/80 px-2.5 py-1 text-[11px] font-medium text-muted">' +
                                DashboardHebcal.daysAway(ev.days) + '</span>' +
                        '</div>';
                }).join("") || '<p class="px-1 py-2 text-[14px] text-muted">אין מועדים קרובים</p>';
            },

            // אזהרה = מסגרת ענבר דקה ורקע רך, בלי בלוק צבעוני רווי
            notice: function (notice) {
                var item = document.createElement("div");
                var title = String(notice.title || "").replace(/^\s*⚠️?\s*/, "");
                if (notice.urgent) {
                    item.className = "notice-item active-notice flex gap-3 rounded-xl border border-warn/30 bg-warn/[0.06] p-4";
                    item.innerHTML =
                        '<div class="icon-tile h-8 w-8 bg-warn/10 text-warn">' + icon("triangle-alert", "h-4 w-4") + '</div>' +
                        '<div class="min-w-0 flex-1">' +
                            '<h3 class="text-[15px] font-semibold leading-snug text-warn">' + esc(title) + '</h3>' +
                            '<p class="mt-1 text-[13px] leading-relaxed text-ink/80">' + esc(notice.body) + '</p>' +
                        '</div>';
                } else {
                    item.className = "notice-item rounded-xl border border-line/70 bg-ink/[0.02] p-4 transition-all duration-300 hover:border-line hover:bg-ink/[0.04]";
                    item.innerHTML =
                        '<h3 class="flex items-center gap-2 text-[15px] font-semibold leading-snug text-ink">' +
                            '<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70"></span>' + esc(title) +
                        '</h3>' +
                        '<p class="mt-1 pr-3.5 text-[13px] leading-relaxed text-muted">' + esc(notice.body) + '</p>';
                }
                return item;
            },

            status: function (entry, when) {
                var tone = TONES[entry.state] || TONES[""];
                var item = document.createElement("div");
                item.className = "status-item-mini group flex items-center gap-4 rounded-xl border px-3.5 py-3 transition-all duration-300 hover:bg-ink/[0.05] " +
                                 tone.row + (entry.state === "good" ? " is-active" : "");
                item.innerHTML =
                    '<div class="icon-tile h-11 w-11 ' + tone.tile + '">' + statusIcon(entry.icon) + '</div>' +
                    '<div class="flex min-w-0 flex-1 flex-col">' +
                        '<span class="text-[12px] font-medium text-muted">' + esc(entry.label) + '</span>' +
                        // ערך "תקין" / "אזהרה" מקבל את צבע הסטטוס
                        '<span class="mt-0.5 truncate text-[16px] ' + (entry.state ? tone.value : "font-semibold text-ink") + '">' + esc(entry.value) + '</span>' +
                    '</div>' +
                    (when ? '<span class="status-when' + (when === "tomorrow" ? " is-tomorrow" : "") + '">' +
                                (when === "today" ? "היום" : "מחר") + '</span>' : '') +
                    (tone.dot
                        ? '<span class="relative flex h-2.5 w-2.5 shrink-0"><span class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ' + tone.dot + '"></span><span class="relative inline-flex h-2.5 w-2.5 rounded-full ' + tone.dot + '"></span></span>'
                        : '');
                return item;
            },

            // קוד אחד: שורה אופקית עם שורת משנה; 2-3 קודים: אריחים זה לצד זה
            qr: function (entries) {
                var multi = entries.length > 1;
                return '<div class="qr-grid' + (multi ? ' is-multi' : '') + '" style="grid-template-columns:repeat(' + entries.length + ',minmax(0,1fr))">' +
                    entries.map(function (e) {
                        return '<div class="qr-tile">' +
                                   '<div class="qr-img">' + e.img + '</div>' +
                                   '<div class="min-w-0">' +
                                       '<div class="qr-label">' + esc(e.label) + '</div>' +
                                       (e.sub ? '<div class="qr-sub">' + icon("scan-line") + esc(e.sub) + '</div>' : '') +
                                   '</div>' +
                               '</div>';
                    }).join("") +
                '</div>';
            },

            themeRow: function (option, selected) {
                var row = document.createElement("button");
                row.type = "button";
                row.setAttribute("role", "radio");
                row.setAttribute("aria-checked", String(selected));
                row.className = "theme-swatch-row flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-right transition-all duration-300 hover:bg-ink/[0.05]" +
                                (selected ? " is-selected" : "");
                var dots = option.dots.map(function (c, i) {
                    return '<span class="h-5 w-5 rounded-full ring-2 ring-card" style="background:' + c + ';' +
                           (i ? 'margin-inline-start:-7px;' : '') + 'box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12)"></span>';
                }).join("");
                row.innerHTML =
                    '<span class="flex shrink-0 items-center">' + dots + '</span>' +
                    '<span class="flex-1 text-[14px] font-medium text-ink">' + esc(option.label) + '</span>' +
                    '<span class="theme-radio"></span>';
                return row;
            }
        }
    });
})();
