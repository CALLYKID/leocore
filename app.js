document.addEventListener("DOMContentLoaded", () => {
  const fakeText = document.getElementById("fakeText");
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
  let mode = "typing"; // typing | pausing | deleting

  function loop() {
    const current = phrases[phraseIndex];

    if (mode === "typing") {
      fakeText.textContent = current.slice(0, charIndex + 1);
      charIndex++;

      if (charIndex === current.length) {
        mode = "pausing";
        setTimeout(() => mode = "deleting", 1200);
      }
    }

    else if (mode === "deleting") {
      fakeText.textContent = current.slice(0, charIndex - 1);
      charIndex--;

      if (charIndex === 0) {
        mode = "typing";
        phraseIndex = (phraseIndex + 1) % phrases.length;
      }
    }

    setTimeout(loop, mode === "deleting" ? 40 : 70);
  }

  loop();
});
