// בחירת ערכת צבעים לדשבורד - הבחירה נשמרת ב-localStorage ונטענת מחדש בכל ביקור
(function () {
    const STORAGE_KEY = "dashboard-theme";

    const DEFAULT_THEME = "gold";

    // הצבעים ב-dots הם רק לתצוגת הנקודות בפאנל הבחירה (הדגשה / משני / רקע).
    // הפלטה האמיתית מוגדרת ב-design_improved.css בסעיף 2ב.
    const THEMES = [
        { id: "gold",     label: "זהב קלאסי",         cls: "theme-gold",     dots: ["#d4a84b", "#7ab0e8", "#0d0f14"] },
        { id: "royal",    label: "כחול מלכותי",       cls: "theme-royal",    dots: ["#6ea8ff", "#e0b170", "#0a1120"] },
        { id: "bordeaux", label: "בורדו",             cls: "theme-bordeaux", dots: ["#e58ba2", "#d9a066", "#150c10"] },
        { id: "petrol",   label: "פטרול",             cls: "theme-petrol",   dots: ["#35c4d8", "#e2a367", "#07171b"] },
        { id: "day",      label: "מצב יום - שמש חזקה", cls: "theme-day",      dots: ["#d97706", "#1d4ed8", "#ffffff"], forceLight: true },
    ];

    // מזהה שמור מגרסה ישנה (steel / emerald / mono) חוזר לברירת המחדל
    function resolveId(id) {
        return THEMES.some(t => t.id === id) ? id : DEFAULT_THEME;
    }

    function applyTheme(id) {
        THEMES.forEach(t => document.body.classList.remove(t.cls));
        const theme = THEMES.find(t => t.id === resolveId(id));
        document.body.classList.add(theme.cls);
        document.body.classList.toggle("dark-mode", !theme.forceLight);
        localStorage.setItem(STORAGE_KEY, theme.id);
        renderPanel(theme.id);
    }

    function renderPanel(activeId) {
        const panel = document.getElementById("theme-picker-panel");
        if (!panel) return;
        panel.querySelectorAll(".theme-swatch-row").forEach(el => el.remove());

        THEMES.forEach(theme => {
            const row = document.createElement("div");
            row.className = "theme-swatch-row" + (theme.id === activeId ? " is-selected" : "");

            const dots = document.createElement("div");
            dots.className = "theme-swatch-dots";
            theme.dots.forEach(color => {
                const dot = document.createElement("span");
                dot.style.background = color;
                dots.appendChild(dot);
            });

            const label = document.createElement("span");
            label.className = "theme-swatch-label";
            label.textContent = theme.label;

            const check = document.createElement("span");
            check.className = "material-symbols-outlined theme-swatch-check";
            check.textContent = "check_circle";

            row.appendChild(dots);
            row.appendChild(label);
            row.appendChild(check);
            row.addEventListener("click", () => applyTheme(theme.id));

            panel.appendChild(row);
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        const btn   = document.getElementById("theme-picker-btn");
        const panel = document.getElementById("theme-picker-panel");
        if (!btn || !panel) return;

        // applyTheme (ולא רק renderPanel) כדי שמזהה ישן/לא מוכר ב-localStorage
        // יתוקן לברירת המחדל גם ב-class של ה-body וגם בשמירה
        applyTheme(resolveId(localStorage.getItem(STORAGE_KEY)));

        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            panel.classList.toggle("is-open");
        });
        document.addEventListener("click", (e) => {
            if (!panel.contains(e.target) && e.target !== btn) {
                panel.classList.remove("is-open");
            }
        });
    });
})();
