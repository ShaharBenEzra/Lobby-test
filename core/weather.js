/*
 * weather.js - מזג אוויר נוכחי + תחזית 7 ימים מ-open-meteo.com (חינמי, בלי מפתח).
 * ─────────────────────────────────────────────────────────
 * הסקין מצייר: Dashboard.render("weather", data)
 *   data.current = { temp, code, isDay }  - או null (אין עדיין / הנתון ישן מדי)
 *   data.days    = 7 ימים מהיום והלאה, כל אחד:
 *                  { date, weekday (0 = ראשון), isToday, code, max, min }
 *                  יום בלי נתון: code/max/min = null (הסקין מציג "--°")
 *
 * עזרים לסקינים: DashboardWeather.text(code, isDay)         → "מעונן חלקית"
 *                DashboardWeather.materialIcon(code, isDay) → שם אייקון Material
 *
 * תדירות: כל 30 דקות; אחרי כישלון ניסיון חוזר תוך 2 דקות.
 * גיבוי: התחזית האחרונה נשמרת ב-localStorage ומוצגת כשאין רשת, כדי שתקלת
 *   אינטרנט קצרה לא תשאיר את הלובי עם "--°".
 * זריחה ושקיעה: נשמרות בשביל ערכת הצבעים האוטומטית (core/dashboard.js).
 * המיקום: location ב-sites/<בניין>/site.js.
 * ─────────────────────────────────────────────────────────
 */
window.DashboardWeather = (function () {
    "use strict";

    var CACHE_KEY       = "weather-cache-v2";                // + המיקום, ראו cacheKey()
    var CACHE_MAX_AGE   = 3 * 24 * 60 * 60 * 1000;   // תחזית בת יותר מ-3 ימים כבר לא שווה כלום
    var CURRENT_MAX_AGE = 3 * 60 * 60 * 1000;        // "עכשיו" ישן מ-3 שעות - לא מציגים
    var REFRESH_MS      = 30 * 60 * 1000;
    var RETRY_MS        = 2 * 60 * 1000;

    var timer = null;

    /*
     * קוד מזג אוויר (WMO): 0=שמש, 1-3=מעונן חלקית, 45-48=ערפל, 51-67=גשם,
     *                      71-77=שלג, 80-82=ממטרים, 95+=סופה
     */
    function materialIcon(code, isDay) {
        if (code === 0)                 return isDay ? "wb_sunny" : "clear_night";
        if (code <= 2)                  return isDay ? "partly_cloudy_day" : "partly_cloudy_night";
        if (code === 3)                 return "cloud";
        if (code === 45 || code === 48) return "foggy";
        if (code >= 51 && code <= 67)   return "rainy";
        if (code >= 71 && code <= 77)   return "ac_unit";
        if (code >= 80 && code <= 82)   return "rainy";
        if (code >= 95)                 return "thunderstorm";
        return "cloud";
    }

    function text(code, isDay) {
        if (code === 0)                 return isDay ? "שמשי" : "בהיר";
        if (code === 1)                 return "בהיר ברובו";
        if (code === 2)                 return "מעונן חלקית";
        if (code === 3)                 return "מעונן";
        if (code === 45 || code === 48) return "ערפל";
        if (code >= 51 && code <= 57)   return "טפטוף";
        if (code >= 61 && code <= 67)   return "גשם";
        if (code >= 71 && code <= 77)   return "שלג";
        if (code >= 80 && code <= 82)   return "ממטרים";
        if (code >= 95)                 return "סופת רעמים";
        return "";
    }

    // מתחילים מהשורה של היום בפועל - כך גם תחזית שמורה מאתמול מוצגת בימים הנכונים
    function normalize(raw, withCurrent) {
        var now = new Date();
        var daily = raw && raw.daily;
        var offset = daily && daily.time ? daily.time.indexOf(Dashboard.localIso(now)) : -1;
        var days = [];
        for (var i = 0; i < 7; i++) {
            var j = offset + i;
            var has = offset >= 0 && j < daily.time.length;
            days.push({
                date:    has ? daily.time[j] : null,
                weekday: (now.getDay() + i) % 7,
                isToday: i === 0,
                code:    has ? daily.weathercode[j] : null,
                max:     has ? Math.round(daily.temperature_2m_max[j]) : null,
                min:     has ? Math.round(daily.temperature_2m_min[j]) : null
            });
        }
        var cw = raw && raw.current_weather;
        return {
            current: withCurrent && cw ? { temp: Math.round(cw.temperature), code: cw.weathercode, isDay: cw.is_day !== 0 } : null,
            days: days
        };
    }

    // זריחה ושקיעה של היום. השעות מגיעות בזמן מקומי ("2026-10-21T06:20"), בלי אזור זמן.
    function saveSun(raw) {
        var i = raw.daily.time.indexOf(Dashboard.localIso(new Date()));
        if (i < 0) return;
        var sun = { date: raw.daily.time[i], sunrise: raw.daily.sunrise[i], sunset: raw.daily.sunset[i] };
        try { localStorage.setItem("dashboard-sun", JSON.stringify(sun)); } catch (e) { /* אין אחסון */ }
        window.dispatchEvent(new CustomEvent("dashboard-sun", { detail: sun }));
    }

    // הגיבוי שמור לפי מיקום, כך שבניינים באותה כתובת חולקים אותו
    function cacheKey() {
        var loc = Dashboard.site().location;
        return CACHE_KEY + ":" + loc.lat + "," + loc.lon;
    }

    function saveCache(raw) {
        try { localStorage.setItem(cacheKey(), JSON.stringify({ ts: Date.now(), data: raw })); } catch (e) {}
    }

    function showCache() {
        try {
            var c = JSON.parse(localStorage.getItem(cacheKey()) || "null");
            if (!c || !c.data || Date.now() - c.ts > CACHE_MAX_AGE) return false;
            Dashboard.render("weather", normalize(c.data, Date.now() - c.ts < CURRENT_MAX_AGE));
            return true;
        } catch (e) { return false; }
    }

    function update() {
        clearTimeout(timer);
        var loc = Dashboard.site().location;
        var url = "https://api.open-meteo.com/v1/forecast" +
                  "?latitude=" + loc.lat + "&longitude=" + loc.lon +
                  "&current_weather=true" +
                  "&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset" +
                  "&timezone=auto";
        fetch(url, { cache: "no-store" })
            .then(function (r) {
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.json();
            })
            .then(function (raw) {
                Dashboard.render("weather", normalize(raw, true));
                saveSun(raw);
                saveCache(raw);
                timer = setTimeout(update, REFRESH_MS);
            })
            .catch(function (err) {
                console.error("שגיאה בטעינת מזג האוויר:", err);
                showCache();
                timer = setTimeout(update, RETRY_MS);
            });
    }

    // מציגים מיד את הגיבוי (או מסגרת ריקה), עד שהרשת עונה
    if (!showCache()) Dashboard.render("weather", normalize(null, false));
    update();

    // מסך קיוסק שחזר מ"שינה" מתעדכן מיד ולא מחכה למחזור הבא
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") update();
    });

    return { text: text, materialIcon: materialIcon };
})();
