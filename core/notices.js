/*
 * notices.js - "הודעות ועד בית" מהנתונים של AdminStore
 * (ברירת מחדל מ-sites/<בניין>/notices_data.js, או מה שהוועד פרסם מפאנל הניהול).
 *
 * כרטיס הודעה: Dashboard.render("notice", notice) של הסקין, ואם אין לו -
 * הכרטיס הבסיסי שלמטה (.notice-item, h3, p).
 *
 * אם ההודעות לא נכנסות בגובה הזמין - עוברים לגלילה רציפה במהירות קבועה
 * (פיקסלים לשנייה), כך שאין צורך לכייל ידנית בכל פעם שמוסיפים הודעה.
 * render() נקרא שוב בכל שמירה של הוועד - העמודה מתעדכנת בלי רענון לדף.
 */
window.DashboardNotices = (function () {
    "use strict";

    var PX_PER_SECOND = 24;

    var resizeObserver = null;   // נשמר כדי לנתק אותו לפני כל ציור מחדש

    function basicItem(notice) {
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

    function buildItem(notice) {
        return Dashboard.render("notice", notice) || basicItem(notice);
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
        container.classList.remove("has-scroll");
        var track = document.createElement("div");
        track.className = "notices-track";
        notices.forEach(function (notice) { track.appendChild(buildItem(notice)); });
        container.appendChild(track);

        // במקום לנחש "מתי בטוח למדוד" (פונטים ואייקונים נטענים א-סינכרונית) -
        // ResizeObserver בודק שוב בכל שינוי גובה אמיתי, עד שמתגלה גלישה.
        // אז עוברים לגלילה ומפסיקים לעקוב.
        var converted = false;
        function checkOverflow() {
            if (converted) return;
            if (track.scrollHeight <= container.clientHeight) return;
            converted = true;

            // הרווח בין הכרטיסים נכלל, כדי שהלולאה תהיה חלקה בלי קפיצה
            var gap = parseFloat(getComputedStyle(track).rowGap) || 0;
            var singleSetHeight = track.scrollHeight + gap;
            notices.forEach(function (notice) { track.appendChild(buildItem(notice)); });

            track.style.setProperty("--notices-scroll-duration", (singleSetHeight / PX_PER_SECOND).toFixed(1) + "s");
            track.classList.add("is-scrolling");
            container.classList.add("has-scroll");

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
            window.addEventListener("load", function () { setTimeout(checkOverflow, 300); });
        }
        checkOverflow();
    }

    render();
    if (window.AdminStore) AdminStore.onChange(render);

    return { render: render };
})();
