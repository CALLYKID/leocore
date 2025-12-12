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
/* ============================================================
   LEOCORE — APP JS (MATCHED & SAFE)
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
     FAKE INPUT — STREAMING TEXT (ONE CONTROLLER ONLY)
  ============================================================ */

  const fakeInput = document.getElementById("fakeInput");
  const fakeText  = document.getElementById("fakeText");

  if (!fakeInput || !fakeText) {
    console.warn("Fake input elements not found");
    return;
  }

  const prompts = [
    "Message LeoCore",
    "Help me revise",
    "Give me a plan",
    "I'm ready"
  ];

  let promptIndex = 0;
  let charIndex = 0;
  let widthLocked = false;

  function lockWidthOnce(text) {
    const probe = document.createElement("span");
    probe.style.visibility = "hidden";
    probe.style.position = "absolute";
    probe.style.whiteSpace = "nowrap";
    probe.style.font = getComputedStyle(fakeText).font;
    probe.textContent = text;

    document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();

    fakeInput.style.width = Math.ceil(width + 64) + "px";
    widthLocked = true;
  }

  function streamPrompt() {
    const currentText = prompts[promptIndex];

    fakeText.textContent = currentText.slice(0, charIndex);
    charIndex++;

    // Lock size after first full sentence
    if (!widthLocked && charIndex === currentText.length) {
      lockWidthOnce(currentText);
    }

    if (charIndex <= currentText.length) {
      setTimeout(streamPrompt, 70);
    } else {
      setTimeout(() => {
        charIndex = 0;
        promptIndex = (promptIndex + 1) % prompts.length;
        streamPrompt();
      }, 1300);
    }
  }

  streamPrompt();


  /* ============================================================
     MODE BUTTONS — SAFE PLACEHOLDERS
     (NO SIDE EFFECTS, READY FOR FUTURE)
  ============================================================ */

  const modeButtons = document.querySelectorAll(".neon-btn");

  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      // Placeholder for future mode logic
      console.log("Mode selected:", btn.textContent.trim());
    });
  });

});
