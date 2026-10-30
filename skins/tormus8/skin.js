/*
 * סקין "התורמוס 8" - כותרת מזג אוויר + תחזית + שעון לרוחב המסך, ומתחתיה
 * לוח של 3 עמודות: הודעות ונגן | שבת ומועדים | סטטוס בניין וחלון תמונה.
 *
 * החוזה של סקין (styles / themes / autoTheme / layout / render) - README.md.
 */
(function () {
    "use strict";

    var DAYS = ["יום א׳", "יום ב׳", "יום ג׳", "יום ד׳", "יום ה׳", "יום ו׳", "שבת"];
    var MONTH_NAMES = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני",
                       "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];

    function $(id) { return document.getElementById(id); }

    function formatTime(date) {
        return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    }

    Dashboard.defineSkin({
        styles: [
            "https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700;800;900&display=swap",
            "skins/tormus8/skin.css"
        ],

        themes: [
            { id: "gold",  label: "זהב קלאסי",          dots: ["#d4a84b", "#7ab0e8", "#0d0f14"] },
            { id: "royal", label: "כחול מלכותי",        dots: ["#6ea8ff", "#e0b170", "#0a1120"] },
            { id: "day",   label: "מצב יום - שמש חזקה", dots: ["#d97706", "#1d4ed8", "#ffffff"], light: true }
        ],
        autoTheme: {
            day: "day",
            night: "gold",
            label: "אוטומטי: בהיר ביום, זהב בלילה",
            dots: ["#d97706", "#ffffff", "#d4a84b", "#0d0f14"]
        },
        defaultTheme: "gold",

        layout: function (site, esc) {
            return '' +
'<div id="tv-stage">' +
'  <div class="main-wrapper">' +

     // כותרת: שם הבניין וטמפרטורה | תחזית 7 ימים | שעון ותאריך
'    <header class="weather-container">' +
'      <div class="current-weather-section">' +
'        <div class="location-info">' +
'          <div class="city-name">' + esc(site.city) + '</div>' +
'          <div class="project-name">' + esc(site.name) + '</div>' +
'          <div class="area-name">' + esc(site.area) + '</div>' +
'        </div>' +
'        <div class="current-main">' +
'          <span id="main-weather-icon" class="material-symbols-outlined main-icon">wb_sunny</span>' +
'          <span class="main-temp">--°</span>' +
'        </div>' +
'      </div>' +
'      <div id="forecast-container" class="forecast-section"></div>' +
'      <div class="clock-section">' +
'        <div id="time" class="big-time">--:--</div>' +
'        <div id="date" class="date-chip">טוען...</div>' +
'      </div>' +
'    </header>' +

'    <div class="middle-content">' +
'      <div class="unified-board">' +

         // עמודה 1: הודעות ועד בית + נגן מוזיקה + קודי QR
'        <section class="notices-section">' +
'          <div class="section-header"><span class="material-symbols-outlined">notifications</span><h2>הודעות ועד בית</h2></div>' +
'          <div class="radio-bar" id="radio-bar">' +
'            <div class="radio-play" id="radio-toggle" role="button" aria-pressed="false" title="הפעל גלגלצ">' +
'              <div class="radio-icon-wrap"><span class="material-symbols-outlined" id="radio-icon">play_arrow</span></div>' +
'              <span class="radio-label" id="radio-label">גלגלצ</span>' +
'            </div>' +
'            <div class="radio-bars"><span></span><span></span><span></span></div>' +
'            <div class="radio-source-switch" role="radiogroup" aria-label="בחירת מקור מוזיקה">' +
'              <div class="radio-source-chip" data-source="galgalatz" role="radio" aria-checked="true" title="גלגלצ - שידור חי">' +
'                <span class="material-symbols-outlined">radio</span></div>' +
'              <div class="radio-source-chip" data-source="custom" role="radio" aria-checked="false" title="מוזיקת הבית">' +
'                <span class="material-symbols-outlined">library_music</span></div>' +
'            </div>' +
'          </div>' +
'          <div class="notices-list" id="notices-list"></div>' +
'          <div class="qr-container-mini" id="qr-codes"></div>' +
'        </section>' +

'        <div class="vertical-divider"></div>' +

         // עמודה 2: שבת ומועדים
'        <section class="events-section">' +
'          <div class="section-header"><span class="material-symbols-outlined">calendar_month</span><h2>מועדים ואירועים</h2></div>' +
'          <div class="shabbat-times" id="shabbat-times"></div>' +
'          <div class="events-list" id="holidays-list"><p class="panel-empty">טוען מועדים...</p></div>' +
'        </section>' +

'        <div class="vertical-divider"></div>' +

         // עמודה 3: סטטוס בניין + חלון תמונה (core/side_image.js)
'        <section class="building-status-section">' +
'          <div class="section-header">' +
'            <span class="material-symbols-outlined">apartment</span><h2>סטטוס בניין</h2>' +
'            <div class="image-toggle-btn" id="image-toggle-btn" role="button" aria-pressed="false" title="הצג/הסתר תמונה">' +
'              <span class="material-symbols-outlined" id="image-toggle-icon">image</span></div>' +
'          </div>' +
'          <div class="status-column-wrapper" id="building-status-list"></div>' +
'          <div class="side-image-window" id="side-image-window"></div>' +
'        </section>' +
'      </div>' +
'    </div>' +
'  </div>' +

'  <div class="admin-toggle-btn" id="admin-btn" role="button" title="מצב ניהול - עריכת הודעות וסטטוס">' +
'    <span class="material-symbols-outlined">lock</span></div>' +
'  <div class="theme-picker-btn" id="theme-picker-btn" role="button" title="בחירת ערכת צבעים">' +
'    <span class="material-symbols-outlined">palette</span></div>' +
'  <div class="theme-picker-panel" id="theme-picker-panel"><div class="theme-picker-title">ערכת צבעים</div></div>' +

'  <footer class="news-bar">' +
'    <div class="logo-area"><img src="https://ynet-pic1.yit.co.il/picserver5/wcm_upload/2024/07/09/B1LH3j5DR/new_logo_gif_ynet.gif" alt="ynet"></div>' +
'    <div class="ticker-container"><div id="status-msg">טוען כותרות...</div><div id="ticker" class="ticker-track"></div></div>' +
'  </footer>' +
'</div>';
        },

        render: {
            weather: function (data) {
                var c = data.current;
                var tempEl = document.querySelector(".main-temp");
                if (tempEl) tempEl.textContent = c ? c.temp + "°" : "--°";
                $("main-weather-icon").textContent = c ? DashboardWeather.materialIcon(c.code, c.isDay) : "wb_sunny";

                $("forecast-container").innerHTML = data.days.map(function (d) {
                    return '<div class="forecast-item">' +
                        '<span class="fc-day">' + (d.isToday ? "היום" : DAYS[d.weekday]) + '</span>' +
                        '<span class="material-symbols-outlined fc-icon">' +
                            (d.code != null ? DashboardWeather.materialIcon(d.code, true) : "cloud") + '</span>' +
                        '<span class="fc-temp">' + (d.max != null ? d.max + "°" : "--°") + '</span>' +
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
                            '<span>שבת' + (data.parasha ? " — " + Dashboard.esc(data.parasha) : "") + '</span>' +
                        '</div>' +
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
                    box.innerHTML = '<p class="panel-empty">שגיאה בטעינת מועדים</p>';
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

            // הכיתוב לפני התמונה (מעליה, כשיש קוד אחד)
            qr: function (entries) {
                return entries.map(function (e) {
                    return '<div class="qr-item"><span class="qr-label">' + Dashboard.esc(e.label) + '</span>' +
                           '<span class="qr-img">' + e.img + '</span></div>';
                }).join("");
            }
        }
    });
})();
