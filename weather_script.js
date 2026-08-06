/*
 * weather_script.js
 * ─────────────────────────────────────────────────────────
 * מה זה עושה:
 *   1. מושך מזג אוויר נוכחי + תחזית 7 ימים מ-open-meteo.com
 *   2. בונה את כרטיסי התחזית ב-HTML (forecast-container)
 *   3. מציג שעון ותאריך שמתעדכנים כל 10 שניות
 *
 * API: https://open-meteo.com (חינמי לחלוטין, ללא צורך במפתח)
 * תדירות עדכון מזג אוויר: כל 30 דקות
 *
 * לשינוי עיר: שנה את LAT ו-LON בלבד
 * ─────────────────────────────────────────────────────────
 */

// קואורדינטות ראשון לציון
const LAT = 31.97;
const LON = 34.81;

document.addEventListener('DOMContentLoaded', () => {

    // בניית מסגרת HTML לתחזית השבועית (7 פריטים ריקים בהתחלה)
    const forecastContainer = document.getElementById('forecast-container');
    if (forecastContainer) {
        forecastContainer.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            forecastContainer.innerHTML += `
                <div class="forecast-item">
                    <span class="fc-day">--</span>
                    <span class="material-symbols-outlined fc-icon">cloud</span>
                    <span class="fc-temp">--°</span>
                </div>
            `;
        }
    }

    // משיכת נתונים מהAPI ועדכון הממשק
    async function updateWeather() {
        try {
            const url = `https://api.open-meteo.com/v1/forecast`
                      + `?latitude=${LAT}&longitude=${LON}`
                      + `&current_weather=true`
                      + `&daily=weathercode,temperature_2m_max`
                      + `&timezone=auto`;

            const response = await fetch(url);
            const data = await response.json();

            // עדכון טמפרטורה ואייקון נוכחיים
            document.querySelector('.main-temp').textContent =
                `${Math.round(data.current_weather.temperature)}°`;
            document.getElementById('main-weather-icon').textContent =
                getWeatherIcon(data.current_weather.weathercode);

            // עדכון תחזית 7 ימים
            const daysHe = ["יום א׳","יום ב׳","יום ג׳","יום ד׳","יום ה׳","יום ו׳","שבת"];
            const todayIndex = new Date().getDay();
            const items = document.querySelectorAll('.forecast-item');

            items.forEach((item, i) => {
                const dayName = daysHe[(todayIndex + i) % 7];
                item.querySelector('.fc-day').textContent  = (i === 0) ? "היום" : dayName;
                item.querySelector('.fc-temp').textContent = `${Math.round(data.daily.temperature_2m_max[i])}°`;
                item.querySelector('.fc-icon').textContent = getWeatherIcon(data.daily.weathercode[i]);
            });

        } catch (error) {
            console.error("שגיאה בטעינת מזג האוויר:", error);
        }
    }

    /*
     * המרת קוד מזג אוויר (WMO) לאייקון Material Symbol
     * קודים: 0=שמש, 1-3=מעונן חלקית, 51-67=גשם, 95+=סופה
     */
    function getWeatherIcon(code) {
        if (code === 0)              return 'wb_sunny';
        if (code <= 3)               return 'partly_cloudy_day';
        if (code >= 51 && code <= 67) return 'rainy';
        if (code >= 95)              return 'thunderstorm';
        return 'cloud';
    }

    // שעון ותאריך
    function updateClock() {
        const now = new Date();
        const timeEl = document.getElementById('time');
        const dateEl = document.getElementById('date');
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        if (dateEl) dateEl.textContent = now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    // הפעלה ראשונית
    updateClock();
    updateWeather();

    setInterval(updateClock,   10000);    // שעון – כל 10 שניות
    setInterval(updateWeather, 1800000);  // מזג אוויר – כל 30 דקות
});
