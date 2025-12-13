document.addEventListener("DOMContentLoaded", () => {
  const fakeText = document.getElementById("hero-text");
  if (!fakeText) return;

  const phrases = [
    "Message LeoCore",
    "Build me a plan",
    "Help me revise",
    "I'm ready",
    "Give me a funny joke",
    "Let's chat"
  ];

  let phraseIndex = 0;
  let charIndex = 0;
  let state = "typing"; // typing | pausing | deleting

  function loop() {
    const current = phrases[phraseIndex];

    if (state === "typing") {
      fakeText.textContent = current.slice(0, charIndex + 1);
      charIndex++;

      if (charIndex === current.length) {
        state = "pausing";
        setTimeout(() => {
          state = "deleting";
        }, 1200);
      }
    }

    else if (state === "deleting") {
      fakeText.textContent = current.slice(0, charIndex - 1);
      charIndex--;

      if (charIndex === 0) {
        state = "typing";
        phraseIndex = (phraseIndex + 1) % phrases.length;
      }
    }

    setTimeout(loop, state === "deleting" ? 40 : 70);
  }

  loop();
});
