/*
 * status.js - "סטטוס בניין" מהנתונים של AdminStore
 * (ברירת מחדל מ-sites/<בניין>/building_status_data.js, או מה שהוועד פרסם).
 *
 * כרטיס פריט: Dashboard.render("status", entry, when) של הסקין, ואם אין לו -
 * הכרטיס הבסיסי שלמטה. when = "today" / "tomorrow" / "" - לפי ימי השבוע
 * שבטקסט ("בימי ב׳, ד׳" ביום שני → "today").
 * render() נקרא שוב בכל שמירה של הוועד - העמודה מתעדכנת בלי רענון לדף.
 */
window.DashboardBuildingStatus = (function () {
    "use strict";

    var DAY_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו"];

    // אילו ימים מופיעים בטקסט ("בימי - ב׳, ד׳, ו׳" → [1, 3, 5]).
    // אות יום היא אות בודדת א-ו עם גרש (׳ או ') שלא באה אחרי אות אחרת,
    // ו"שבת" היא יום 6. טקסט בלי ימים (למשל "תקין ✓") מחזיר רשימה ריקה.
    function daysInText(text) {
        var days = [];
        var re = /(^|[^א-ת])([א-ו])['׳]/g;
        var match;
        while ((match = re.exec(text)) !== null) {
            days.push(DAY_LETTERS.indexOf(match[2]));
        }
        if (text.indexOf("שבת") !== -1) days.push(6);
        return days;
    }

    function whenLabel(text) {
        var days = daysInText(text || "");
        var today = new Date().getDay();
        if (days.indexOf(today) !== -1) return "today";
        if (days.indexOf((today + 1) % 7) !== -1) return "tomorrow";
        return "";
    }

    function basicItem(entry, when) {
        var item = document.createElement("div");
        item.className = "status-item-mini" + (entry.state === "good" ? " is-active" : "") + (when === "today" ? " is-today" : "");

        var icon = document.createElement("div");
        icon.className = "status-icon";
        var i = document.createElement("i");
        i.className = "fas fa-" + entry.icon;
        icon.appendChild(i);

        var label = document.createElement("span");
        label.className = "status-label";
        label.textContent = entry.label;

        var value = document.createElement("span");
        value.className = "status-value" +
            (entry.state === "good" ? " highlight" : entry.state === "warning" ? " status-warning" : "");
        value.textContent = entry.value;

        var info = document.createElement("div");
        info.className = "status-info";
        info.appendChild(label);
        info.appendChild(value);

        if (when) {
            var whenEl = document.createElement("span");
            whenEl.className = "status-when" + (when === "tomorrow" ? " is-tomorrow" : "");
            whenEl.textContent = when === "today" ? "היום" : "מחר";
            info.appendChild(whenEl);
        }

        item.appendChild(icon);
        item.appendChild(info);
        return item;
    }

    function render() {
        var container = document.getElementById("building-status-list");
        if (!container || !window.AdminStore) return;

        container.innerHTML = "";
        AdminStore.getStatus().forEach(function (entry) {
            var when = whenLabel(entry.value);
            container.appendChild(Dashboard.render("status", entry, when) || basicItem(entry, when));
        });
    }

    render();
    if (window.AdminStore) AdminStore.onChange(render);

    // "היום" / "מחר" מתחלפים בחצות - מסך שרץ כל היום מתעדכן לבד
    setInterval(render, 30 * 60 * 1000);

    return { render: render, whenLabel: whenLabel };
})();
