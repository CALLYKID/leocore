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
const fakeText = document.getElementById("fakeText");

const streamText = "Message LeoCore";
let i = 0;

function streamType() {
  fakeText.textContent = streamText.slice(0, i);
  i++;

  if (i <= streamText.length) {
    setTimeout(streamType, 80);
  } else {
    i = 0;
    setTimeout(streamType, 1200);
  }
}

streamType();
