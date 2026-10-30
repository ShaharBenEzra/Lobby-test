// נגן המוזיקה של הלובי - שני מקורות לבחירה:
//   גלגלצ       - שידור חי מהאינטרנט (ברירת המחדל)
//   מוזיקת הבית - קובץ המוזיקה המקומי (Custom Music.mp3), מתנגן בלופ אין-סופי
// כברירת מחדל אין שמע בכלל - רק לחיצה על הכפתור מתחילה/עוצרת השמעה.
//
// המשך אחרי רענון: auto_refresh.js מרענן את הדף כל 4 שעות, ובלי טיפול מיוחד
// כל רענון היה משתיק את המוזיקה. לכן כל עוד מתנגן נשמרת
// ב-localStorage חתימת זמן שמתחדשת כל 20 שניות; אם הדף עולה ופחות משתי דקות
// עברו מאז - ההשמעה מתחדשת לבד באותו מקור שנבחר. פער גדול יותר (כיבוי המסך
// בערב והדלקה בבוקר) לא מחדש כלום, והדף עולה בשקט.
//
// עמידות ברשת: המסך רץ יומם ולילה, ושיהוק אחד של הרשת או של ה-CDN לא יכול
// להשתיק את הלובי עד שמישהו יבוא ללחוץ. לכן מופרדת הכוונה (wantsPlay) מהמצב
// בפועל: כל עוד הכוונה דלוקה, תקלה / סגירת חיבור / קיפאון של הבאפר מפעילים
// התחברות מחדש בהשהיות עולות, ורק אם כל הניסיונות נכשלו הבר חוזר בכנות לכבוי.
//
// שימו לב: דפדפן חוסם השמעה אוטומטית בדף שנטען בלי לחיצת משתמש. בקיוסק
// מריצים את כרום עם --autoplay-policy=no-user-gesture-required כדי שההמשך
// יעבוד תמיד. בלי הדגל, אם ההמשך נחסם הבר פשוט חוזר למצב "כבוי" ומחכה ללחיצה.
(function () {
    const SOURCE_KEY = "dashboard-audio-source";
    const RESUME_KEY = "dashboard-audio-resume";

    const DEFAULT_SOURCE = "galgalatz";

    const RESUME_WINDOW_MS = 2 * 60 * 1000;   // עד כמה חתימת זמן נחשבת "טרייה"
    const HEARTBEAT_MS     = 20 * 1000;       // כל כמה זמן מרעננים אותה

    // השהיות ההתחברות מחדש - עולות, כדי לא להטיח בקשות ב-CDN שנפל לרגע
    const RETRY_DELAYS_MS = [2000, 5000, 15000];
    const STALL_CHECK_MS  = 15000;            // כל כמה זמן בודקים שהזמן בכלל זז

    const SOURCES = {
        galgalatz: {
            label:        "גלגלצ",
            playingLabel: "גלגלצ - שידור חי",
            url:          "https://glzwizzlv.bynetcdn.com/glglz_mp3",
            loop:         false,             // שידור חי - אין לו סוף שצריך לתפור
        },
        custom: {
            label:        "מוזיקת הבית",
            playingLabel: "מוזיקת הבית - מתנגן",
            url:          "Custom%20Music.mp3",  // הרווח בשם הקובץ מקודד ל-%20
            loop:         true,              // חוזר מהתחלה בלי סוף
        },
    };

    const bar    = document.getElementById("radio-bar");
    const toggle = document.getElementById("radio-toggle");
    const audio  = document.getElementById("lobby-audio");
    const icon   = document.getElementById("radio-icon");
    const label  = document.getElementById("radio-label");
    const chips  = Array.from(document.querySelectorAll(".radio-source-chip"));

    // מזהה מקור שמור שלא מוכר (או מגרסה ישנה) חוזר לברירת המחדל
    function resolveSource(id) {
        return SOURCES[id] ? id : DEFAULT_SOURCE;
    }

    let sourceId       = resolveSource(localStorage.getItem(SOURCE_KEY));
    let wantsPlay      = false;   // הכוונה: מה שהמשתמש ביקש
    let isReconnecting = false;   // המצב בפועל: מנסים לחזור לאוויר
    let retryIndex     = 0;
    let retryTimer     = null;
    let heartbeat      = null;
    let watchdog       = null;
    let lastTime       = 0;

    function render() {
        const source = SOURCES[sourceId];

        bar.classList.toggle("is-playing", wantsPlay);
        bar.classList.toggle("is-reconnecting", isReconnecting);
        toggle.setAttribute("aria-pressed", String(wantsPlay));
        toggle.title = wantsPlay ? "עצור השמעה" : "הפעל " + source.label;
        icon.textContent = wantsPlay ? "pause" : "play_arrow";
        label.textContent = isReconnecting ? "מתחבר מחדש..."
                          : wantsPlay      ? source.playingLabel
                          :                  source.label;

        chips.forEach(chip => {
            const selected = chip.dataset.source === sourceId;
            chip.classList.toggle("is-selected", selected);
            chip.setAttribute("aria-checked", String(selected));
        });
    }

    // ── חתימת הזמן שמאפשרת המשך אחרי רענון ──
    // מתחדשת לפי הכוונה ולא לפי הנגינה בפועל, כדי שרענון שנופל בדיוק בזמן
    // התחברות מחדש עדיין ייחשב "המשך" ולא ישתיק את הלובי
    function markPlaying() {
        localStorage.setItem(RESUME_KEY, String(Date.now()));
    }

    function startHeartbeat() {
        markPlaying();
        if (heartbeat === null) heartbeat = setInterval(markPlaying, HEARTBEAT_MS);
    }

    function stopHeartbeat() {
        clearInterval(heartbeat);
        heartbeat = null;
        localStorage.removeItem(RESUME_KEY);   // עצירה מכוונת = לא מחדשים כלום
    }

    // ── שומר הקיפאון ──
    // התקלה הנפוצה בשידור חי: החיבור מת בלי לזרוק error, הבאפר קופא, והבר
    // ממשיך להראות "מתנגן". אם הזמן לא זז בין שתי בדיקות - מתחברים מחדש.
    function startWatchdog() {
        lastTime = audio.currentTime;
        if (watchdog === null) watchdog = setInterval(() => {
            if (!wantsPlay || retryTimer !== null) return;   // באמצע ניסיון - לא מתערבים
            if (audio.currentTime === lastTime) {
                reconnect("הבאפר קפא");
                return;
            }
            lastTime = audio.currentTime;
        }, STALL_CHECK_MS);
    }

    function stopWatchdog() {
        clearInterval(watchdog);
        watchdog = null;
    }

    function loadAndPlay(fromResume) {
        const source = SOURCES[sourceId];
        audio.loop = source.loop;
        audio.src  = source.url;
        audio.play().catch(error => {
            const name = error && error.name;
            // חסימת השמעה אוטומטית לא תיפתר בניסיון נוסף - שם עוצרים
            if (name === "NotAllowedError") {
                if (fromResume) console.warn("המשך אוטומטי נחסם:", name);
                stop();
            } else {
                reconnect("play נכשל: " + name);
            }
        });
    }

    // התחברות מחדש בהשהיה עולה; אחרי שנגמרו הניסיונות חוזרים למצב כבוי
    function reconnect(reason) {
        if (!wantsPlay || retryTimer !== null) return;

        if (retryIndex >= RETRY_DELAYS_MS.length) {
            console.warn("המוזיקה נעצרה אחרי", RETRY_DELAYS_MS.length, "ניסיונות -", reason);
            stop();
            return;
        }

        const delay = RETRY_DELAYS_MS[retryIndex++];
        isReconnecting = true;
        render();

        audio.pause();
        retryTimer = setTimeout(() => {
            retryTimer = null;
            if (wantsPlay) loadAndPlay();
        }, delay);
    }

    function stop() {
        wantsPlay = false;
        isReconnecting = false;
        retryIndex = 0;
        clearTimeout(retryTimer);
        retryTimer = null;
        stopWatchdog();
        stopHeartbeat();

        audio.pause();
        audio.removeAttribute("src");
        audio.load();                          // משחרר את החיבור / את הקובץ מהזיכרון
        render();
    }

    // fromResume מבדיל בין לחיצה של אדם לבין המשך אוטומטי אחרי רענון,
    // כדי שחסימת השמעה אוטומטית תיראה ביומן הקונסולה ולא תיעלם בשקט
    function start(fromResume) {
        wantsPlay = true;
        isReconnecting = false;
        retryIndex = 0;
        clearTimeout(retryTimer);
        retryTimer = null;

        loadAndPlay(fromResume);
        startHeartbeat();
        startWatchdog();
        render();
    }

    // לחיצה על אחד משני האייקונים מחליפה מקור: אם כרגע מתנגן - עוברים מיד
    // למקור החדש, ואם שקט - רק מסמנים את הבחירה ונשארים בשקט.
    function selectSource(id) {
        if (id === sourceId) return;
        sourceId = resolveSource(id);
        localStorage.setItem(SOURCE_KEY, sourceId);
        if (wantsPlay) start();
        else render();
    }

    toggle.addEventListener("click", () => {
        if (wantsPlay) stop();
        else start();
    });

    chips.forEach(chip => {
        chip.addEventListener("click", () => selectSource(chip.dataset.source));
    });

    // תקלת רשת / קודק, או חיבור שנסגר מהצד השני - שניהם עניין להתחברות מחדש
    audio.addEventListener("error", () => reconnect("שגיאת נגן"));
    audio.addEventListener("ended", () => reconnect("החיבור נסגר"));

    // חזרנו לאוויר: מאפסים את מונה הניסיונות כדי שתקלה עתידית תקבל סבב מלא
    audio.addEventListener("playing", () => {
        retryIndex = 0;
        lastTime = audio.currentTime;
        if (isReconnecting) {
            isReconnecting = false;
            render();
        }
    });

    // חתימה טרייה ממש לפני שהדף מתחלף, כדי שהרענון ייחשב "המשך"
    window.addEventListener("pagehide", () => {
        if (wantsPlay) markPlaying();
    });

    const lastPlayed = Number(localStorage.getItem(RESUME_KEY));
    if (lastPlayed && Date.now() - lastPlayed < RESUME_WINDOW_MS) {
        start(true);
    } else {
        stopHeartbeat();                       // מנקה חתימה ישנה משכבר הימים
        render();
    }
})();
