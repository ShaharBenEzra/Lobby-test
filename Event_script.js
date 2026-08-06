/*
 * Event_script.js
 * ─────────────────────────────────────────────────────────
 * מה זה עושה:
 *   מושך את החגים והמועדים העבריים הקרובים ומציג אותם
 *   בעמודת "מועדים ואירועים" בדשבורד
 *
 * API: https://www.hebcal.com (חינמי לחלוטין, ללא צורך במפתח)
 * תדירות: נטען פעם אחת בטעינת הדף (החגים לא משתנים תוך כדי)
 *
 * פרמטרים של ה-API:
 *   maj=on  → חגים מרכזיים (פסח, ראש השנה וכו')
 *   min=on  → מועדים קטנים (ראשי חודשים וכו')
 *   lg=he   → שמות בעברית
 *   year=now, month=all → כל השנה הנוכחית
 * ─────────────────────────────────────────────────────────
 */

const MONTH_NAMES = [
    "ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני",
    "יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"
];

async function fetchHebrewHolidays() {
    const container = document.getElementById('holidays-list');
    if (!container) return;

    const url = 'https://www.hebcal.com/hebcal'
              + '?v=1&cfg=json&maj=on&min=on&mod=on'
              + '&year=now&month=all&lg=he';

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('שגיאת שרת');
        const data = await response.json();

        const now = new Date();

        // מסנן רק אירועים עתידיים, לוקח 3 הקרובים ביותר
        const upcoming = data.items
            .filter(item => new Date(item.date) >= now)
            .slice(0, 3);

        // בניית ה-HTML בפעולה אחת (יעיל יותר מ-appendChild בלולאה)
        let html = '';
        upcoming.forEach(event => {
            const eventDate = new Date(event.date);
            html += `
                <div class="event-card">
                    <div class="event-date">
                        <span class="day">${eventDate.getDate()}</span>
                        <span class="month">${MONTH_NAMES[eventDate.getMonth()]}</span>
                    </div>
                    <div class="event-info">
                        <h4>${event.title}</h4>
                        <p>חג / מועד</p>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || '<p style="padding:15px;color:#999">אין מועדים קרובים</p>';

    } catch (error) {
        console.error("שגיאה בטעינת מועדים:", error);
        container.innerHTML = '<p style="padding:15px;color:#999">שגיאה בטעינת מועדים</p>';
    }
}

/*
 * ─────────────────────────────────────────────────────────
 * לוח כניסת/יציאת שבת
 *   נמשך מ-hebcal לפי קואורדינטות ראשון לציון,
 *   ומציג את זמני הדלקת נרות והבדלה הקרובים.
 * ─────────────────────────────────────────────────────────
 */

const SHABBAT_URL = 'https://www.hebcal.com/shabbat'
                   + '?cfg=json&geo=pos&latitude=31.9730&longitude=34.7925'
                   + '&tzid=Asia/Jerusalem&M=on&lg=he';

function formatShabbatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

async function fetchShabbatTimes() {
    const container = document.getElementById('shabbat-times');
    if (!container) return;

    try {
        const response = await fetch(SHABBAT_URL);
        if (!response.ok) throw new Error('שגיאת שרת');
        const data = await response.json();

        const candles  = data.items.find(item => item.category === 'candles');
        const havdalah = data.items.find(item => item.category === 'havdalah');
        const parasha  = data.items.find(item => item.category === 'parashat');

        if (!candles || !havdalah) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="shabbat-card">
                <div class="shabbat-title">
                    <span class="material-symbols-outlined">nightlight</span>
                    <span>שבת${parasha ? ' — ' + parasha.hebrew : ''}</span>
                </div>
                <div class="shabbat-times-row">
                    <div class="shabbat-time shabbat-in">
                        <span class="shabbat-label">כניסת שבת</span>
                        <span class="shabbat-value">${formatShabbatTime(candles.date)}</span>
                    </div>
                    <div class="shabbat-time shabbat-out">
                        <span class="shabbat-label">צאת שבת</span>
                        <span class="shabbat-value">${formatShabbatTime(havdalah.date)}</span>
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error("שגיאה בטעינת זמני שבת:", error);
        container.innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', fetchHebrewHolidays);
document.addEventListener('DOMContentLoaded', fetchShabbatTimes);
