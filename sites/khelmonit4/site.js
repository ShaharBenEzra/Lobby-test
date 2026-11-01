/*
  🏢  החלמונית 4 - כל מה שמייחד את הבניין הזה
  ============================================================
  ההסבר המלא על כל שדה נמצא ב-sites/tormus6/site.js.
  ============================================================
*/
Dashboard.defineSite({
    name: "החלמונית 4",
    city: "ראשון לציון",
    area: "קריית ראשון",
    location: { lat: 31.973, lon: 34.7925 },

    skin: "option3",
    theme: "gold",

    // ⚠️ שלושת הקישורים זמניים (google.com) - להחליף בקישורי ההזמנה האמיתיים
    qr: [
        { label: "קבוצת תשלום PayBox",        url: "https://www.google.com" },
        { label: "קבוצת וואצאפ - דיירים",     url: "https://www.google.com" },
        { label: "קבוצת וואצאפ - בעלי דירה", url: "https://www.google.com" }
    ],

    sideImage: { src: "side_image.svg", visible: null },

    // לחידוש: מוסיפים שנה לתאריך ומפרסמים. פורמט: "שנה-חודש-יום"
    subscription: { expires: "2027-10-1", contact: "0527995832" }
});
