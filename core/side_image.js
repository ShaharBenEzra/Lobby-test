/*
 * side_image.js - חלון התמונה מתחת ל"סטטוס בניין" (בסקינים שיש בהם #side-image-window).
 *
 * ההגדרה: sideImage ב-sites/<בניין>/site.js
 *   src     - קובץ התמונה בתיקיית הבניין ("" = רק המסגרת, בלי תמונה)
 *   visible - true / false = תמיד מוצג / מוסתר (הכפתור שעל המסך ננעל)
 *             null = הכפתור שעל המסך קובע, והמצב נשמר במכשיר (נשאר גם אחרי רענון)
 * בלי sideImage בכלל - החלון והכפתור לא מוצגים.
 */
(function () {
    "use strict";

    var box = document.getElementById("side-image-window");
    var toggleBtn = document.getElementById("image-toggle-btn");
    var toggleIcon = document.getElementById("image-toggle-icon");
    if (!box || !toggleBtn) return;

    var config = Dashboard.site().sideImage;
    if (!config) {
        toggleBtn.hidden = true;
        return;
    }

    var STORAGE_KEY = "side-image-visible:" + Dashboard.site().id;

    if (config.src) {
        var img = document.createElement("img");
        img.src = Dashboard.asset(config.src);
        img.alt = "";
        box.appendChild(img);
    }

    function applyState(visible) {
        box.classList.toggle("is-visible", visible);
        toggleBtn.classList.toggle("is-on", visible);
        toggleBtn.setAttribute("aria-pressed", String(visible));
        if (toggleIcon) toggleIcon.textContent = visible ? "hide_image" : "image";
    }

    if (typeof config.visible === "boolean") {
        applyState(config.visible);
        toggleBtn.classList.add("is-locked");
        toggleBtn.title = "נשלט מרחוק כרגע (sideImage.visible ב-site.js)";
        return;
    }

    var isVisible = false;
    try { isVisible = localStorage.getItem(STORAGE_KEY) === "on"; } catch (e) {}
    applyState(isVisible);

    toggleBtn.addEventListener("click", function () {
        isVisible = !isVisible;
        try { localStorage.setItem(STORAGE_KEY, isVisible ? "on" : "off"); } catch (e) {}
        applyState(isVisible);
    });
})();
