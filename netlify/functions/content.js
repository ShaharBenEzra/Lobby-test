// קריאת תוכן הדשבורד - endpoint ציבורי (בלי סיסמה), כי כל מסך צריך
// למשוך ממנו את ההודעות והסטטוס כדי להציג אותם.
//
// GET /.netlify/functions/content
//   200 { updatedAt, notices, status }  - התוכן הנוכחי מ-Netlify Blobs
//   204                                 - האחסון עוד ריק (אף פרסום לא נעשה):
//                                         הלקוח ייפול לקבצי content/*.json
//                                         שבריפו, ואם גם הם חסרים - לקוד.
import { getStore } from "@netlify/blobs";
import { BLOB_STORE, BLOB_KEY, cleanPayload, json } from "../lib/content_shape.mjs";

export default async (req) => {
    if (req.method !== "GET") {
        return json(405, { error: "יש לשלוח GET" });
    }

    try {
        // strong consistency: אחרת קריאה מיד אחרי פרסום עלולה להחזיר
        // את הגרסה הקודמת, והאדמין היה חושב שהשמירה לא נתפסה
        const store = getStore({ name: BLOB_STORE, consistency: "strong" });
        const raw = await store.get(BLOB_KEY, { type: "json" });

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
