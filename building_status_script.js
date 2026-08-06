// בונה את כרטיסי הסטטוס בעמודה השלישית מהנתונים של AdminStore
// (ברירת מחדל מ-building_status_data.js, או הגרסה שהאדמין ערך מהמסך).
//
// הציור נעשה בפונקציה render() שאפשר לקרוא לה שוב ושוב - כך שכשהאדמין
// שומר שינוי, העמודה מתעדכנת מיד בלי רפרש לדף.
window.DashboardBuildingStatus = (function () {
    "use strict";

    function buildItem(entry) {
        var item = document.createElement("div");
        item.className = "status-item-mini" + (entry.state === "good" ? " is-active" : "");

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

        item.appendChild(icon);
        item.appendChild(info);
        return item;
    }

    function render() {
        var container = document.getElementById("building-status-list");
        if (!container || !window.AdminStore) return;

        container.innerHTML = "";
        AdminStore.getStatus().forEach(function (entry) {
            container.appendChild(buildItem(entry));
        });
    }

    render();
    if (window.AdminStore) AdminStore.onChange(render);

    return { render: render };
})();
