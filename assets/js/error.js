document.addEventListener("spa-content-loaded", () => {
  // 1. Check if we are on the 404 page
  const container = document.querySelector(".bsod-container");
  if (!container) return; // Not a 404 page? Do nothing.

  // 2. Select Elements
  const lines = [
    { el: document.querySelector(".error-top-box"), attr: "data-text" },
    { el: document.querySelector(".error-message"), attr: "data-text" },
    { el: document.querySelector(".error-details"), attr: "data-text" },
    { el: document.querySelector(".prompt-text"), attr: "data-text" },
  ];

  // 3. Setup Cursor
  const cursor = document.createElement("span");
  cursor.className = "typing-cursor";
  cursor.textContent = "_";
  cursor.style.cssText =
    "display:inline-block; font-weight:bold; animation: blink 0.5s step-end infinite alternate;";

  if (!document.getElementById("cursor-anim-style")) {
    const style = document.createElement("style");
    style.id = "cursor-anim-style";
    style.innerHTML = `@keyframes blink { 50% { opacity: 0; } }`;
    document.head.appendChild(style);
  }

  // 4. Animation Function
  const runAnimation = async () => {
    // Clear text first
    lines.forEach((line) => {
      if (line.el) line.el.textContent = "";
    });

    for (const line of lines) {
      if (!line.el) continue;

      const text = line.el.getAttribute(line.attr) || "";
      line.el.appendChild(cursor);

      for (let i = 0; i < text.length; i++) {
        if (!document.body.contains(line.el)) return; // Stop if user left
        line.el.insertBefore(document.createTextNode(text[i]), cursor);
        await new Promise((r) => setTimeout(r, 20));
      }

      // Cleanup cursor from this line
      if (line !== lines[lines.length - 1]) {
        if (line.el.contains(cursor)) line.el.removeChild(cursor);
      }
    }

    setupExit();
  };

  // 5. Exit Logic (Go Home)
  const setupExit = () => {
    // Wait a bit before enabling exit so they don't accidentally click
    setTimeout(() => {
      const goHome = () => {
        window.removeEventListener("keydown", goHome);
        window.removeEventListener("click", goHome);

        // Use the History API to change URL
        window.history.pushState(null, null, "/");
        // Manually trigger the router to load Home
        window.dispatchEvent(new Event("popstate"));
      };

      window.addEventListener("keydown", goHome);
      window.addEventListener("click", goHome);
    }, 500);
  };

  // Run it
  runAnimation();
});
