/* ============================================================
   FAKE INPUT — SAFE, MATCHED, NO SIDE EFFECTS
============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  const fakeInput = document.getElementById("fakeInput");
  const fakeText  = document.getElementById("fakeText");

  if (!fakeInput || !fakeText) return;

  const prompts = [
    "Message LeoCore",
    "Help me revise",
    "Give me a plan",
    "I'm ready"
  ];

  let i = 0;

  function resizeToText(text) {
    const span = document.createElement("span");
    span.style.visibility = "hidden";
    span.style.position = "absolute";
    span.style.whiteSpace = "nowrap";
    span.style.font = getComputedStyle(fakeText).font;
    span.textContent = text;

    document.body.appendChild(span);
    const w = span.getBoundingClientRect().width;
    span.remove();

    fakeInput.style.width = Math.ceil(w + 64) + "px";
  }

  resizeToText(fakeText.textContent);

  setInterval(() => {
    i = (i + 1) % prompts.length;
    fakeText.textContent = prompts[i];
    resizeToText(prompts[i]);
  }, 2200);

});
