/*
 * hebcal.js - זמני שבת + פרשת השבוע, ו-3 החגים והמועדים הקרובים (hebcal.com, בלי מפתח).
 * ─────────────────────────────────────────────────────────
 * הסקין מצייר:
 *   Dashboard.render("shabbat", data)   data = { parasha, candles, havdalah } (Date), או null
 *   Dashboard.render("holidays", list)  list = [{ title, date, days }] - [] = אין מועדים,
 *                                       null = הטעינה נכשלה ואין עדיין מה להציג
 *
 * ספירה לאחור: כל אלמנט עם data-shabbat-countdown מקבל כל 30 שניות
 *   "כניסת שבת בעוד יומיים ו־5 שעות" / "שבת שלום" / "שבוע טוב".
 * עזרים לסקינים: DashboardHebcal.daysAway(3) → "בעוד 3 ימים"
 *
 * תדירות: כל 30 דקות + מיד כשהמסך חוזר מ"שינה". לא מסתמכים על רענון הדף:
 *   מסך טלוויזיה ב-standby מקפיא את הטיימרים, ואז הפרשה וה"בעוד X ימים"
 *   היו נשארים של שבוע שעבר.
 *
 * מועדים: maj (חגים) + min (ט"ו בשבט, ל"ג בעומר...) + mod (יום העצמאות, חג הסיגד...),
 *   בחלון מתגלגל של 180 יום מהיום. לא year=now: הוא נעצר ב-31 בדצמבר, ואחרי
 *   חנוכה הלוח היה ריק. התאריך בכתובת גם מחליף אותה כל יום, כך שה-cache של
 *   הדפדפן אף פעם לא מגיש תשובה של יום קודם.
 * שבת: gy/gm/gd = היום. hebcal מחזיר את השבת הקרובה אליו, כך שבמוצאי שבת
 *   עוד רואים "שבוע טוב" ובחצות עוברים לפרשה הבאה.
 * ─────────────────────────────────────────────────────────
 */
window.DashboardHebcal = (function () {
    "use strict";

    var REFRESH_MS = 30 * 60 * 1000;
    var HOLIDAYS_WINDOW_DAYS = 180;
    var HOLIDAYS_COUNT = 3;

    var holidaysShown = false;
    var candles = null;
    var havdalah = null;

    // "2026-10-30" → תאריך מקומי בחצות (new Date על המחרוזת הייתה מפרשת אותה כ-UTC)
    function parseLocalDate(isoDate) {
        var p = isoDate.slice(0, 10).split("-").map(Number);
        return new Date(p[0], p[1] - 1, p[2]);
    }

    function startOfToday() {
        var now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // היום / מחר / מחרתיים / בעוד 5 ימים
    function daysAway(days) {
        if (days <= 0) return "היום";
        if (days === 1) return "מחר";
        if (days === 2) return "מחרתיים";
        return "בעוד " + days + " ימים";
    }

    function fetchJson(url) {
        return fetch(url).then(function (r) {
            if (!r.ok) throw new Error("שגיאת שרת");
            return r.json();
        });
    }

    function fetchHolidays() {
        var today = startOfToday();
        var end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + HOLIDAYS_WINDOW_DAYS);
        var url = "https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&lg=he" +
                  "&start=" + Dashboard.localIso(today) + "&end=" + Dashboard.localIso(end);

        fetchJson(url)
            .then(function (data) {
                var list = data.items
                    .map(function (item) {
                        var date = parseLocalDate(item.date);
                        return { title: item.title, date: date, days: Math.round((date - today) / 86400000) };
                    })
                    .filter(function (item) { return item.days >= 0; })
                    .slice(0, HOLIDAYS_COUNT);
                Dashboard.render("holidays", list);
                holidaysShown = true;
            })
            .catch(function (err) {
                console.error("שגיאה בטעינת מועדים:", err);
                // נפילת רשת רגעית לא מוחקת רשימה שכבר מוצגת מרענון קודם
                if (!holidaysShown) Dashboard.render("holidays", null);
            });
    }

    function fetchShabbat() {
        var loc = Dashboard.site().location;
        var today = new Date();
        var url = "https://www.hebcal.com/shabbat?cfg=json&geo=pos&tzid=Asia/Jerusalem&M=on&lg=he" +
                  "&latitude=" + loc.lat + "&longitude=" + loc.lon +
                  "&gy=" + today.getFullYear() + "&gm=" + (today.getMonth() + 1) + "&gd=" + today.getDate();

        fetchJson(url)
            .then(function (data) {
                var c = data.items.filter(function (i) { return i.category === "candles"; })[0];
                var h = data.items.filter(function (i) { return i.category === "havdalah"; })[0];
                var p = data.items.filter(function (i) { return i.category === "parashat"; })[0];
                if (!c || !h) {
                    candles = havdalah = null;
                    Dashboard.render("shabbat", null);
                    return;
                }
                candles = new Date(c.date);
                havdalah = new Date(h.date);
                Dashboard.render("shabbat", { parasha: p ? p.hebrew : null, candles: candles, havdalah: havdalah });
                updateCountdown();
            })
            .catch(function (err) {
                // משאירים את מה שכבר מוצג - הניסיון הבא בעוד חצי שעה
                console.error("שגיאה בטעינת זמני שבת:", err);
            });
    }

    // ───────────── ספירה לאחור עד כניסת השבת ─────────────

    // יחידות זמן בעברית, כולל הצורות הזוגיות (יומיים, שעתיים)
    function hebrewUnit(n, one, two, many) {
        if (n === 1) return one;
        if (n === 2) return two;
        return n + " " + many;
    }

    function countdownText(ms) {
        var totalMinutes = Math.max(1, Math.ceil(ms / 60000));
        var days    = Math.floor(totalMinutes / 1440);
        var hours   = Math.floor((totalMinutes % 1440) / 60);
        var minutes = totalMinutes % 60;

        var parts = [];
        if (days)  parts.push(hebrewUnit(days, "יום", "יומיים", "ימים"));
        if (hours) parts.push(hebrewUnit(hours, "שעה", "שעתיים", "שעות"));
        if (!days && minutes) parts.push(hebrewUnit(minutes, "דקה", "2 דקות", "דקות"));

        // "יומיים ו־5 שעות" - לפני מספר כותבים ו־ עם מקף עברי
        return "בעוד " + parts.reduce(function (text, part) {
            return text + " ו" + (/^\d/.test(part) ? "־" : "") + part;
        });
    }

    function updateCountdown() {
        if (!candles || !havdalah) return;
        var now = new Date();
        var text = now < candles ? "כניסת שבת " + countdownText(candles - now)
                 : now < havdalah ? "שבת שלום"
                 : "שבוע טוב";
        document.querySelectorAll("[data-shabbat-countdown]").forEach(function (el) {
            el.textContent = text;
        });
    }

    // ───────────────────────── הפעלה ─────────────────────────

    function refresh() {
        fetchHolidays();
        fetchShabbat();
    }

    refresh();
    setInterval(refresh, REFRESH_MS);           // פרשה ומועדים – כל 30 דקות
    setInterval(updateCountdown, 30000);        // ספירה לאחור – כל 30 שניות

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") refresh();
    });

    return { daysAway: daysAway };
})();
