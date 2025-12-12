/* ============================================================
   SECTION 0 — MOBILE VIEWPORT FIX (SAFE)
============================================================ */
function fixVh() {
  document.documentElement.style.setProperty(
    "--vh",
    window.innerHeight * 0.01 + "px"
  );
}
fixVh();
window.addEventListener("resize", fixVh);


/* ============================================================
   SECTION 1 — FAKE INPUT TEXT ENGINE (MATCHES HTML)
============================================================ */
const fakeInput = document.getElementById("fakeInput");
const fakeText  = document.getElementById("fakeText");

const prompts = [
  "Message LeoCore",
  "Help me revise",
  "Give me a plan",
  "I'm ready"
];

let index = 0;

/* Measure text width to resize button smoothly */
function resizeFakeInput(text) {
  const measurer = document.createElement("span");
  measurer.style.visibility = "hidden";
  measurer.style.position = "absolute";
  measurer.style.whiteSpace = "nowrap";
  measurer.style.font = getComputedStyle(fakeText).font;
  measurer.textContent = text;

  document.body.appendChild(measurer);
  const width = measurer.offsetWidth;
  document.body.removeChild(measurer);

  fakeInput.style.width = width + 56 + "px"; // padding buffer
}

/* Initial size */
resizeFakeInput(fakeText.textContent);

/* Rotate text */
setInterval(() => {
  index = (index + 1) % prompts.length;
  fakeText.textContent = prompts[index];
  resizeFakeInput(prompts[index]);
}, 2200);


/* ============================================================
   SECTION 2 — CLICK FEEDBACK (NO CHAT YET)
============================================================ */
fakeInput.addEventListener("click", () => {
  fakeInput.classList.add("active");

  setTimeout(() => {
    fakeInput.classList.remove("active");
  }, 180);
});
