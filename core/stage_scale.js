// מתאים את #tv-stage (קנבס פיקסלים קבוע 1280x720) לגודל החלון בפועל,
// ע"י transform:scale עם פקטור זהה לרוחב ולגובה - זה מה שמבטיח שהתצוגה
// תישאר פרופורציונלית בכל מסך/רזולוציה, כולל בתוך אפליקציות קיוסק
// (Fully Kiosk, TVBro) שבהן ה-viewport בפועל לא תמיד ידוע/עקבי.
(function () {
    var DESIGN_WIDTH = 1280;
    var DESIGN_HEIGHT = 720;
    var stage = document.getElementById("tv-stage");
    if (!stage) return;

    function fitStage() {
        var scale = Math.min(
            window.innerWidth / DESIGN_WIDTH,
            window.innerHeight / DESIGN_HEIGHT
        );
        var offsetX = (window.innerWidth - DESIGN_WIDTH * scale) / 2;
        var offsetY = (window.innerHeight - DESIGN_HEIGHT * scale) / 2;

        stage.style.transform = "scale(" + scale + ")";
        stage.style.left = offsetX + "px";
        stage.style.top = offsetY + "px";
    }

    window.addEventListener("resize", fitStage);
    window.addEventListener("orientationchange", fitStage);
    fitStage();
})();
