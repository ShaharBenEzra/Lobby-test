// קריאת תוכן הדשבורד - endpoint ציבורי (בלי סיסמה), כי כל מסך צריך
// למשוך ממנו את ההודעות והסטטוס כדי להציג אותם.
//
// GET /.netlify/functions/content?site=<בניין>[&home=1]
//   200 { updatedAt, notices, status, skin }  - התוכן הנוכחי של הבניין מ-Netlify Blobs
//   204                                 - האחסון עוד ריק (אף פרסום לא נעשה):
//                                         הלקוח ייפול לברירת המחדל שבקוד
//                                         (sites/<בניין>/notices_data.js וכו').
//
// home=1 = זה בניין הבית של הכתובת (מה שמוצג בה בלי ?site=). הגרסה הקודמת
// הציגה בניין אחד לאתר ושמרה במפתח הישן ("current") - והתוכן הזה שייך לבניין
// הבית. כל עוד לבניין אין עדיין מפתח משלו, מחזירים לו את הישן, כדי שהמעבר
// לגרסה הזו לא "ימחק" מהמסכים את מה שהוועד כבר פרסם. הפרסום הבא כותב למפתח
// של הבניין, ומאז הישן כבר לא נקרא.
import { getStore } from "@netlify/blobs";
import { BLOB_STORE, BLOB_KEY, blobKey, siteId, cleanPayload, json } from "../lib/content_shape.mjs";

export default async (req) => {
    if (req.method !== "GET") {
        return json(405, { error: "יש לשלוח GET" });
    }

    try {
        // strong consistency: אחרת קריאה מיד אחרי פרסום עלולה להחזיר
        // את הגרסה הקודמת, והאדמין היה חושב שהשמירה לא נתפסה
        const store = getStore({ name: BLOB_STORE, consistency: "strong" });
        const params = new URL(req.url).searchParams;
        const site = siteId(params.get("site"));
        let raw = await store.get(blobKey(site), { type: "json" });
        if (!raw && site && params.get("home") === "1") {
            raw = await store.get(BLOB_KEY, { type: "json" });
        }

        if (!raw) {
            return new Response(null, {
                status: 204,
                headers: { "Cache-Control": "no-store, no-cache, must-revalidate" }
            });
        }

        return json(200, cleanPayload(raw));
    } catch (err) {
        return json(502, { error: "קריאת התוכן נכשלה: " + err.message });
    }
};
