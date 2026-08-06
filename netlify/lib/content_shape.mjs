// מבנה התוכן של הדשבורד + ניקוי קלט - משותף לשתי הפונקציות
// (admin לכתיבה, content לקריאה), כדי שיהיה מקור אמת אחד לצורה של הנתונים.
//
// הקובץ יושב ב-netlify/lib ולא ב-netlify/functions בכוונה: כל קובץ בתיקיית
// הפונקציות הופך לפונקציה בפני עצמה, וזה לא אמור להיות endpoint.

// תקרות שפויות - מגן על האחסון מפני payload עצום, גם אם הלקוח באג או נפרץ
export const MAX_ITEMS = 40;
export const MAX_TEXT = 400;

export const BLOB_STORE = "dashboard-content";
export const BLOB_KEY = "current";

function oneLine(value, max = MAX_TEXT) {
    return String(value ?? "")
        .replace(/\s*[\r\n]+\s*/g, " ")
        .trim()
        .slice(0, max);
}

// לא סומכים על הלקוח: כל פריט נבנה מחדש מהשדות המותרים בלבד, כך שלא
// ניתן לדחוף לאחסון מבנה או תוכן שלא תוכנן
export function cleanNotices(list) {
    if (!Array.isArray(list)) return [];
    return list
        .slice(0, MAX_ITEMS)
        .map((n) => ({
            title: oneLine(n?.title),
            body: oneLine(n?.body),
            urgent: n?.urgent === true
        }))
        .filter((n) => n.title || n.body);
}

export function cleanStatus(list) {
    if (!Array.isArray(list)) return [];
    return list
        .slice(0, MAX_ITEMS)
        .map((s) => {
            const state = oneLine(s?.state, 10);
            return {
                // שם אייקון Font Awesome - אותיות לטיניות, ספרות ומקפים בלבד
                icon: oneLine(s?.icon, 40).replace(/^fa-/, "").replace(/[^a-z0-9-]/gi, "") || "circle-check",
                label: oneLine(s?.label),
                value: oneLine(s?.value),
                state: state === "good" || state === "warning" ? state : ""
            };
        })
        .filter((s) => s.label || s.value);
}

export function cleanPayload(raw) {
    return {
        updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : null,
        notices: cleanNotices(raw?.notices),
        status: cleanStatus(raw?.status)
    };
}

export function json(status, payload) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            // התוכן נמשך חי ע"י כל מסך - חייב לא להיתפס ב-cache, אחרת
            // עדכון של הוועד "לא יגיע" לטלוויזיה
            "Cache-Control": "no-store, no-cache, must-revalidate"
        }
    });
}
