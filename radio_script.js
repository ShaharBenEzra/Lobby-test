// כפתור גלגלצ - כברירת מחדל אין שמע, לחיצה על הכפתור מתחילה/עוצרת שידור חי
(function () {
    const STREAM_URL = "https://glzwizzlv.bynetcdn.com/glglz_mp3";

    const toggle = document.getElementById("radio-toggle");
    const audio = document.getElementById("galgalatz-audio");
    const icon = document.getElementById("radio-icon");
    const label = document.getElementById("radio-label");

    let isPlaying = false;

    function setPlayingState(playing) {
        isPlaying = playing;
        toggle.classList.toggle("is-playing", playing);
        toggle.setAttribute("aria-pressed", String(playing));
        icon.textContent = playing ? "pause" : "play_arrow";
        label.textContent = playing ? "גלגלצ - שידור חי" : "גלגלצ";
    }

    function stopRadio() {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        setPlayingState(false);
    }

    function startRadio() {
        audio.src = STREAM_URL;
        audio.play().catch(() => stopRadio());
        setPlayingState(true);
    }

    toggle.addEventListener("click", () => {
        if (isPlaying) {
            stopRadio();
        } else {
            startRadio();
        }
    });

    audio.addEventListener("error", stopRadio);
})();
