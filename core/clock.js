/*
 * clock.js - שעון, תאריך לועזי ותאריך עברי.
 * ממלא את #time, #date ו-#hebrew-date - כל אחד רק אם הסקין כולל אותו.
 * התאריך העברי מהממיר של hebcal.com, בלי הניקוד שה-API מחזיר.
 */
(function () {
    "use strict";

    function updateClock() {
        var now = new Date();
        var timeEl = document.getElementById("time");
        var dateEl = document.getElementById("date");
        if (timeEl) timeEl.textContent = now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
        if (dateEl) dateEl.textContent = now.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
    }

    // אם אין רשת - השורה פשוט נשארת כמו שהיא
    function updateHebrewDate() {
        var el = document.getElementById("hebrew-date");
        if (!el) return;
        var iso = Dashboard.localIso(new Date());
        fetch("https://www.hebcal.com/converter?cfg=json&date=" + iso + "&g2h=1&strict=1")
            .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
            .then(function (data) {
                if (data.hebrew) el.textContent = data.hebrew.replace(/[֑-ׇ]/g, "");
            })
            .catch(function (err) { console.error("שגיאה בטעינת התאריך העברי:", err); });
    }

    updateClock();
    updateHebrewDate();
    setInterval(updateClock, 10000);              // שעון – כל 10 שניות
    setInterval(updateHebrewDate, 30 * 60000);    // תאריך עברי – כל 30 דקות (מתחלף בחצות)

    // מסך קיוסק שחזר מ"שינה" מתעדכן מיד
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState !== "visible") return;
        updateClock();
        updateHebrewDate();
    });
})();
