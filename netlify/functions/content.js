// קריאת תוכן הדשבורד - endpoint ציבורי (בלי סיסמה), כי כל מסך צריך
// למשוך ממנו את ההודעות והסטטוס כדי להציג אותם.
//
// GET /.netlify/functions/content?site=<בניין>
//   200 { updatedAt, notices, status }  - התוכן הנוכחי של הבניין מ-Netlify Blobs
//   204                                 - האחסון עוד ריק (אף פרסום לא נעשה):
//                                         הלקוח ייפול לברירת המחדל שבקוד
//                                         (sites/<בניין>/notices_data.js וכו').
import { getStore } from "@netlify/blobs";
import { BLOB_STORE, blobKey, siteId, cleanPayload, json } from "../lib/content_shape.mjs";

export default async (req) => {
    if (req.method !== "GET") {
        return json(405, { error: "יש לשלוח GET" });
    }

    try {
        // strong consistency: אחרת קריאה מיד אחרי פרסום עלולה להחזיר
        // את הגרסה הקודמת, והאדמין היה חושב שהשמירה לא נתפסה
        const store = getStore({ name: BLOB_STORE, consistency: "strong" });
        const site = siteId(new URL(req.url).searchParams.get("site"));
        const raw = await store.get(blobKey(site), { type: "json" });

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
