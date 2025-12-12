/* ============================================================
   FAKE INPUT — CLEAN STREAMING (BUG-FREE)
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

  let promptIndex = 0;
  let charIndex = 0;
  let widthLocked = false;

  function lockWidth(text) {
    const probe = document.createElement("span");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "nowrap";
    probe.style.font = getComputedStyle(fakeText).font;
    probe.textContent = text;

    document.body.appendChild(probe);
    fakeInput.style.width = Math.ceil(probe.offsetWidth + 64) + "px";
    probe.remove();

    widthLocked = true;
  }

  function typeNextChar() {
    const text = prompts[promptIndex];

    fakeText.textContent = text.slice(0, charIndex);
    charIndex++;

    if (charIndex <= text.length) {
      setTimeout(typeNextChar, 70);
    } else {
      // lock width ONCE after first sentence finishes
      if (!widthLocked) lockWidth(text);

      // pause fully rendered text
      setTimeout(() => {
        charIndex = 0;
        fakeText.textContent = "";
        promptIndex = (promptIndex + 1) % prompts.length;
        setTimeout(typeNextChar, 300);
      }, 1400);
    }
  }

  typeNextChar();

});
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
