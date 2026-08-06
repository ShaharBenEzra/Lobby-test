// מצב ניהול (אדמין) - חלון עריכה מלא ל"הודעות ועד בית" ול"סטטוס בניין",
// ישירות מהמסך בלי לגעת בקוד.
//
// כניסה: כפתור המנעול בפינה למטה, או Ctrl+Shift+A.
// הסיסמה נבדקת בצד השרת (Netlify Function) ולא נמצאת בקוד הדף.
// שמירה = commit אמיתי לריפו, וכל מסך אוסף את השינוי לבד תוך דקה-שתיים.
//
// אם הפונקציה לא זמינה (הרצה מקומית / בלי אינטרנט) הפאנל עובר למצב מקומי:
// הסיסמה נבדקת מול ADMIN_LOCAL_PASSWORD, השמירה נשמרת בדפדפן הנוכחי בלבד,
// והפאנל אומר את זה במפורש בכל מסך שלו.
//
// החלון נבנה כאן ב-JS ומוצמד ישירות ל-body (ולא בתוך #tv-stage) בכוונה:
// #tv-stage מוקטן/מוגדל ע"י stage_scale.js לפי גודל המסך, ואילו חלון
// עריכה צריך להיות בגודל אמיתי וקריא - גם כשעורכים מהטלפון.
(function () {
    "use strict";

    // הסיסמה נשמרת כאן כדי שאפשר יהיה לפרסם בלי לבקש אותה בכל שמירה.
    // זה המכשיר של האדמין בלבד, והיא נמחקת ב"יציאה" ובתום הזמן.
    var SESSION_KEY = "admin-session-v2";

    var LOCAL_PASSWORD = typeof ADMIN_LOCAL_PASSWORD !== "undefined" ? String(ADMIN_LOCAL_PASSWORD) : "1234";
    var SESSION_HOURS = typeof ADMIN_SESSION_HOURS !== "undefined" ? Number(ADMIN_SESSION_HOURS) : 8;
    var BUTTON_VISIBLE = typeof ADMIN_BUTTON_VISIBLE !== "undefined" ? ADMIN_BUTTON_VISIBLE !== false : true;

    // אייקונים נפוצים לבניין - שמות Font Awesome (סגנון Solid) עם תווית בעברית,
    // כדי שלא צריך להכיר את שמות האייקונים באנגלית. יש גם שדה חופשי.
    var ICONS = [
        { id: "trash-can",            label: "אשפה" },
        { id: "recycle",              label: "מיחזור" },
        { id: "elevator",             label: "מעלית" },
        { id: "arrow-up",             label: "חץ למעלה" },
        { id: "broom",                label: "ניקיון" },
        { id: "droplet",              label: "מים" },
        { id: "faucet",               label: "ברז" },
        { id: "fire-extinguisher",    label: "כיבוי אש" },
        { id: "bolt",                 label: "חשמל" },
        { id: "lightbulb",            label: "תאורה" },
        { id: "plug",                 label: "שקע" },
        { id: "wifi",                 label: "אינטרנט" },
        { id: "car",                  label: "חניה" },
        { id: "bicycle",              label: "אופניים" },
        { id: "key",                  label: "מפתחות" },
        { id: "door-open",            label: "דלת / שער" },
        { id: "wrench",               label: "תחזוקה" },
        { id: "screwdriver-wrench",   label: "תיקונים" },
        { id: "hammer",               label: "עבודות" },
        { id: "paint-roller",         label: "צביעה" },
        { id: "envelope",             label: "דואר" },
        { id: "box",                  label: "חבילות" },
        { id: "dog",                  label: "בעלי חיים" },
        { id: "leaf",                 label: "גינון" },
        { id: "tree",                 label: "עצים" },
        { id: "dumbbell",             label: "חדר כושר" },
        { id: "stairs",               label: "מדרגות" },
        { id: "video",                label: "מצלמות" },
        { id: "shield-halved",        label: "ביטחון" },
        { id: "snowflake",            label: "מיזוג / קור" },
        { id: "sun",                  label: "שמש" },
        { id: "temperature-half",     label: "טמפרטורה" },
        { id: "calendar-days",        label: "לוח זמנים" },
        { id: "phone",                label: "טלפון" },
        { id: "users",                label: "ועד בית" },
        { id: "file-invoice-dollar",  label: "תשלומים" },
        { id: "building",             label: "בניין" },
        { id: "truck",                label: "הובלה" },
        { id: "circle-check",         label: "תקין" },
        { id: "triangle-exclamation", label: "אזהרה" }
    ];

    var STATES = [
        { id: "",        label: "רגיל" },
        { id: "good",    label: "תקין (ירוק)" },
        { id: "warning", label: "דורש תשומת לב (אדום)" }
    ];

    // ───────────────────────── מצב פנימי ─────────────────────────

    var root = null;          // אלמנט השורש של החלון
    var bodyEl = null;        // אזור התוכן המתחלף (התחברות / עריכה)
    var footEl = null;
    var titleEl = null;

    var activeTab = "notices";
    var draft = null;         // עותק עבודה - מתפרסם רק בלחיצה על "פרסום"
    var dirty = false;
    var busy = false;         // בזמן פרסום - מונע לחיצה כפולה
    var localMode = false;    // אין פונקציית פרסום זמינה

    // ───────────────────────── עזרים ─────────────────────────

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    }

    function button(className, text, onClick) {
        var b = el("button", className, text);
        b.type = "button";
        b.addEventListener("click", onClick);
        return b;
    }

    function iconSpan(name) {
        return el("span", "material-symbols-outlined", name);
    }

    function clone(list) {
        return list.map(function (item) {
            var copy = {};
            Object.keys(item).forEach(function (k) { copy[k] = item[k]; });
            return copy;
        });
    }

    function toast(message, kind) {
        var t = el("div", "admin-toast" + (kind ? " admin-toast-" + kind : ""), message);
        document.body.appendChild(t);
        void t.offsetWidth;                       // מאלץ reflow כדי שהמעבר יונפש
        t.classList.add("is-visible");
        var ms = kind === "error" ? 5000 : 2600;
        setTimeout(function () {
            t.classList.remove("is-visible");
            setTimeout(function () { t.remove(); }, 300);
        }, ms);
    }

    // אישור בתוך החלון (ולא confirm של הדפדפן) - דפדפני קיוסק לא תמיד
    // מציגים דיאלוגים מובנים, וכאן זה גם משתלב בעיצוב
    function askConfirm(message, confirmLabel, onYes) {
        var existing = root.querySelector(".admin-confirm");
        if (existing) existing.remove();

        var bar = el("div", "admin-confirm");
        bar.appendChild(el("span", "admin-confirm-text", message));

        var actions = el("div", "admin-confirm-actions");
        actions.appendChild(button("admin-btn-sm admin-btn-danger", confirmLabel, function () {
            bar.remove();
            onYes();
        }));
        actions.appendChild(button("admin-btn-sm admin-btn-ghost", "ביטול", function () {
            bar.remove();
        }));

        bar.appendChild(actions);
        root.appendChild(bar);
    }

    function formatTime(iso) {
        if (!iso) return "לא ידוע";
        var d = new Date(iso);
        if (isNaN(d.getTime())) return "לא ידוע";
        return d.toLocaleString("he-IL", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
        });
    }

    // ───────────────────────── ניהול חיבור ─────────────────────────

    function session() {
        try {
            var raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            var s = JSON.parse(raw);
            if (!s || !s.until || Date.now() >= s.until) return null;
            return s;
        } catch (e) {
            return null;
        }
    }

    function login(password, isLocal) {
        try {
            localStorage.setItem(SESSION_KEY, JSON.stringify({
                password: password,
                local: !!isLocal,
                until: Date.now() + SESSION_HOURS * 60 * 60 * 1000
            }));
        } catch (e) { /* localStorage חסום - נישאר מחוברים לטעינה הנוכחית בלבד */ }
    }

    function logout() {
        try {
            localStorage.removeItem(SESSION_KEY);
        } catch (e) { /* ignore */ }
    }

    function currentPassword() {
        var s = session();
        return s ? s.password : "";
    }

    // ───────────────────────── מסך התחברות ─────────────────────────

    function renderLogin() {
        setTitle("כניסת מנהל");
        bodyEl.innerHTML = "";
        footEl.innerHTML = "";

        var wrap = el("div", "admin-login");
        wrap.appendChild(el("p", "admin-login-text",
            "הזינו את סיסמת הניהול כדי לערוך את הודעות ועד הבית ואת סטטוס הבניין."));

        var input = el("input", "admin-input admin-login-input");
        input.type = "password";
        input.placeholder = "סיסמה";
        input.autocomplete = "off";

        var error = el("div", "admin-login-error");

        var enterBtn;

        function setBusy(on) {
            busy = on;
            enterBtn.disabled = on;
            enterBtn.textContent = on ? "בודק..." : "כניסה";
        }

        function submit() {
            if (busy) return;
            var password = input.value;
            error.textContent = "";

            // מצב מקומי מוגדר מראש - אין בכלל למי לפנות
            if (AdminStore.isLocalOnly()) {
                if (password === LOCAL_PASSWORD) {
                    localMode = true;
                    login(password, true);
                    renderEditor();
                } else {
                    error.textContent = "סיסמה שגויה - נסו שוב";
                    input.value = "";
                    input.focus();
                }
                return;
            }

            setBusy(true);
            AdminStore.verifyPassword(password).then(function (result) {
                setBusy(false);

                if (result.ok) {
                    localMode = false;
                    login(password, false);
                    renderEditor();
                    if (result.canPublish === false) {
                        toast("הסיסמה נכונה אבל חסרים GITHUB_TOKEN / GITHUB_REPO ב-Netlify - " +
                              "הפרסום לא יעבוד. ראו ADMIN_SETUP.md", "error");
                    }
                    return;
                }

                if (result.wrongPassword) {
                    error.textContent = "סיסמה שגויה - נסו שוב";
                    input.value = "";
                    input.focus();
                    return;
                }

                // הפונקציה רצה אבל חסרות לה הגדרות - זו הסיבה האמיתית,
                // ואסור להציג אותה כ"אין חיבור"
                if (result.serverError) {
                    error.textContent = result.serverError;
                    showDiagnostics();
                    input.focus();
                    return;
                }

                if (result.notDeployed) {
                    error.textContent = "פונקציית הניהול לא נמצאה באתר (404).";
                    showDiagnostics();
                    return;
                }

                // אין תשובה בכלל - מציעים מצב מקומי כדי לא להשאיר את האדמין תקוע
                if (password === LOCAL_PASSWORD) {
                    localMode = true;
                    login(password, true);
                    renderEditor();
                    toast("אין תשובה מהשרת - נכנסת במצב מקומי", "error");
                } else {
                    error.textContent = "אין תשובה משרת הניהול.";
                    showDiagnostics();
                    input.focus();
                }
            });
        }

        // כפתור אבחון: אומר בדיוק באיזה שלב ההגדרה נתקעה, במקום
        // להשאיר את המשתמש לנחש בין "אין רשת" ל"חסר משתנה סביבה"
        var diagBox = el("div", "admin-diag");

        function showDiagnostics() {
            diagBox.innerHTML = "";
            diagBox.classList.add("is-open");
            diagBox.appendChild(el("span", "admin-diag-line", "בודק את ההגדרות..."));

            AdminStore.diagnose().then(function (d) {
                diagBox.innerHTML = "";

                var row = el("div", "admin-diag-line admin-diag-" +
                    (d.state === "ready" ? "ok" : "bad"));
                row.appendChild(iconSpan(d.state === "ready" ? "check_circle" : "error"));
                row.appendChild(el("span", null, d.message));
                diagBox.appendChild(row);

                if (d.state === "misconfigured" || d.state === "not-deployed") {
                    var hint = el("div", "admin-diag-hint");
                    hint.appendChild(el("strong", null, "מה לעשות: "));
                    hint.appendChild(document.createTextNode(
                        d.state === "not-deployed"
                            ? "ב-Netlify: Site configuration → Build & deploy → " +
                              "לוודא שה-Functions directory הוא netlify/functions, ואז Deploys → Trigger deploy."
                            : "ב-Netlify: Site configuration → Environment variables → להוסיף " +
                              "ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, " +
                              "ואז לעשות Trigger deploy (משתני סביבה נכנסים לתוקף רק ב-deploy הבא)."));
                    diagBox.appendChild(hint);
                }
            });
        }

        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") submit();
        });

        wrap.appendChild(input);
        wrap.appendChild(error);

        var diagLink = button("admin-diag-link", "בדיקת חיבור והגדרות", showDiagnostics);
        wrap.appendChild(diagLink);
        wrap.appendChild(diagBox);

        bodyEl.appendChild(wrap);

        enterBtn = button("admin-btn admin-btn-primary", "כניסה", submit);
        footEl.appendChild(enterBtn);
        footEl.appendChild(button("admin-btn admin-btn-ghost", "ביטול", function () { close(true); }));

        setTimeout(function () { input.focus(); }, 50);
    }

    function setTitle(text) {
        titleEl.textContent = text;
    }

    // ───────────────────────── מסך עריכה ─────────────────────────

    function renderEditor() {
        setTitle("עריכת תוכן הדשבורד");

        draft = {
            notices: clone(AdminStore.getNotices()),
            status: clone(AdminStore.getStatus())
        };
        dirty = false;

        drawEditor();
    }

    function drawEditor() {
        bodyEl.innerHTML = "";
        footEl.innerHTML = "";

        bodyEl.appendChild(statusBanner());

        // ── לשוניות ──
        var tabs = el("div", "admin-tabs");
        tabs.appendChild(tabButton("notices", "notifications", "הודעות ועד בית", draft.notices.length));
        tabs.appendChild(tabButton("status", "apartment", "סטטוס בניין", draft.status.length));
        bodyEl.appendChild(tabs);

        // ── רשימת הפריטים ──
        var list = el("div", "admin-list");
        var items = activeTab === "notices" ? draft.notices : draft.status;

        if (!items.length) {
            list.appendChild(el("div", "admin-empty",
                activeTab === "notices" ? "אין הודעות. לחצו על \"הוספת הודעה\" כדי להתחיל."
                                       : "אין פריטי סטטוס. לחצו על \"הוספת פריט\" כדי להתחיל."));
        } else {
            items.forEach(function (item, index) {
                list.appendChild(activeTab === "notices"
                    ? noticeCard(item, index, items.length)
                    : statusCard(item, index, items.length));
            });
        }
        bodyEl.appendChild(list);

        // ── הוספה ──
        var addBtn = button("admin-add-btn", "", function () {
            if (activeTab === "notices") {
                draft.notices.push({ title: "כותרת ההודעה", body: "תוכן ההודעה", urgent: false });
            } else {
                draft.status.push({ icon: "circle-check", label: "שם הפריט", value: "הסטטוס", state: "" });
            }
            dirty = true;
            drawEditor();
            var cards = bodyEl.querySelectorAll(".admin-card");
            if (cards.length) cards[cards.length - 1].scrollIntoView({ block: "center" });
        });
        addBtn.appendChild(iconSpan("add_circle"));
        addBtn.appendChild(el("span", null, activeTab === "notices" ? "הוספת הודעה" : "הוספת פריט"));
        bodyEl.appendChild(addBtn);

        drawFooter();
    }

    // שורת מצב: מאיפה התוכן שמוצג כרגע, ומתי עודכן לאחרונה.
    // זה מה שמונע את הבלבול הגדול - "ערכתי ולא רואים את זה על הטלוויזיה".
    function statusBanner() {
        var info = AdminStore.info();

        if (localMode || info.localOnly) {
            var warn = el("div", "admin-banner admin-banner-warn");
            warn.appendChild(iconSpan("warning"));
            warn.appendChild(el("span", null,
                "מצב מקומי: השמירה תישמר במכשיר הזה בלבד ולא תופיע על שאר המסכים. " +
                "השתמשו ב\"ייצוא לקובץ קוד\" כדי להעביר את השינוי הלאה."));
            return warn;
        }

        if (info.source === "local") {
            var unpub = el("div", "admin-banner admin-banner-warn");
            unpub.appendChild(iconSpan("cloud_off"));
            unpub.appendChild(el("span", null,
                "יש שינוי ששמור במכשיר הזה בלבד ולא פורסם. לחצו \"פרסום\" כדי שיופיע על כל המסכים."));
            return unpub;
        }

        var ok = el("div", "admin-banner");
        ok.appendChild(iconSpan(info.source === "remote" ? "cloud_done" : "cloud_sync"));
        ok.appendChild(el("span", null, info.source === "remote"
            ? "התוכן המוצג הוא המפורסם. עודכן לאחרונה: " + formatTime(info.updatedAt)
            : "מציג תוכן שמור מקומית מהמשיכה האחרונה (אין כרגע מענה מהשרת)."));
        return ok;
    }

    function tabButton(id, icon, label, count) {
        var b = button("admin-tab" + (activeTab === id ? " is-active" : ""), "", function () {
            activeTab = id;
            drawEditor();
        });
        b.appendChild(iconSpan(icon));
        b.appendChild(el("span", null, label));
        b.appendChild(el("span", "admin-tab-count", String(count)));
        return b;
    }

    // ── כרטיס עריכה של הודעה ──
    function noticeCard(notice, index, total) {
        var card = el("div", "admin-card" + (notice.urgent ? " is-urgent" : ""));
        card.appendChild(cardHead("הודעה " + (index + 1), index, total, draft.notices));

        card.appendChild(field("כותרת", textInput(notice.title, function (v) {
            notice.title = v;
        })));

        var area = el("textarea", "admin-input admin-textarea");
        area.value = notice.body;
        area.rows = 2;
        area.addEventListener("input", function () {
            notice.body = area.value;
            dirty = true;
        });
        card.appendChild(field("תוכן ההודעה", area));

        // סימון "דחוף" צובע את ההודעה באדום בדשבורד
        var toggleRow = el("label", "admin-check");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = notice.urgent;
        cb.addEventListener("change", function () {
            notice.urgent = cb.checked;
            dirty = true;
            card.classList.toggle("is-urgent", cb.checked);
        });
        toggleRow.appendChild(cb);
        toggleRow.appendChild(el("span", null, "הודעה דחופה (מסגרת אדומה ובולטת)"));
        card.appendChild(toggleRow);

        return card;
    }

    // ── כרטיס עריכה של פריט סטטוס ──
    function statusCard(entry, index, total) {
        var card = el("div", "admin-card");
        card.appendChild(cardHead("פריט " + (index + 1), index, total, draft.status));

        // בוחר אייקון: כפתור שמציג את האייקון הנוכחי ופותח גריד לבחירה
        var pickerWrap = el("div", "admin-icon-picker");

        var preview = button("admin-icon-preview", "", function () {
            grid.classList.toggle("is-open");
        });
        var previewIcon = el("i", "fas fa-" + entry.icon);
        preview.appendChild(previewIcon);
        preview.appendChild(el("span", "admin-icon-preview-label", "בחירת אייקון"));
        pickerWrap.appendChild(preview);

        var grid = el("div", "admin-icon-grid");
        ICONS.forEach(function (icon) {
            var cell = button("admin-icon-cell" + (icon.id === entry.icon ? " is-selected" : ""), "", function () {
                entry.icon = icon.id;
                dirty = true;
                previewIcon.className = "fas fa-" + icon.id;
                custom.value = icon.id;
                grid.querySelectorAll(".admin-icon-cell").forEach(function (c) {
                    c.classList.remove("is-selected");
                });
                cell.classList.add("is-selected");
                grid.classList.remove("is-open");
            });
            cell.title = icon.label;
            cell.appendChild(el("i", "fas fa-" + icon.id));
            cell.appendChild(el("span", null, icon.label));
            grid.appendChild(cell);
        });

        // שדה חופשי למי שיודע שמות של Font Awesome ורוצה אייקון שלא ברשימה
        var customRow = el("div", "admin-icon-custom");
        customRow.appendChild(el("span", null, "או שם אייקון מ-Font Awesome:"));
        var custom = el("input", "admin-input admin-input-sm");
        custom.value = entry.icon;
        custom.placeholder = "לדוגמה: trash-can";
        custom.addEventListener("input", function () {
            entry.icon = custom.value.trim().replace(/^fa-/, "");
            dirty = true;
            previewIcon.className = "fas fa-" + (entry.icon || "circle-check");
        });
        customRow.appendChild(custom);
        grid.appendChild(customRow);

        pickerWrap.appendChild(grid);
        card.appendChild(field("אייקון", pickerWrap));

        card.appendChild(field("שם הפריט", textInput(entry.label, function (v) {
            entry.label = v;
        })));
        card.appendChild(field("הסטטוס המוצג", textInput(entry.value, function (v) {
            entry.value = v;
        })));

        var select = el("select", "admin-input admin-select");
        STATES.forEach(function (st) {
            var opt = el("option", null, st.label);
            opt.value = st.id;
            if (st.id === entry.state) opt.selected = true;
            select.appendChild(opt);
        });
        select.addEventListener("change", function () {
            entry.state = select.value;
            dirty = true;
        });
        card.appendChild(field("הדגשה", select));

        return card;
    }

    // ── חלקים משותפים לכרטיסים ──

    function cardHead(label, index, total, list) {
        var head = el("div", "admin-card-head");
        head.appendChild(el("span", "admin-card-title", label));

        var actions = el("div", "admin-card-actions");

        var up = button("admin-icon-btn", "", function () {
            var tmp = list[index - 1];
            list[index - 1] = list[index];
            list[index] = tmp;
            dirty = true;
            drawEditor();
        });
        up.appendChild(iconSpan("arrow_upward"));
        up.title = "העלה למעלה";
        up.disabled = index === 0;

        var down = button("admin-icon-btn", "", function () {
            var tmp = list[index + 1];
            list[index + 1] = list[index];
            list[index] = tmp;
            dirty = true;
            drawEditor();
        });
        down.appendChild(iconSpan("arrow_downward"));
        down.title = "הורד למטה";
        down.disabled = index === total - 1;

        var del = button("admin-icon-btn admin-icon-btn-danger", "", function () {
            askConfirm("למחוק את \"" + label + "\"?", "מחק", function () {
                list.splice(index, 1);
                dirty = true;
                drawEditor();
            });
        });
        del.appendChild(iconSpan("delete"));
        del.title = "מחיקה";

        actions.appendChild(up);
        actions.appendChild(down);
        actions.appendChild(del);
        head.appendChild(actions);
        return head;
    }

    function field(labelText, control) {
        var wrap = el("div", "admin-field");
        wrap.appendChild(el("label", "admin-field-label", labelText));
        wrap.appendChild(control);
        return wrap;
    }

    function textInput(value, onInput) {
        var input = el("input", "admin-input");
        input.type = "text";
        input.value = value;
        input.addEventListener("input", function () {
            onInput(input.value);
            dirty = true;
        });
        return input;
    }

    // ───────────────────────── תחתית החלון ─────────────────────────

    function drawFooter() {
        footEl.innerHTML = "";

        var main = el("div", "admin-foot-main");
        var saveBtn = button("admin-btn admin-btn-primary",
            localMode || AdminStore.isLocalOnly() ? "שמירה מקומית" : "פרסום", save);
        main.appendChild(saveBtn);
        main.appendChild(button("admin-btn admin-btn-ghost", "סגירה", function () { close(); }));

        var extra = el("div", "admin-foot-extra");

        extra.appendChild(button("admin-btn-sm admin-btn-ghost", "שחזור לתוכן שבקוד", function () {
            askConfirm("להחליף את מה שעל המסך בתוכן שכתוב בקבצי הקוד? (עוד לא יפורסם - צריך ללחוץ פרסום אחר כך)",
                "שחזר", function () {
                    var d = AdminStore.codeDefaults();
                    draft = { notices: clone(d.notices), status: clone(d.status) };
                    dirty = true;
                    drawEditor();
                    toast("נטען התוכן מקבצי הקוד");
                });
        }));

        extra.appendChild(button("admin-btn-sm admin-btn-ghost", "ייצוא לקובץ קוד", showExport));

        if (AdminStore.hasUnpublishedLocal()) {
            extra.appendChild(button("admin-btn-sm admin-btn-ghost", "ביטול שינוי מקומי", function () {
                askConfirm("לזרוק את השינוי ששמור במכשיר הזה ולחזור לתוכן המפורסם?",
                    "זרוק", function () {
                        AdminStore.discardLocal();
                        renderEditor();
                        toast("חזרנו לתוכן המפורסם");
                    });
            }));
        }

        extra.appendChild(button("admin-btn-sm admin-btn-ghost", "יציאה", function () {
            askConfirm("לצאת ממצב ניהול? תידרש סיסמה בכניסה הבאה.", "יציאה", function () {
                logout();
                close(true);
                toast("יצאת ממצב ניהול");
            });
        }));

        footEl.appendChild(main);
        footEl.appendChild(extra);

        // שמור כדי שנוכל לשנות אותו לכיתוב "מפרסם..." בזמן הבקשה
        footEl._saveBtn = saveBtn;
    }

    function setSaveBusy(on, label) {
        busy = on;
        var btn = footEl._saveBtn;
        if (!btn) return;
        btn.disabled = on;
        btn.textContent = on ? (label || "מפרסם...") : (localMode ? "שמירה מקומית" : "פרסום");
    }

    function save() {
        if (busy) return;

        // מצב מקומי - שמירה בדפדפן הנוכחי, בלי להעמיד פנים שזה פורסם
        if (localMode || AdminStore.isLocalOnly()) {
            var ok = AdminStore.saveLocal(draft.notices, draft.status);
            dirty = false;
            drawEditor();
            toast(ok ? "נשמר במכשיר הזה בלבד (לא פורסם)" : "השמירה נכשלה - הדפדפן חוסם אחסון מקומי",
                ok ? null : "error");
            return;
        }

        setSaveBusy(true);
        AdminStore.publish(currentPassword(), draft.notices, draft.status)
            .then(function () {
                setSaveBusy(false);
                dirty = false;
                renderEditor();
                toast("פורסם ✓ יופיע על כל המסכים תוך דקה-שתיים");
            })
            .catch(function (err) {
                setSaveBusy(false);
                // הפרסום נכשל - שומרים מקומית כדי שהעבודה לא תלך לאיבוד,
                // אבל אומרים במפורש שזה לא פורסם
                AdminStore.saveLocal(draft.notices, draft.status);
                dirty = false;
                drawEditor();
                toast("הפרסום נכשל: " + err.message + " — נשמר במכשיר הזה בלבד", "error");
            });
    }

    // ───────────── ייצוא הנתונים חזרה לקובץ קוד ─────────────
    // גיבוי / הטמעה ידנית - למשל אם רוצים לעדכן את קבצי ברירת המחדל שבקוד.

    function showExport() {
        var isNotices = activeTab === "notices";
        var fileName = isNotices ? "notices_data.js" : "building_status_data.js";
        // מייצאים את עותק העבודה (מה שהאדמין רואה מולו כרגע)
        var content = isNotices
            ? AdminStore.exportNoticesFile(draft.notices)
            : AdminStore.exportStatusFile(draft.status);

        setTitle("ייצוא - " + fileName);
        bodyEl.innerHTML = "";
        footEl.innerHTML = "";

        var note = el("div", "admin-note");
        note.appendChild(el("strong", null, "למה זה כאן? "));
        note.appendChild(document.createTextNode(
            "הפרסום הרגיל מעדכן את content/" + (isNotices ? "notices.json" : "building_status.json") +
            " וזה מה שכל המסכים קוראים. הטקסט שלמטה נועד לעדכן גם את קובץ " +
            fileName + " - הגיבוי שנטען כשאין אינטרנט."));
        if (dirty) {
            note.appendChild(document.createElement("br"));
            note.appendChild(el("strong", null,
                "יש שינויים שעדיין לא פורסמו - הם כלולים בטקסט שלמטה."));
        }
        bodyEl.appendChild(note);

        var area = el("textarea", "admin-input admin-export-area");
        area.value = content;
        area.readOnly = true;
        bodyEl.appendChild(area);

        var main = el("div", "admin-foot-main");
        main.appendChild(button("admin-btn admin-btn-primary", "העתקה", function () {
            area.select();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(content).then(function () {
                    toast("הועתק ללוח");
                }).catch(function () {
                    toast("ההעתקה נחסמה - סמנו ידנית והעתיקו", "error");
                });
                return;
            }
            var copied = false;
            try {
                copied = document.execCommand("copy");
            } catch (e) { /* ignore */ }
            toast(copied ? "הועתק ללוח" : "ההעתקה נחסמה - סמנו ידנית והעתיקו", copied ? null : "error");
        }));
        main.appendChild(button("admin-btn admin-btn-ghost", "הורדת קובץ", function () {
            var blob = new Blob([content], { type: "text/javascript;charset=utf-8" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        }));
        main.appendChild(button("admin-btn admin-btn-ghost", "חזרה", function () {
            setTitle("עריכת תוכן הדשבורד");
            drawEditor();
        }));
        footEl.appendChild(main);
    }

    // ───────────────────────── פתיחה / סגירה ─────────────────────────

    function open() {
        buildShell();
        root.classList.add("is-open");
        document.body.classList.add("admin-open");

        // מונע שהרענון האוטומטי של הדשבורד ימחק עריכה באמצע הקלדה
        if (window.AutoRefresh) AutoRefresh.pause();

        var s = session();
        if (s) {
            localMode = !!s.local || AdminStore.isLocalOnly();
            renderEditor();
        } else {
            renderLogin();
        }
    }

    function close(force) {
        if (busy) return;                         // אמצע פרסום - לא סוגרים
        if (!force && dirty) {
            askConfirm("יש שינויים שלא פורסמו. לסגור בלי לפרסם?", "סגור בלי לפרסם", function () {
                dirty = false;
                close(true);
            });
            return;
        }
        root.classList.remove("is-open");
        document.body.classList.remove("admin-open");
        dirty = false;
        if (window.AutoRefresh) AutoRefresh.resume();
    }

    function buildShell() {
        if (root) return;

        root = el("div", "admin-root");

        var overlay = el("div", "admin-overlay");
        overlay.addEventListener("click", function () { close(); });
        root.appendChild(overlay);

        var modal = el("div", "admin-modal");

        var head = el("div", "admin-modal-head");
        head.appendChild(iconSpan("admin_panel_settings"));
        titleEl = el("h2", "admin-modal-title", "ניהול הדשבורד");
        head.appendChild(titleEl);
        var x = button("admin-close", "", function () { close(); });
        x.appendChild(iconSpan("close"));
        x.title = "סגירה";
        head.appendChild(x);
        modal.appendChild(head);

        bodyEl = el("div", "admin-modal-body");
        modal.appendChild(bodyEl);

        footEl = el("div", "admin-modal-foot");
        modal.appendChild(footEl);

        root.appendChild(modal);
        document.body.appendChild(root);
    }

    // ───────────────────────── חיווט ─────────────────────────

    document.addEventListener("DOMContentLoaded", function () {
        var btn = document.getElementById("admin-btn");
        if (btn) {
            if (BUTTON_VISIBLE) btn.addEventListener("click", open);
            else btn.remove();
        }

        // קיצור מקלדת - עובד גם כש-ADMIN_BUTTON_VISIBLE = false
        document.addEventListener("keydown", function (e) {
            if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) {
                e.preventDefault();
                open();
            }
            if (e.key === "Escape" && root && root.classList.contains("is-open")) {
                close();
            }
        });
    });
})();
