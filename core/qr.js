/*
 * qr.js - קודי ה-QR של הבניין, מ-qr ב-sites/<בניין>/site.js.
 *
 * כל קוד הוא קישור (url - הקוד נוצר ממנו כאן, בעזרת qrcode-generator)
 * או תמונה מוכנה (image - קובץ בתיקיית הבניין).
 *
 * הסקין מצייר: Dashboard.render("qr", entries) ומחזיר HTML.
 *   entries = [{ label, sub, img }] - img הוא HTML מוכן של התמונה (img או svg)
 * הקופסה #qr-codes מקבלת data-count = מספר הקודים (0-3), כדי שה-CSS של
 * הסקין יתאים את הפריסה לקוד אחד, לשניים או לשלושה.
 */
(function () {
    "use strict";

    var MAX_CODES = 3;

    function qrImage(entry) {
        var alt = "QR - " + Dashboard.esc(entry.label);
        if (entry.image) {
            return '<img src="' + Dashboard.esc(Dashboard.asset(entry.image)) + '" alt="' + alt + '">';
        }
        if (entry.url && window.qrcode) {
            var qr = qrcode(0, "M");           // 0 = גודל אוטומטי לפי אורך הקישור
            qr.addData(entry.url);
            qr.make();
            return qr.createSvgTag({ cellSize: 2, margin: 0, scalable: true });
        }
        return "";
    }

    // הפריסה הבסיסית - לסקין שלא מגדיר render.qr
    function basicHtml(entries) {
        return entries.map(function (e) {
            return '<div class="qr-item">' + e.img +
                   '<span class="qr-label">' + Dashboard.esc(e.label) + '</span></div>';
        }).join("");
    }

    var box = document.getElementById("qr-codes");
    if (!box) return;

    var list = (Dashboard.site().qr || []).filter(function (e) { return e && (e.image || e.url); });
    if (list.length > MAX_CODES) {
        console.warn("qr: יש " + list.length + " קודים ב-site.js - מוצגים רק " + MAX_CODES + " הראשונים");
        list = list.slice(0, MAX_CODES);
    }

    var entries = list.map(function (e) {
        return { label: e.label || "", sub: e.sub || "", img: qrImage(e) };
    });

    box.setAttribute("data-count", String(entries.length));
    box.hidden = !entries.length;
    var html = entries.length ? Dashboard.render("qr", entries) : "";
    box.innerHTML = html !== undefined ? html : basicHtml(entries);
})();
