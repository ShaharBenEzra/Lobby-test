// שכבת הנתונים של הדשבורד - מקור אמת אחד ל"הודעות ועד בית" ול"סטטוס בניין".
//
// שרשרת המקורות, מהחזק לחלש:
//   1. content/*.json מהאתר   - מקור האמת. נמשך בטעינה וכל CONTENT_POLL_MINUTES,
//                               כך שעדכון שהוועד פרסם מגיע לכל מסך לבד.
//   2. cache ב-localStorage   - מה שנמשך בפעם האחרונה. מאפשר ציור מיידי
//                               בטעינה ושומר על המסך גם כשאין אינטרנט.
//   3. קבצי הקוד              - notices_data.js / building_status_data.js.
//                               גיבוי אחרון, וגם מה שרואים בהרצה מקומית.
//
// מצב מקומי (ADMIN_API ריק, או שהפונקציה לא זמינה - למשל פתיחת הקבצים
// מהמחשב): העריכה נשמרת ב-localStorage של הדפדפן הנוכחי בלבד ולא מתפרסמת
// לאף מסך אחר. AdminStore.isLocalOnly() מדווח על זה, והפאנל מציג אזהרה.
window.AdminStore = (function () {
    "use strict";

    var KEYS = {
        cache: "dashboard-content-cache-v2",   // מה שנמשך מהאתר בפעם האחרונה
        local: "dashboard-content-local-v2"    // עריכה מקומית שלא פורסמה
    };

    var listeners = [];

    var state = {
        notices: null,        // null = עוד לא נטען, ניפול לברירת המחדל מהקוד
        status: null,
        updatedAt: null,
        source: "defaults",   // "remote" | "cache" | "local" | "defaults"
        lastError: null
    };

    // ───────────────────────── עזרים ─────────────────────────

    function str(value) {
        return typeof value === "string" ? value : (value == null ? "" : String(value));
    }

    // כותרת/תוכן הם תמיד שורה אחת:
    //   • כך זה מוצג בדשבורד בפועל (כל הודעה = פסקה אחת)
    //   • וכך הייצוא לקובץ קוד תמיד חוזר לאותו מידע - שורה שמכילה רק "---"
    //     הייתה נקראת כמפריד בין הודעות ומפצלת הודעה אחת לשתיים
    function oneLine(value) {
        return str(value).replace(/\s*[\r\n]+\s*/g, " ").trim();
    }

    function cleanNoticeEntry(entry) {
        entry = entry || {};
        return {
            title: oneLine(entry.title),
            body: oneLine(entry.body),
            urgent: entry.urgent === true
        };
    }

    function cleanStatusEntry(entry) {
        entry = entry || {};
        var state_ = str(entry.state).trim();
        if (state_ !== "good" && state_ !== "warning") state_ = "";
        return {
            // אותו ניקוי בדיוק כמו בצד השרת (netlify/functions/admin.js), כדי
            // שמה שהאדמין רואה על המסך יהיה מה שבאמת יתפרסם. שם אייקון
            // Font Awesome הוא אותיות לטיניות, ספרות ומקפים בלבד.
            icon: oneLine(entry.icon).replace(/^fa-/, "").replace(/[^a-z0-9-]/gi, "") || "circle-check",
            label: oneLine(entry.label),
            value: oneLine(entry.value),
            state: state_
        };
    }

    function cleanList(list, cleanFn) {
        return (Array.isArray(list) ? list : []).map(cleanFn);
    }

    // ─────────────── ברירות מחדל מקבצי הקוד ───────────────

    // אותה לוגיקת פירוק שהייתה ב-notices_script.js: שורה ראשונה = כותרת,
    // השאר = גוף ההודעה, "---" מפריד בין הודעות, "!" בתחילת הכותרת = דחוף.
    function parseNoticesText(text) {
        var blocks = [];
        var current = [];

        str(text).split("\n").forEach(function (rawLine) {
            var line = rawLine.trim();
            if (/^-{3,}$/.test(line)) {
                if (current.length) blocks.push(current);
                current = [];
            } else if (line) {
                current.push(line);
            }
        });
        if (current.length) blocks.push(current);

        return blocks.map(function (lines) {
            var title = lines[0];
            var urgent = title.indexOf("!") === 0;
            if (urgent) title = title.slice(1).trim();
            return cleanNoticeEntry({ title: title, body: lines.slice(1).join(" "), urgent: urgent });
        });
    }

    function defaultNotices() {
        return typeof NOTICES_TEXT === "undefined" ? [] : parseNoticesText(NOTICES_TEXT);
    }

    function defaultStatus() {
        return typeof BUILDING_STATUS === "undefined" ? [] : cleanList(BUILDING_STATUS, cleanStatusEntry);
    }

    // ───────────────────── localStorage ─────────────────────

    function readJson(key) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;                       // חסום או פגום - מתעלמים
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;                      // אין מקום / כתיבה חסומה
        }
    }

    function removeKey(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) { /* ignore */ }
    }

    // ───────── הודעה לשאר הסקריפטים שהנתונים השתנו ─────────

    function notify() {
        listeners.forEach(function (cb) {
            try {
                cb();
            } catch (e) {
                console.error("AdminStore listener failed:", e);
            }
        });
    }

    function apply(notices, status, updatedAt, source) {
        state.notices = cleanList(notices, cleanNoticeEntry);
        state.status = cleanList(status, cleanStatusEntry);
        state.updatedAt = updatedAt || null;
        state.source = source;
        notify();
    }

    // ───────────────── משיכת התוכן מהאתר ─────────────────

    function apiConfigured() {
        return typeof ADMIN_API !== "undefined" && !!ADMIN_API;
    }

    function contentUrls() {
        return typeof CONTENT_URLS !== "undefined" ? CONTENT_URLS : null;
    }

    // cache-buster + no-store: בלי זה ה-CDN או הדפדפן היו מגישים את
    // הגרסה הישנה, והמסך "לא היה מתעדכן" גם אחרי שהוועד פרסם
    function fetchJson(url) {
        var bust = url + (url.indexOf("?") === -1 ? "?" : "&") + "t=" + Date.now();
        return fetch(bust, { cache: "no-store" }).then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
        });
    }

    // מחזירה Promise שמתקיים גם בכישלון - אין טעם להפיל את הדשבורד
    // בגלל נפילת רשת רגעית, פשוט נשארים עם מה שכבר מוצג
    function refresh() {
        var urls = contentUrls();
        if (!urls) return Promise.resolve(false);

        return Promise.all([fetchJson(urls.notices), fetchJson(urls.status)])
            .then(function (results) {
                var notices = results[0] && results[0].notices;
                var status = results[1] && results[1].status;
                if (!Array.isArray(notices) || !Array.isArray(status)) {
                    throw new Error("מבנה לא צפוי בקבצי התוכן");
                }

                var updatedAt = results[0].updatedAt || results[1].updatedAt || null;

                // עריכה מקומית שלא פורסמה מנצחת - אחרת המשיכה הבאה הייתה
                // דורסת לאדמין את מה שהוא בדיוק ערך בלי לפרסם
                var local = readJson(KEYS.local);

                writeJson(KEYS.cache, { notices: notices, status: status, updatedAt: updatedAt });
                state.lastError = null;

                if (local) {
                    apply(local.notices, local.status, local.updatedAt, "local");
                } else {
                    apply(notices, status, updatedAt, "remote");
                }
                return true;
            })
            .catch(function (err) {
                state.lastError = err.message;
                return false;
            });
    }

    // ───────────────────── שמירה ─────────────────────

    // שמירה מקומית - הדפדפן הנוכחי בלבד, לא מתפרסם לאף מסך אחר
    function saveLocal(notices, status) {
        var payload = {
            notices: cleanList(notices, cleanNoticeEntry),
            status: cleanList(status, cleanStatusEntry),
            updatedAt: new Date().toISOString()
        };
        var ok = writeJson(KEYS.local, payload);
        apply(payload.notices, payload.status, payload.updatedAt, "local");
        return ok;
    }

    // פרסום אמיתי - הפונקציה ב-Netlify עושה commit לריפו, וכל מסך
    // יאסוף את השינוי במשיכה הבאה שלו
    function publish(password, notices, status) {
        if (!apiConfigured()) {
            return Promise.reject(new Error("מצב מקומי - אין פונקציית פרסום מוגדרת"));
        }

        return fetch(ADMIN_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "save",
                password: password,
                notices: cleanList(notices, cleanNoticeEntry),
                status: cleanList(status, cleanStatusEntry)
            })
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                if (!res.ok || !data.ok) {
                    throw new Error(data.error || ("הפרסום נכשל (HTTP " + res.status + ")"));
                }
                // הצליח - אין יותר "עריכה מקומית שלא פורסמה"
                removeKey(KEYS.local);
                writeJson(KEYS.cache, {
                    notices: data.notices, status: data.status, updatedAt: data.updatedAt
                });
                apply(data.notices, data.status, data.updatedAt, "remote");
                return data;
            });
        });
    }

    // מחזירה תמיד תוצאה מובנית ולא זורקת על שגיאת HTTP, כדי שהפאנל
    // יוכל להבדיל בין המצבים ולהגיד לאדמין מה *באמת* חסר:
    //   wrongPassword → הפונקציה עובדת והסיסמה שגויה
    //   notDeployed   → 404: הפונקציה לא קיימת באתר (deploy לא כלל אותה)
    //   serverError   → הפונקציה רצה אבל חסרות לה הגדרות (למשל ADMIN_PASSWORD)
    //   networkError  → אין בכלל תשובה (אין רשת / פתיחה מקומית מהמחשב)
    function verifyPassword(password) {
        if (!apiConfigured()) {
            return Promise.resolve({ ok: false, localOnly: true });
        }
        return fetch(ADMIN_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "verify", password: password })
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                if (res.status === 401) return { ok: false, wrongPassword: true };
                if (res.status === 404) return { ok: false, notDeployed: true, status: 404 };
                if (!res.ok) {
                    return {
                        ok: false,
                        serverError: data.error || ("השרת החזיר שגיאה " + res.status),
                        status: res.status
                    };
                }
                return { ok: true, canPublish: data.canPublish !== false, repo: data.repo, branch: data.branch };
            });
        }).catch(function (err) {
            return { ok: false, networkError: err.message || "אין תשובה מהשרת" };
        });
    }

    // אבחון הגדרה: שולח סיסמה ריקה בכוונה. התשובה מזהה את המצב במדויק -
    //   401 → הפונקציה פרוסה ו-ADMIN_PASSWORD מוגדר   (הכל תקין)
    //   500 → הפונקציה פרוסה אבל חסר ADMIN_PASSWORD
    //   404 → הפונקציה לא פרוסה בכלל
    //   אין תשובה → אין רשת / האתר לא מוגש מ-Netlify
    function diagnose() {
        if (!apiConfigured()) {
            return Promise.resolve({ state: "no-api", message: "ADMIN_API ריק ב-admin_config.js - מצב מקומי בכוונה." });
        }
        return verifyPassword("").then(function (r) {
            if (r.wrongPassword) {
                return { state: "ready", message: "הפונקציה פרוסה ו-ADMIN_PASSWORD מוגדר. אפשר להתחבר." };
            }
            if (r.notDeployed) {
                return {
                    state: "not-deployed",
                    message: "הפונקציה לא נמצאה (404). ה-deploy לא כלל את netlify/functions - " +
                        "בדקו ב-Netlify תחת Deploys → Functions."
                };
            }
            if (r.serverError) {
                return { state: "misconfigured", message: "הפונקציה רצה אבל: " + r.serverError };
            }
            if (r.networkError) {
                return {
                    state: "offline",
                    message: "אין תשובה מהשרת (" + r.networkError + "). " +
                        "אם פתחתם את הקבצים מהמחשב - זה מצופה; מצב ניהול מלא עובד רק מהאתר ב-Netlify."
                };
            }
            // סיסמה ריקה התקבלה - כלומר ADMIN_PASSWORD ריק
            return { state: "misconfigured", message: "ADMIN_PASSWORD מוגדר כמחרוזת ריקה - קבעו סיסמה אמיתית ב-Netlify." };
        });
    }

    // ───────── ייצוא חזרה לקובץ קוד (גיבוי / הטמעה ידנית) ─────────

    // טקסט חופשי של המשתמש נכנס לתוך template literal, ולכן חייבים לנטרל
    // גם backslash, גם backtick וגם ${ - אחרת הקובץ המיוצא לא יתקמפל.
    function escapeForTemplate(text) {
        return str(text)
            .replace(/\\/g, "\\\\")
            .replace(/`/g, "\\`")
            .replace(/\$\{/g, "\\${");
    }

    function exportNoticesFile(list) {
        var body = cleanList(Array.isArray(list) ? list : getNotices(), cleanNoticeEntry)
            .map(function (n) {
                var lines = [(n.urgent ? "!" : "") + escapeForTemplate(n.title)];
                if (n.body) lines.push(escapeForTemplate(n.body));
                return lines.join("\n");
            }).join("\n---\n");

        return "/*\n" +
            "  ✏️  איך לערוך את ההודעות (רק טקסט - לא צריך להבין בתכנות!)\n" +
            "  ============================================================\n" +
            "  קובץ זה הוא גיבוי בלבד: מקור האמת הוא content/notices.json,\n" +
            "  שמתעדכן דרך פאנל הניהול. כאן נקראות ההודעות רק אם אין\n" +
            "  אינטרנט או אם קובץ ה-JSON חסר.\n" +
            "\n" +
            "  1. כל הודעה: השורה הראשונה = כותרת, השורות שאחריה = הטקסט של ההודעה.\n" +
            "  2. בין הודעה להודעה משאירים שורה עם שלושה מקפים בלבד:  ---\n" +
            "  3. כדי לסמן הודעה כ\"דחופה\" (מסגרת אדומה, מודגשת) - מוסיפים סימן קריאה (!)\n" +
            "     בתחילת הכותרת.\n" +
            "  4. חשוב: לגעת רק בטקסט שבין שני הסימנים  ` (backtick) למטה.\n" +
            "  ============================================================\n" +
            "*/\n" +
            "const NOTICES_TEXT = `\n" + body + "\n`;\n";
    }

    function exportStatusFile(list) {
        var rows = cleanList(Array.isArray(list) ? list : getStatus(), cleanStatusEntry)
            .map(function (s) {
                return "    { icon: " + JSON.stringify(s.icon) +
                    ", label: " + JSON.stringify(s.label) +
                    ", value: " + JSON.stringify(s.value) +
                    ", state: " + JSON.stringify(s.state) + " },";
            }).join("\n");

        return "/*\n" +
            "  ✏️  איך לערוך את \"סטטוס בניין\" (רק טקסט - לא צריך להבין בתכנות!)\n" +
            "  ============================================================\n" +
            "  קובץ זה הוא גיבוי בלבד: מקור האמת הוא content/building_status.json,\n" +
            "  שמתעדכן דרך פאנל הניהול. כאן נקרא הסטטוס רק אם אין אינטרנט\n" +
            "  או אם קובץ ה-JSON חסר.\n" +
            "\n" +
            "  icon  - שם אייקון מ-Font Awesome (בלי \"fa-\" בהתחלה):\n" +
            "          https://fontawesome.com/icons  (סגנון \"Solid\" - חינמי)\n" +
            "  label - הכותרת הקטנה (לדוגמה: \"פינוי אשפה\")\n" +
            "  value - הערך/הסטטוס המוצג (לדוגמה: \"בימי ב׳\")\n" +
            "  state - \"good\"    → מסגרת ורקע ירוקים (מצב תקין)\n" +
            "          \"warning\" → טקסט אדום ומודגש (דורש תשומת לב)\n" +
            "          \"\"        → רגיל, בלי הדגשה\n" +
            "  ============================================================\n" +
            "*/\n" +
            "const BUILDING_STATUS = [\n" + rows + "\n];\n";
    }

    // ─────────────────────── ה-API ───────────────────────

    function getNotices() {
        return state.notices ? state.notices.slice() : defaultNotices();
    }

    function getStatus() {
        return state.status ? state.status.slice() : defaultStatus();
    }

    // ─────────────────────── אתחול ───────────────────────

    // ציור מיידי מה-cache (או מקוד) לפני שהרשת עונה, כדי שלא יהיה
    // מסך ריק בטעינה ושהדשבורד יעבוד גם בלי אינטרנט
    (function init() {
        var local = readJson(KEYS.local);
        var cache = readJson(KEYS.cache);

        if (local) {
            state.notices = cleanList(local.notices, cleanNoticeEntry);
            state.status = cleanList(local.status, cleanStatusEntry);
            state.updatedAt = local.updatedAt || null;
            state.source = "local";
        } else if (cache) {
            state.notices = cleanList(cache.notices, cleanNoticeEntry);
            state.status = cleanList(cache.status, cleanStatusEntry);
            state.updatedAt = cache.updatedAt || null;
            state.source = "cache";
        }
    })();

    var pollingStarted = false;

    function startPolling() {
        if (pollingStarted) return;
        pollingStarted = true;

        refresh();

        var minutes = typeof CONTENT_POLL_MINUTES !== "undefined" ? Number(CONTENT_POLL_MINUTES) : 2;
        if (minutes > 0) {
            setInterval(refresh, minutes * 60 * 1000);
        }

        // מסך קיוסק שחזר מ"שינה" צריך להתעדכן מיד ולא לחכות למחזור הבא
        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "visible") refresh();
        });
    }

    // המשיכה היא התנהגות ליבה של הדשבורד ולא של פאנל הניהול, ולכן היא
    // מופעלת מכאן - כדי שהמסך ימשיך להתעדכן לבד גם אם admin_panel.js יוסר
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startPolling);
    } else {
        startPolling();
    }

    return {
        getNotices: getNotices,
        getStatus: getStatus,

        refresh: refresh,
        startPolling: startPolling,

        verifyPassword: verifyPassword,
        diagnose: diagnose,
        publish: publish,
        saveLocal: saveLocal,

        // האם אנחנו במצב שבו שמירה לא מתפרסמת לשאר המסכים
        isLocalOnly: function () { return !apiConfigured(); },
        hasUnpublishedLocal: function () { return !!readJson(KEYS.local); },
        discardLocal: function () {
            removeKey(KEYS.local);
            var cache = readJson(KEYS.cache);
            if (cache) apply(cache.notices, cache.status, cache.updatedAt, "cache");
            else apply(defaultNotices(), defaultStatus(), null, "defaults");
        },

        // חוזר לתוכן שכתוב בקבצי הקוד (בלי לפרסם - צריך לשמור אחר כך)
        codeDefaults: function () {
            return { notices: defaultNotices(), status: defaultStatus() };
        },

        info: function () {
            return {
                source: state.source,
                updatedAt: state.updatedAt,
                lastError: state.lastError,
                localOnly: !apiConfigured()
            };
        },

        exportNoticesFile: exportNoticesFile,
        exportStatusFile: exportStatusFile,

        // כל מי שמצייר נתונים על המסך נרשם כאן ומצייר מחדש בכל שינוי
        onChange: function (cb) { if (typeof cb === "function") listeners.push(cb); }
    };
})();
