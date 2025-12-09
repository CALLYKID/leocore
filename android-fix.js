/* ============================================================
   ANDROID VIEWPORT + VIDEO FIXER
   (No conflicts with app.js — standalone)
============================================================ */

// Hard-lock viewport scale on Android to stop zooming/stretching
function lockViewport() {
    const meta = document.querySelector("meta[name=viewport]");
    if (!meta) return;

    meta.setAttribute(
        "content",
        "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, viewport-fit=cover"
    );
}

// Prevent viewport from shifting when keyboard opens
window.addEventListener("resize", () => {
    document.documentElement.style.height = window.innerHeight + "px";
});

// Fix video jitter + scaling on some Android GPUs
function stabiliseVideo() {
    const v = document.getElementById("bgVideo");
    if (!v) return;

    v.style.transform = "translateZ(0) scale(1.05)";
    v.style.willChange = "transform";
}

// Patch applied after DOM fully loads
document.addEventListener("DOMContentLoaded", () => {
    lockViewport();
    stabiliseVideo();

    // Android orientation snap fix
    window.addEventListener("orientationchange", () => {
        setTimeout(() => {
            lockViewport();
            stabiliseVideo();
        }, 250);
    });
});

