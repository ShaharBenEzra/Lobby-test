// 1) אם SIDE_IMAGE (מ-side_image_data.js) לא ריק - טוען אותו לתוך חלון התמונה.
// 2) הצגה/הסתרה: אם SIDE_IMAGE_VISIBLE הוא true/false - זה קובע תמיד (שליטה
//    מרחוק בקוד) והכפתור נועל. אם הוא null - הכפתור בכותרת "סטטוס בניין"
//    שולט, והמצב נשמר ב-localStorage (נשאר גם אחרי הרפרש האוטומטי).
(function () {
    const STORAGE_KEY = "side-image-visible";

    const box = document.getElementById("side-image-window");
    const toggleBtn = document.getElementById("image-toggle-btn");
    const toggleIcon = document.getElementById("image-toggle-icon");
    if (!box || !toggleBtn || !toggleIcon) return;

    if (typeof SIDE_IMAGE !== "undefined" && SIDE_IMAGE) {
        const img = document.createElement("img");
        img.src = SIDE_IMAGE;
        img.alt = "";
        box.appendChild(img);
    }

    function applyState(visible) {
        box.classList.toggle("is-visible", visible);
        toggleBtn.classList.toggle("is-on", visible);
        toggleBtn.setAttribute("aria-pressed", String(visible));
        toggleIcon.textContent = visible ? "hide_image" : "image";
    }

    const hasRemoteOverride = typeof SIDE_IMAGE_VISIBLE === "boolean";

    if (hasRemoteOverride) {
        applyState(SIDE_IMAGE_VISIBLE);
        toggleBtn.classList.add("is-locked");
        toggleBtn.title = "נשלט מרחוק כרגע (SIDE_IMAGE_VISIBLE ב-side_image_data.js)";
        return;
    }

    let isVisible = localStorage.getItem(STORAGE_KEY) === "on";
    applyState(isVisible);

    toggleBtn.addEventListener("click", () => {
        isVisible = !isVisible;
        localStorage.setItem(STORAGE_KEY, isVisible ? "on" : "off");
        applyState(isVisible);
    });
})();
