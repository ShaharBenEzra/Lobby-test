// רענון אוטומטי של הדשבורד כל כמה שעות - מבטיח שמסך שרץ כל היום
// יישאר מעודכן (וגם משחרר דליפות זיכרון של ריצה ארוכה).
//
// למה JS ולא <meta http-equiv="refresh">: רענון של הדפדפן באמצע עריכה
// של האדמין היה מוחק לו את מה שהקליד. טיימר ב-JS אפשר להשהות -
// admin_panel.js קורא ל-AutoRefresh.pause() כשחלון העריכה נפתח,
// ול-resume() כשהוא נסגר. פרק הזמן נספר מחדש, כך שהרענון אף פעם
// לא קופץ מיד אחרי סגירת החלון.
window.AutoRefresh = (function () {
    "use strict";

    var HOURS = 4;
    var INTERVAL_MS = HOURS * 60 * 60 * 1000;

    var timer = null;

    function schedule() {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(function () {
            location.reload();
        }, INTERVAL_MS);
    }

    function pause() {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    }

    schedule();

    return {
        pause: pause,
        resume: schedule   // מאתחל את הספירה מהתחלה
    };
})();
