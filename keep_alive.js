// מונע מהמסך של הסטרימר/הקיוסק (Fully Kiosk, TVBro, Android TV, כרום רגיל)
// להירדם - הדשבורד רץ לבד על מסך כל היום בלי שום אינטראקציה של משתמש
// שהייתה מאותתת למערכת ההפעלה שהמסך "בשימוש".
// שימוש ב-Screen Wake Lock API: מבקשים מהדפדפן שהמסך יישאר דלוק
// כל עוד הדף גלוי. אם המכשיר עדיין נרדם, כדאי לבדוק גם את ההגדרה
// "Keep Screen On" באפליקציית הקיוסק עצמה (Fully Kiosk Browser > Settings > Screen) -
// זו הדרך הכי אמינה כי היא לא תלויה בתמיכת הדפדפן ב-API הזה.
(function () {
    if (!("wakeLock" in navigator)) return;

    var wakeLock = null;

    function requestWakeLock() {
        navigator.wakeLock.request("screen").then(function (lock) {
            wakeLock = lock;
            wakeLock.addEventListener("release", function () {
                wakeLock = null;
            });
        }).catch(function () {
            // הבקשה נדחתה (לרוב כי הדף לא בפוקוס כרגע) - תיבדק שוב ב-visibilitychange
        });
    }

    // ה-Wake Lock משתחרר אוטומטית כשהדף מוסתר, ולכן צריך לבקש אותו
    // מחדש בכל פעם שהוא חוזר לגלוי
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible" && !wakeLock) {
            requestWakeLock();
        }
    });

    requestWakeLock();
})();
