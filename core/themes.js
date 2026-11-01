/*
 * themes.js - פאנל בחירת ערכת הצבעים (הכפתור #theme-picker-btn והפאנל #theme-picker-panel).
 *
 * הערכות עצמן מוגדרות בסקין (themes + autoTheme ב-skins/<סקין>/skin.js),
 * והחלתן ושמירתן - ב-Dashboard.theme (core/dashboard.js).
 *
 * שורה בפאנל: Dashboard.render("themeRow", option, selected) של הסקין, ואם אין
 * לו - השורה הבסיסית (.theme-swatch-row). השורות נכנסות ל-#theme-picker-rows,
 * ואם אין כזה - ישר לפאנל, אחרי הכותרת שלו.
 */
(function () {
    "use strict";

    var btn = document.getElementById("theme-picker-btn");
    var panel = document.getElementById("theme-picker-panel");
    if (!btn || !panel) return;
    var rowsBox = document.getElementById("theme-picker-rows") || panel;

    var skin = Dashboard.skin();
    var AUTO = Dashboard.theme.AUTO;

    function options() {
        var list = Dashboard.theme.list().slice();
        if (Dashboard.theme.hasAuto()) {
            list.unshift({ id: AUTO, label: skin.autoTheme.label, dots: skin.autoTheme.dots, isAuto: true });
        }
        return list;
    }

    function basicRow(option, selected) {
        var row = document.createElement("div");
        row.className = "theme-swatch-row" + (selected ? " is-selected" : "") + (option.isAuto ? " is-auto" : "");

        var dots = document.createElement("div");
        dots.className = "theme-swatch-dots";
        option.dots.forEach(function (color) {
            var dot = document.createElement("span");
            dot.style.background = color;
            dots.appendChild(dot);
        });

        var label = document.createElement("span");
        label.className = "theme-swatch-label";
        label.textContent = option.label;

        var check = document.createElement("span");
        check.className = "material-symbols-outlined theme-swatch-check";
        check.textContent = "check_circle";

        row.appendChild(dots);
        row.appendChild(label);
        row.appendChild(check);
        return row;
    }

    function renderRows(activeId) {
        rowsBox.querySelectorAll("[data-theme-row]").forEach(function (el) { el.remove(); });
        options().forEach(function (option) {
            var selected = option.id === activeId;
            var row = Dashboard.render("themeRow", option, selected) || basicRow(option, selected);
            row.setAttribute("data-theme-row", option.id);
            row.addEventListener("click", function (e) {
                e.stopPropagation();
                renderRows(Dashboard.theme.apply(option.id, true).selected);
            });
            rowsBox.appendChild(row);
        });
    }

    // באוטומטי: בדיקה כל דקה (מעבר בזריחה/שקיעה ובשעות ההחשכה),
    // ומיד כשמגיעות שעות זריחה ושקיעה חדשות מ-core/weather.js
    function refreshAuto() {
        if (Dashboard.theme.saved() === AUTO) Dashboard.theme.apply(AUTO, false);
    }

    renderRows(Dashboard.theme.saved());
    setInterval(refreshAuto, 60 * 1000);
    window.addEventListener("dashboard-sun", refreshAuto);

    btn.addEventListener("click", function (e) {
        e.stopPropagation();
        panel.classList.toggle("is-open");
    });
    document.addEventListener("click", function (e) {
        if (!panel.contains(e.target) && !btn.contains(e.target)) panel.classList.remove("is-open");
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") panel.classList.remove("is-open");
    });
})();
