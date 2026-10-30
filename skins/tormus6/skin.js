/*
 * סקין "התורמוס 6" - שעון גדול במסגרת, עמודת מזג אוויר עם טווחי טמפרטורה,
 * לוח של הודעות | שבת ומועדים, ושורת סטטוס בניין לרוחב.
 *
 * מה יש בסקין (החוזה המלא - README.md):
 *   styles      קבצי CSS וגופנים, נטענים ב-head
 *   themes      3 ערכות צבעים (ה-CSS שלהן ב-skin.css, סעיף 2)
 *   autoTheme   מה "אוטומטי" מחליף בין יום ללילה
 *   layout()    מבנה ה-HTML. ה-id-ים הם מה שהליבה (core/) ממלאת
 *   render      איך הסקין מצייר נתונים שהליבה מביאה
 */
(function () {
    "use strict";

    var SHORT_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"];
    var MONTH_NAMES = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני",
                       "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];

    function $(id) { return document.getElementById(id); }

    function temp(value) {
        return value == null ? "--°" : value + "°";
    }

    function formatTime(date) {
        return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    }

    Dashboard.defineSkin({
        styles: [
            "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@200;300;400;500;600&display=swap",
            "skins/tormus6/skin.css"
        ],

        themes: [
            { id: "almond", label: "שקד",          dots: ["#4d6b1f", "#e9e3d8", "#fffdf9"], light: true },
            { id: "ember",  label: "גחלים",        dots: ["#ff7a33", "#242427", "#0d0d0e"] },
            { id: "wine",   label: "יין ושמפניה",  dots: ["#e8c39e", "#2a1b1f", "#120a0c"] }
        ],
        autoTheme: {
            day: "almond",
            night: "ember",
            label: "אוטומטי: שקד ביום, גחלים בלילה",
            dots: ["#4d6b1f", "#fffdf9", "#ff7a33", "#0d0d0e"]
        },
        defaultTheme: "auto",

        /*
         * פריסה (1280x720, בלי בר החדשות):
         *   ┌──────────────┬───────────────────────────────┐
         *   │ שעון ומזג    │  הודעות ועד   │  שבת ומועדים  │
         *   │ אוויר        ├───────────────┴───────────────┤
         *   │ (392px)      │  סטטוס בניין (שורה אחת)        │
         *   └──────────────┴───────────────────────────────┘
         */
        layout: function (site, esc) {
            return '' +
'<div id="tv-stage">' +
'  <div class="main-wrapper">' +

     // עמודת השעון: שם הבניין, שעה, תאריך לועזי + עברי, מזג אוויר, נגן
'    <aside class="hero-col">' +
'      <header class="identity">' +
'        <h1 class="project-name">' + esc(site.name) + '</h1>' +
'        <div class="area-line">' + esc(site.area) + ' · ' + esc(site.city) + '</div>' +
'      </header>' +
'      <div class="clock-section">' +
'        <div id="time" class="big-time">--:--</div>' +
'        <div id="date" class="date-line">טוען...</div>' +
'        <div id="hebrew-date" class="hebrew-date"></div>' +
'      </div>' +
'      <section class="weather-card" aria-label="מזג אוויר">' +
'        <div class="current-main">' +
'          <span id="main-weather-icon" class="material-symbols-outlined main-icon">wb_sunny</span>' +
'          <span class="main-temp">--°</span>' +
'          <div class="current-text">' +
'            <span id="weather-desc" class="weather-desc"></span>' +
'            <span id="weather-range" class="weather-range"></span>' +
'          </div>' +
'        </div>' +
'        <div id="forecast-container" class="forecast-section"></div>' +
'      </section>' +

       // נגן המוזיקה (core/radio.js). כפתורי הניהול והצבעים באותה שורה, מימין
'      <div class="hero-foot">' +
'        <div class="radio-bar" id="radio-bar">' +
'          <div class="radio-play" id="radio-toggle" role="button" aria-pressed="false" title="הפעל גלגלצ">' +
'            <div class="radio-icon-wrap"><span class="material-symbols-outlined" id="radio-icon">play_arrow</span></div>' +
'            <span class="radio-label" id="radio-label">גלגלצ</span>' +
'          </div>' +
'          <div class="radio-bars"><span></span><span></span><span></span></div>' +
'          <div class="radio-source-switch" role="radiogroup" aria-label="בחירת מקור מוזיקה">' +
'            <div class="radio-source-chip" data-source="galgalatz" role="radio" aria-checked="true" title="גלגלצ - שידור חי">' +
'              <span class="material-symbols-outlined">radio</span></div>' +
'            <div class="radio-source-chip" data-source="custom" role="radio" aria-checked="false" title="מוזיקת הבית">' +
'              <span class="material-symbols-outlined">library_music</span></div>' +
'          </div>' +
'        </div>' +
'      </div>' +
'    </aside>' +

     // הלוח: הודעות | שבת ומועדים, ומתחתם שורת סטטוס בניין
'    <div class="board">' +
'      <section class="panel notices-section">' +
'        <div class="section-header"><span class="material-symbols-outlined">campaign</span><h2>הודעות ועד בית</h2></div>' +
'        <div class="notices-list" id="notices-list"></div>' +
'        <div class="qr-container-mini" id="qr-codes"></div>' +
'      </section>' +
'      <section class="panel events-section">' +
'        <div class="section-header"><span class="material-symbols-outlined">calendar_month</span><h2>שבת ומועדים</h2></div>' +
'        <div class="shabbat-times" id="shabbat-times"></div>' +
'        <div class="events-list" id="holidays-list"><p class="panel-empty">טוען מועדים...</p></div>' +
'      </section>' +
'      <section class="panel building-status-section">' +
'        <div class="section-header"><span class="material-symbols-outlined">apartment</span><h2>סטטוס בניין</h2></div>' +
'        <div class="status-column-wrapper" id="building-status-list"></div>' +
'      </section>' +
'    </div>' +
'  </div>' +

   // כפתור המנעול (core/admin_panel.js) ובחירת ערכת צבעים (core/themes.js)
'  <div class="admin-toggle-btn" id="admin-btn" role="button" title="מצב ניהול - עריכת הודעות וסטטוס">' +
'    <span class="material-symbols-outlined">lock</span></div>' +
'  <div class="theme-picker-btn" id="theme-picker-btn" role="button" title="בחירת ערכת צבעים">' +
'    <span class="material-symbols-outlined">palette</span></div>' +
'  <div class="theme-picker-panel" id="theme-picker-panel"><div class="theme-picker-title">ערכת צבעים</div></div>' +

   // בר החדשות (core/news.js)
'  <footer class="news-bar">' +
'    <div class="logo-area"><img src="https://ynet-pic1.yit.co.il/picserver5/wcm_upload/2024/07/09/B1LH3j5DR/new_logo_gif_ynet.gif" alt="ynet"></div>' +
'    <div class="ticker-container"><div id="status-msg">טוען כותרות...</div><div id="ticker" class="ticker-track"></div></div>' +
'  </footer>' +
'</div>';
        },

        render: {
            // מזג אוויר נוכחי + 7 עמודות טווח (מינימום-מקסימום) על סקאלה אחת לכל השבוע,
            // כך שאפשר להשוות ימים לפי גובה הפס
            weather: function (data) {
                var c = data.current;
                var today = data.days[0];
                var tempEl = document.querySelector(".main-temp");
                if (tempEl) tempEl.textContent = c ? temp(c.temp) : "--°";
                $("main-weather-icon").textContent = c ? DashboardWeather.materialIcon(c.code, c.isDay)
                    : today.code != null ? DashboardWeather.materialIcon(today.code, true) : "wb_sunny";
                $("weather-desc").textContent = c ? DashboardWeather.text(c.code, c.isDay) : "";
                $("weather-range").textContent = today.max != null ? "היום " + today.min + "°–" + today.max + "°" : "";

                var known = data.days.filter(function (d) { return d.max != null; });
                var weekLow  = Math.min.apply(null, known.map(function (d) { return d.min; }));
                var weekHigh = Math.max.apply(null, known.map(function (d) { return d.max; }));
                var span = Math.max(weekHigh - weekLow, 1);

                $("forecast-container").innerHTML = data.days.map(function (d) {
                    var fill = d.max == null ? "" :
                        ' style="top:' + ((weekHigh - d.max) / span) * 100 + '%;bottom:' + ((d.min - weekLow) / span) * 100 + '%"';
                    return '<div class="forecast-item' + (d.isToday ? " is-today" : "") + '">' +
                        '<span class="fc-day">' + (d.isToday ? "היום" : SHORT_DAYS[d.weekday]) + '</span>' +
                        '<span class="material-symbols-outlined fc-icon">' +
                            (d.code != null ? DashboardWeather.materialIcon(d.code, true) : "cloud") + '</span>' +
                        '<span class="fc-max">' + temp(d.max) + '</span>' +
                        '<span class="fc-track"><span class="fc-fill"' + fill + '></span></span>' +
                        '<span class="fc-min">' + temp(d.min) + '</span>' +
                    '</div>';
                }).join("");
            },

            shabbat: function (data) {
                var box = $("shabbat-times");
                if (!data) { box.innerHTML = ""; return; }
                box.innerHTML =
                    '<div class="shabbat-card">' +
                        '<div class="shabbat-title">' +
                            '<span class="material-symbols-outlined">nightlight</span>' +
                            '<span>' + Dashboard.esc(data.parasha || "שבת") + '</span>' +
                        '</div>' +
                        '<div class="shabbat-countdown" data-shabbat-countdown></div>' +
                        '<div class="shabbat-times-row">' +
                            '<div class="shabbat-time shabbat-in"><span class="shabbat-label">כניסת שבת</span>' +
                                '<span class="shabbat-value">' + formatTime(data.candles) + '</span></div>' +
                            '<div class="shabbat-time shabbat-out"><span class="shabbat-label">צאת שבת</span>' +
                                '<span class="shabbat-value">' + formatTime(data.havdalah) + '</span></div>' +
                        '</div>' +
                    '</div>';
            },

            holidays: function (list) {
                var box = $("holidays-list");
                if (!list) {
                    box.innerHTML = '<p class="panel-empty">לא הצלחנו לטעון את המועדים. ננסה שוב ברענון הבא.</p>';
                    return;
                }
                box.innerHTML = list.map(function (ev) {
                    return '<div class="event-card">' +
                        '<div class="event-date">' +
                            '<span class="day">' + ev.date.getDate() + '</span>' +
                            '<span class="month">' + MONTH_NAMES[ev.date.getMonth()] + '</span>' +
                        '</div>' +
                        '<div class="event-info">' +
                            '<h4>' + Dashboard.esc(ev.title) + '</h4>' +
                            '<p class="' + (ev.days <= 2 ? "is-soon" : "") + '">' + DashboardHebcal.daysAway(ev.days) + '</p>' +
                        '</div>' +
                    '</div>';
                }).join("") || '<p class="panel-empty">אין מועדים קרובים</p>';
            },

            qr: function (entries) {
                return entries.map(function (e) {
                    return '<div class="qr-item"><span class="qr-img">' + e.img + '</span>' +
                           '<span class="qr-label">' + Dashboard.esc(e.label) + '</span></div>';
                }).join("");
            }
        }
    });
})();
