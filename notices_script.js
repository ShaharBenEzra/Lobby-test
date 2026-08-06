// בונה את כרטיסי ההודעות בעמודה הראשונה מהנתונים של AdminStore
// (ברירת מחדל מ-notices_data.js, או הגרסה שהאדמין ערך מהמסך).
//
// אם ההודעות לא נכנסות בגובה הזמין - עובר אוטומטית לגלילה רציפה במהירות
// קבועה (פיקסלים לשנייה), כך שאין צורך לכייל שוב ידנית בכל פעם שמוסיפים
// או מורידים הודעות.
//
// הציור נעשה בפונקציה render() שאפשר לקרוא לה שוב ושוב - כך שכשהאדמין
// שומר שינוי, העמודה מתעדכנת מיד בלי רפרש לדף.
window.DashboardNotices = (function () {
    "use strict";

    var PX_PER_SECOND = 24;

    var resizeObserver = null;   // נשמר כדי לנתק אותו לפני כל ציור מחדש

    function buildItem(notice) {
        var item = document.createElement("div");
        item.className = "notice-item" + (notice.urgent ? " active-notice" : "");

        var h3 = document.createElement("h3");
        h3.textContent = notice.title;

        var p = document.createElement("p");
        p.textContent = notice.body;

        item.appendChild(h3);
        item.appendChild(p);
        return item;
    }

    function render() {
        var container = document.getElementById("notices-list");
        if (!container || !window.AdminStore) return;

        // ציור חוזר: מנתקים observer קודם כדי שלא ימשיך לרוץ על track ישן
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        var notices = AdminStore.getNotices();

        container.innerHTML = "";
        var track = document.createElement("div");
        track.className = "notices-track";
        notices.forEach(function (notice) {
            track.appendChild(buildItem(notice));
        });
        container.appendChild(track);

        // במקום לנחש "מתי בטוח למדוד" (פונטים/תמונות נטענים א-סינכרונית ובזמנים
        // לא צפויים) - ResizeObserver מפעיל בדיקה מחדש בכל פעם שהגובה בפועל
        // באמת משתנה, עד שמתקבלת תוצאה סופית. ברגע שהתגלתה גלישה מפסיקים
        // לעקוב (אין יותר צורך ב-observer, מצב "גלילה" כבר קבוע).
        var converted = false;
        function checkOverflow() {
            if (converted) return;
            if (track.scrollHeight <= container.clientHeight) return;
            converted = true;

            var singleSetHeight = track.scrollHeight;
            notices.forEach(function (notice) {
                track.appendChild(buildItem(notice));
            });

            var duration = singleSetHeight / PX_PER_SECOND;
            track.style.setProperty("--notices-scroll-duration", duration.toFixed(1) + "s");
            track.classList.add("is-scrolling");

            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
            }
        }

        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(checkOverflow);
            resizeObserver.observe(track);
            resizeObserver.observe(container);
        } else {
            window.addEventListener("load", function () {
                setTimeout(checkOverflow, 300);
            });
        }
        checkOverflow();
    }

    render();
    if (window.AdminStore) AdminStore.onChange(render);

    return { render: render };
})();
