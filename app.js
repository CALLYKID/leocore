/* ============================================================
   FIXED STREAMING TEXT (TYPE + DELETE)
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const fakeText = document.getElementById("fakeText");
  if (!fakeText) return;

  const messages = [
    "Message LeoCore",
    "Help me revise",
    "Build me a plan",
    "I'm ready"
  ];

  let msg = 0;
  let char = 0;
  let deleting = false;

  function loop() {
    const text = messages[msg];

    if (!deleting) {
      fakeText.textContent = text.slice(0, char++);
      if (char > text.length) {
        setTimeout(() => deleting = true, 1200);
      }
    } else {
      fakeText.textContent = text.slice(0, char--);
      if (char < 0) {
        deleting = false;
        msg = (msg + 1) % messages.length;
        char = 0;
      }
    }

    setTimeout(loop, deleting ? 45 : 70);
  }

  loop();
});
