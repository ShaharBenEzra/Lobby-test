// Netlify Function - נקודת הקצה של מצב הניהול (כתיבה).
//
// למה זה קיים: הדשבורד הוא אתר סטטי, ולכן אין לו דרך להחזיק סוד ואין לו
// דרך לשמור נתונים שיראו כל המסכים. הפונקציה הזו רצה בצד השרת של Netlify:
// היא בודקת את הסיסמה, ורק היא כותבת לאחסון.
//
// שתי פעולות:
//   { action: "verify", password }                  → בדיקת סיסמה (כניסה לפאנל)
//   { action: "save", password, notices, status }   → שמירה ל-Netlify Blobs
//
// האחסון הוא Netlify Blobs - מובנה באתר, בלי חשבון נוסף ובלי token.
// שמירה נכנסת לתוקף מיד, בלי commit ובלי deploy מחדש.
//
// ⚠️  משתנה סביבה אחד ויחיד, שנקבע בממשק של Netlify
//     (Project configuration → Environment variables) ולא בקוד ולא בריפו:
//
//       ADMIN_PASSWORD   סיסמת הניהול (ארוכה - זו כל ההגנה)
//
//     ראו ADMIN_SETUP.md.
import { getStore } from "@netlify/blobs";
import {
    BLOB_STORE, BLOB_KEY, cleanNotices, cleanStatus, json
} from "../lib/content_shape.mjs";

// השוואה שלא מדליפה את אורך/תוכן הסיסמה דרך זמן הריצה
function safeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    let diff = a.length ^ b.length;
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
        diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return diff === 0;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async (req) => {
    if (req.method !== "POST") {
        return json(405, { error: "יש לשלוח POST" });
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return json(400, { error: "גוף הבקשה אינו JSON תקין" });
    }

    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_PASSWORD) {
        return json(500, { error: "ADMIN_PASSWORD לא מוגדר בהגדרות הסביבה של Netlify" });
    }

    if (!safeEqual(String(body?.password ?? ""), ADMIN_PASSWORD)) {
        await delay(400);   // מאט ניסיונות ניחוש סיסמה בכוח
        return json(401, { error: "סיסמה שגויה" });
    }

    // אין יותר GITHUB_TOKEN / GITHUB_REPO - Blobs תמיד זמין באתר עצמו,
    // ולכן אם הסיסמה נכונה אפשר לפרסם
    if (body.action === "verify") {
        return json(200, { ok: true, canPublish: true, storage: "netlify-blobs" });
    }

    if (body.action !== "save") {
        return json(400, { error: "action לא מוכר" });
    }

    const payload = {
        updatedAt: new Date().toISOString(),
        notices: cleanNotices(body.notices),
        status: cleanStatus(body.status)
    };

    try {
        const store = getStore({ name: BLOB_STORE, consistency: "strong" });
        await store.setJSON(BLOB_KEY, payload);
        return json(200, { ok: true, ...payload });
    } catch (err) {
        return json(502, { error: "השמירה לאחסון נכשלה: " + err.message });
    }
};
