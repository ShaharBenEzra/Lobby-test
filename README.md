# דשבורד לובי - קוד אחד לכל הבניינים

קוד אחד, שלושה עיצובים (סקינים), וכל בניין בוחר את שלו. תיקון באג או שיפור
בלוגיקה נעשים פעם אחת ב-`core/` וחלים על כל הבניינים ועל כל הסקינים.

```
index.html              דף אחד לכולם
core/                   הלוגיקה - משותפת לכל הסקינים
sites/                  בניין = תיקייה: שם, כתובת, QR, הודעות, סקין, ערכת צבעים
skins/                  סקין = תיקייה: מבנה HTML, CSS, 3 ערכות צבעים (skins.js = הרשימה)
netlify/                הפונקציות (ניהול, תוכן, Ynet) - ראו ADMIN_SETUP.md
Custom Music.mp3        "מוזיקת הבית" בנגן
```

## איזה בניין ואיזה סקין מוצגים

| | איך בוחרים |
|---|---|
| **בניין** | `?site=tormus8` בכתובת → לפי הדומיין (`hosts` ב-`sites/sites.js`) → `default` |
| **סקין** | **רק בחלון הניהול** (לשונית "תצוגה", עם הסיסמה) → עד שהוועד בוחר: `skin` ב-`site.js` של הבניין |
| **ערכת צבעים** | מה שנבחר מהפאנל שעל המסך (נשמר במכשיר) → `?theme=` → `theme` ב-`site.js` |

`?site=` חל רק על הכתובת שבה הוא כתוב - לא נשמר. מסך קיוסק שצריך בניין
קבוע: פשוט לשים את זה בכתובת שלו, למשל `https://.../?site=tormus8`.

לבדיקה מקומית: `python -m http.server` בתיקייה הזו, ואז
`http://localhost:8000/?site=khelmonit4`.

### בחירת הסקין

אין כפתור על המסך ואין פרמטר בכתובת - כדי שמי שעובר בלובי לא ישנה את כל
העיצוב. הוועד בוחר בחלון הניהול: מנעול 🔒 → לשונית **"תצוגה"** → **פרסום**.

* הבחירה נשמרת יחד עם ההודעות והסטטוס (לכל בניין בנפרד) ומגיעה לכל המסכים
  במשיכה הבאה שלהם (עד 2 דקות). מסך שמקבל סקין חדש מתרענן לבד.
* מסך שחלון הניהול פתוח עליו לא מתרענן באמצע עריכה - הסקין מתחלף כשסוגרים.
* בהרצה מקומית ("שמירה מקומית") הבחירה חלה רק על המכשיר הזה - נוח לראות
  איך סקין נראה לפני שמפרסמים.
* `skin` ב-`site.js` הוא רק ברירת המחדל עד הבחירה הראשונה בחלון הניהול.

## הבניינים (`sites/`)

| תיקייה | בניין | סקין | ערכת צבעים | QR |
|---|---|---|---|---|
| `tormus6` | התורמוס 6 | `tormus6` | אוטומטי | 3 (תמונות) |
| `tormus8` | התורמוס 8 | `tormus8` | זהב | 1 (תמונה) |
| `khelmonit4` | החלמונית 4 | `khelmonit` | זהב | 3 (קישורים) + מנוי |

**בניין חדש:** מעתיקים תיקייה קיימת, משנים את `site.js` ואת קבצי ההודעות
והסטטוס, ומוסיפים את שם התיקייה ל-`sites` ב-`sites/sites.js`.

ההסבר המלא לכל שדה ב-`site.js` נמצא בראש `sites/tormus6/site.js`.

### קודי QR

1 עד 3 קודים, ב-`qr` של `site.js`. כל סקין מסדר אותם לפי הכמות:

```js
qr: [
    { label: "וואטסאפ דיירי הבניין", image: "qr_tenants_whatsapp.png" },  // תמונה מוכנה בתיקיית הבניין
    { label: "תשלום ועד ב-Paybox",   url: "https://..." }                  // או קישור - הקוד נוצר ממנו
],
```

`[]` = בלי קודים. `sub` = שורת משנה (רק בסקין `khelmonit`, כשיש קוד אחד).

## הסקינים (`skins/`)

| סקין | מבנה | ערכות צבעים | "אוטומטי" |
|---|---|---|---|
| `tormus6` | שעון גדול במסגרת, עמודת מזג אוויר, לוח בצד | שקד · גחלים · יין ושמפניה | שקד ביום, גחלים בלילה |
| `tormus8` | כותרת מזג אוויר לרוחב, 3 עמודות | זהב קלאסי · כחול מלכותי · מצב יום | מצב יום ביום, זהב בלילה |
| `khelmonit` | זכוכית כהה, Tailwind ו-Lucide, 3 עמודות | זהב קלאסי · גרפיט וליים · חול וטרקוטה | חול ביום, זהב בלילה |

"אוטומטי" מחליף ערכה בזריחה ובשקיעה, ומחשיך את המסך בין 00:00 ל-05:00.

### מה יש בסקין (`skins/<סקין>/skin.js`)

```js
Dashboard.defineSkin({
    styles: [...],              // CSS וגופנים, נטענים ב-head
    themes: [                   // 3 ערכות. ה-CSS: body.theme-<id> ב-skin.css
        { id, label, dots: [צבעים לפאנל], light: true/false }
    ],
    autoTheme: { day, night, label, dots },   // או null - בלי "אוטומטי"
    defaultTheme: "auto",
    layout: function (site, esc) { return "<div id='tv-stage'>...</div>"; },
    render: { ... }             // איך לצייר נתונים שהליבה מביאה
});
```

**`layout`** מחזיר את מבנה ה-HTML. הליבה ממלאת אלמנטים לפי id, ומדלגת בשקט
על מה שאין:

| id | מי ממלא |
|---|---|
| `#time`, `#date`, `#hebrew-date` | `core/clock.js` |
| `#notices-list` | `core/notices.js` |
| `#building-status-list` | `core/status.js` |
| `#qr-codes` | `core/qr.js` (מקבל `data-count`) |
| `#side-image-window`, `#image-toggle-btn` | `core/side_image.js` |
| `#ticker`, `#status-msg` | `core/news.js` |
| `#radio-bar`, `#radio-toggle`, `#radio-icon`, `#radio-label`, `.radio-source-chip` | `core/radio.js` |
| `#admin-btn` | `core/admin_panel.js` |
| `#theme-picker-btn`, `#theme-picker-panel`, `#theme-picker-rows` | `core/themes.js` |
| `[data-shabbat-countdown]` | `core/hebcal.js` - "כניסת שבת בעוד..." |

**`render`** - פונקציות אופציונליות. מה שחסר - הליבה משתמשת בברירת מחדל:

| פונקציה | מקבלת | חובה? |
|---|---|---|
| `weather(data)` | `{ current: {temp, code, isDay}, days: [7 × {weekday, isToday, code, max, min}] }` | כן |
| `shabbat(data)` | `{ parasha, candles, havdalah }` או `null` | כן |
| `holidays(list)` | `[{ title, date, days }]`, `[]` = אין, `null` = שגיאה | כן |
| `qr(entries)` → HTML | `[{ label, sub, img }]` | לא |
| `notice(n)` → אלמנט | `{ title, body, urgent }` | לא |
| `status(entry, when)` → אלמנט | `{ icon, label, value, state }`, `"today"` / `"tomorrow"` / `""` | לא |
| `themeRow(option, selected)` → אלמנט | `{ id, label, dots, isAuto }` | לא |

עזרים לסקינים: `Dashboard.esc()`, `DashboardWeather.text()` / `.materialIcon()`,
`DashboardHebcal.daysAway()`.

## הליבה (`core/`)

| קובץ | מה |
|---|---|
| `dashboard.js` | בחירת בניין וסקין, טעינה, ערכת צבעים ו"אוטומטי" |
| `clock.js` | שעון, תאריך, תאריך עברי |
| `weather.js` | open-meteo - כל 30 דק׳, גיבוי במכשיר כשאין רשת |
| `hebcal.js` | זמני שבת, פרשה, 3 מועדים - כל 30 דק׳ ומיד כשהמסך מתעורר |
| `news.js` | Ynet - דרך פונקציית Netlify, עם פרוקסים כגיבוי |
| `notices.js`, `status.js` | הודעות וסטטוס, מ-`admin_store.js` |
| `qr.js`, `side_image.js`, `themes.js` | QR, חלון תמונה, פאנל ערכות צבעים |
| `radio.js` | גלגלצ / מוזיקת הבית |
| `admin_*.js`, `admin.css` | מצב ניהול - ADMIN_SETUP.md |
| `subscription_guard.js` | מסך "נא לחדש מנוי" |
| `stage_scale.js`, `keep_alive.js`, `auto_refresh.js` | התאמה למסך, מסך דלוק, רענון כל 4 שעות |

כל קובץ עטוף בפונקציה משלו, כדי שקבועים בשם זהה בשני קבצים לא יתנגשו.
