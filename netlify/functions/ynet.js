// פרוקסי משלנו ל-RSS של Ynet - endpoint ציבורי לקריאה בלבד.
//
// למה זה קיים: Ynet חוסם בקשות ישירות מהדפדפן (CORS), ולכן core/news.js
// היה תלוי בפרוקסים ציבוריים (allorigins, codetabs). אלה נופלים לעיתים
// קרובות (Cloudflare 522), ואז נשאר רק rss2json - שמגיש עותק מה-cache
// בן עד חצי שעה. התוצאה: בר חדשות "תקוע" שלא מתעדכן.
// כאן השרת של Netlify מושך את הפיד בעצמו, ומחזיר אותו מאותו דומיין
// של הדשבורד - בלי CORS ובלי תלות בצד שלישי.
//
// GET /.netlify/functions/ynet
//   200 <rss xml>   - הפיד החי
//   502 { error }   - Ynet לא ענה / החזיר משהו שאינו RSS

const RSS_URL = "https://www.ynet.co.il/Integration/StoryRss1854.xml";
const TIMEOUT_MS = 8000;

export default async (req) => {
    if (req.method !== "GET") {
        return Response.json({ error: "יש לשלוח GET" }, { status: 405 });
    }

    try {
        const res = await fetch(RSS_URL, {
            headers: { "User-Agent": "Mozilla/5.0 (lobby-dashboard)" },
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });
        if (!res.ok) throw new Error("Ynet HTTP " + res.status);

        const xml = await res.text();
        if (!xml.includes("<item>")) throw new Error("התשובה אינה RSS");

        return new Response(xml, {
            status: 200,
            headers: {
                "Content-Type": "application/xml; charset=utf-8",
                // הדפדפן לא שומר עותק; ה-CDN של Netlify שומר דקה אחת, כך
                // שכמה מסכים שמרעננים יחד יוצרים בקשה אחת בלבד ל-Ynet
                "Cache-Control": "no-store",
                "Netlify-CDN-Cache-Control": "public, max-age=60, stale-while-revalidate=120"
            }
        });
    } catch (err) {
        return Response.json(
            { error: "משיכת ה-RSS נכשלה: " + err.message },
            { status: 502, headers: { "Cache-Control": "no-store" } }
        );
    }
};
