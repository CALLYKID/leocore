document.addEventListener("DOMContentLoaded", () => {
  const fakeText = document.getElementById("fakeText");

  const phrases = [
    "Message LeoCore",
    "Build me a plan",
    "Help me revise",
    "I'm ready",
    "Give me a funny joke"
     "Let's Chat"     
  ];

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function typeLoop() {
    const current = phrases[phraseIndex];

    if (!deleting) {
      fakeText.textContent = current.slice(0, charIndex++);
      if (charIndex > current.length) {
        setTimeout(() => deleting = true, 1200);
      }
    } else {
      fakeText.textContent = current.slice(0, charIndex--);
      if (charIndex === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
      }
    }

    setTimeout(typeLoop, deleting ? 40 : 70);
  }

  typeLoop();
});
