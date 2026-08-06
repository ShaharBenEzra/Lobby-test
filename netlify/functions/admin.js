// Netlify Function - נקודת הקצה של מצב הניהול.
//
// למה זה קיים: הדשבורד הוא אתר סטטי, ולכן אין לו שום דרך להחזיק סוד.
// אם ה-token של GitHub היה בקוד של הדף - כל מי שפותח את האתר היה יכול
// לקרוא אותו ולכתוב לריפו. הפונקציה הזו רצה בצד השרת של Netlify,
// והיא המקום היחיד שבו ה-token נמצא.
//
// שני פעולות:
//   { action: "verify", password }                  → בדיקת סיסמה (כניסה לפאנל)
//   { action: "save", password, notices, status }   → commit לריפו
//
// ⚠️  משתני הסביבה נקבעים בממשק של Netlify (Site configuration → Environment
//     variables) ולא בקוד ולא בריפו. ראו ADMIN_SETUP.md:
//
//       ADMIN_PASSWORD   סיסמת הניהול (ארוכה - זו כל ההגנה)
//       GITHUB_TOKEN     Fine-grained PAT, מוגבל לריפו הזה, Contents: Read+Write
//       GITHUB_REPO      owner/repo   (לדוגמה ShaharBenEzra/Lobby-Dashboard-Tormus-8)
//       GITHUB_BRANCH    שם הענף      (ברירת מחדל: main)

"use strict";

var GITHUB_API = "https://api.github.com";

var NOTICES_PATH = "content/notices.json";
var STATUS_PATH = "content/building_status.json";

// תקרות שפויות - מגן על הריפו מפני payload עצום, גם אם הלקוח באג או נפרץ
var MAX_ITEMS = 40;
var MAX_TEXT = 400;

// ───────────────────────── עזרים ─────────────────────────

function json(statusCode, payload) {
    return {
        statusCode: statusCode,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
        },
        body: JSON.stringify(payload)
    };
}

// השוואה שלא מדליפה את אורך/תוכן הסיסמה דרך זמן הריצה
function safeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    var diff = a.length ^ b.length;
    var max = Math.max(a.length, b.length);
    for (var i = 0; i < max; i++) {
        diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return diff === 0;
}

function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function oneLine(value, max) {
    return String(value == null ? "" : value)
        .replace(/\s*[\r\n]+\s*/g, " ")
        .trim()
        .slice(0, max || MAX_TEXT);
}

// הפונקציה לא סומכת על הלקוח: כל פריט נבנה מחדש מהשדות המותרים בלבד,
// כך שלא ניתן לדחוף לריפו מבנה או תוכן שלא תוכנן
function cleanNotices(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, MAX_ITEMS).map(function (n) {
        n = n || {};
        return {
            title: oneLine(n.title),
            body: oneLine(n.body),
            urgent: n.urgent === true
        };
    }).filter(function (n) { return n.title || n.body; });
}

function cleanStatus(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, MAX_ITEMS).map(function (s) {
        s = s || {};
        var state = oneLine(s.state, 10);
        if (state !== "good" && state !== "warning") state = "";
        return {
            // שם אייקון Font Awesome - אותיות, ספרות ומקפים בלבד
            icon: oneLine(s.icon, 40).replace(/^fa-/, "").replace(/[^a-z0-9-]/gi, "") || "circle-check",
            label: oneLine(s.label),
            value: oneLine(s.value),
            state: state
        };
    }).filter(function (s) { return s.label || s.value; });
}

// ───────────────────── קריאות ל-GitHub ─────────────────────

function githubFactory(token, repo) {
    return function github(path, options) {
        options = options || {};
        return fetch(GITHUB_API + "/repos/" + repo + path, {
            method: options.method || "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "Content-Type": "application/json",
                "User-Agent": "tormus-dashboard-admin"
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        }).then(function (res) {
            return res.text().then(function (text) {
                var data = null;
                try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
                if (!res.ok) {
                    var msg = (data && data.message) || res.statusText || "שגיאה";
                    var err = new Error("GitHub " + res.status + ": " + msg);
                    err.status = res.status;
                    throw err;
                }
                return data;
            });
        });
    };
}

// commit אחד אטומי לשני הקבצים, דרך ה-Git Trees API.
// שני PUT נפרדים (Contents API) היו יכולים להצליח חלקית ולהשאיר
// את ההודעות מעודכנות בלי הסטטוס - כאן זה או הכל או כלום.
async function commitFiles(github, branch, files, message) {
    var ref = await github("/git/ref/heads/" + encodeURIComponent(branch));
    var parentSha = ref.object.sha;

    var parentCommit = await github("/git/commits/" + parentSha);
    var baseTreeSha = parentCommit.tree.sha;

    var blobs = await Promise.all(files.map(function (file) {
        return github("/git/blobs", {
            method: "POST",
            body: { content: file.content, encoding: "utf-8" }
        });
    }));

    var tree = await github("/git/trees", {
        method: "POST",
        body: {
            base_tree: baseTreeSha,
            tree: files.map(function (file, i) {
                return { path: file.path, mode: "100644", type: "blob", sha: blobs[i].sha };
            })
        }
    });

    var commit = await github("/git/commits", {
        method: "POST",
        body: { message: message, tree: tree.sha, parents: [parentSha] }
    });

    await github("/git/refs/heads/" + encodeURIComponent(branch), {
        method: "PATCH",
        body: { sha: commit.sha }
    });

    return commit.sha;
}

// ───────────────────────── ה-handler ─────────────────────────

exports.handler = async function (event) {
    if (event.httpMethod !== "POST") {
        return json(405, { error: "יש לשלוח POST" });
    }

    var body;
    try {
        body = JSON.parse(event.body || "{}");
    } catch (e) {
        return json(400, { error: "גוף הבקשה אינו JSON תקין" });
    }

    var ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    var GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    var REPO = process.env.GITHUB_REPO;
    var BRANCH = process.env.GITHUB_BRANCH || "main";

    if (!ADMIN_PASSWORD) {
        return json(500, { error: "ADMIN_PASSWORD לא מוגדר בהגדרות הסביבה של Netlify" });
    }

    if (!safeEqual(String(body.password || ""), ADMIN_PASSWORD)) {
        await delay(400);   // מאט ניסיונות ניחוש סיסמה בכוח
        return json(401, { error: "סיסמה שגויה" });
    }

    var canPublish = !!(GITHUB_TOKEN && REPO);

    if (body.action === "verify") {
        return json(200, { ok: true, canPublish: canPublish, repo: REPO || null, branch: BRANCH });
    }

    if (body.action !== "save") {
        return json(400, { error: "action לא מוכר" });
    }

    if (!canPublish) {
        return json(500, { error: "GITHUB_TOKEN או GITHUB_REPO לא מוגדרים בהגדרות הסביבה של Netlify" });
    }

    var notices = cleanNotices(body.notices);
    var status = cleanStatus(body.status);
    var updatedAt = new Date().toISOString();

    var files = [
        {
            path: NOTICES_PATH,
            content: JSON.stringify({ updatedAt: updatedAt, notices: notices }, null, 2) + "\n"
        },
        {
            path: STATUS_PATH,
            content: JSON.stringify({ updatedAt: updatedAt, status: status }, null, 2) + "\n"
        }
    ];

    var github = githubFactory(GITHUB_TOKEN, REPO);
    var message = "עדכון תוכן הדשבורד מפאנל הניהול (" +
        notices.length + " הודעות, " + status.length + " פריטי סטטוס)";

    try {
        var sha = await commitFiles(github, BRANCH, files, message);
        return json(200, {
            ok: true,
            commit: sha,
            updatedAt: updatedAt,
            notices: notices,
            status: status
        });
    } catch (err) {
        // 409 = מישהו אחר עשה commit בין הקריאה לכתיבה. ניסיון אחד נוסף
        // עם ראש ענף מעודכן מספיק כאן (עורך אחד בפועל).
        if (err.status === 409) {
            try {
                var retrySha = await commitFiles(github, BRANCH, files, message);
                return json(200, {
                    ok: true, commit: retrySha, updatedAt: updatedAt,
                    notices: notices, status: status
                });
            } catch (retryErr) {
                return json(502, { error: "הריפו השתנה במקביל. נסו לשמור שוב." });
            }
        }
        if (err.status === 401 || err.status === 403) {
            return json(502, { error: "ה-GITHUB_TOKEN אינו תקף או שאין לו הרשאת כתיבה לריפו" });
        }
        if (err.status === 404) {
            return json(502, { error: "לא נמצא הריפו או הענף (" + REPO + " / " + BRANCH + ")" });
        }
        return json(502, { error: "הפרסום ל-GitHub נכשל: " + err.message });
    }
};
