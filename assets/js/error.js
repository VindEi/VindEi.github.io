(function () {
  const init = async () => {
    // 1. Validation
    const container = document.querySelector(".bsod-container");
    if (!container) return; // Exit if not on error page
    // Prevent duplicate execution
    if (container.dataset.animating === "true") return;
    container.dataset.animating = "true";

    // 2. Select Elements
    const lines = [
      { el: document.querySelector(".error-top-box"), attr: "data-text" },
      { el: document.querySelector(".error-message"), attr: "data-text" },
      { el: document.querySelector(".error-details"), attr: "data-text" },
      { el: document.querySelector(".prompt-text"), attr: "data-text" },
    ];

    // 3. Initialize Cursor
    let cursor = document.getElementById("typing-cursor");
    if (!cursor) {
      cursor = document.createElement("span");
      cursor.id = "typing-cursor";
      cursor.textContent = "_";
      cursor.style.cssText =
        "display:inline-block; font-weight:bold; animation: blink 0.5s step-end infinite alternate;";
    }

    // Inject Keyframes if missing
    if (!document.getElementById("cursor-anim-style")) {
      const style = document.createElement("style");
      style.id = "cursor-anim-style";
      style.innerHTML = `@keyframes blink { 50% { opacity: 0; } }`;
      document.head.appendChild(style);
    }

    // 4. Animation Logic
    const runAnimation = async () => {
      // Clear initial text
      lines.forEach((line) => {
        if (line.el) line.el.textContent = "";
      });

      // Typing Loop
      for (const line of lines) {
        if (!line.el) continue;

        const text = line.el.getAttribute(line.attr) || "";
        line.el.appendChild(cursor);

        for (let i = 0; i < text.length; i++) {
          if (!document.body.contains(line.el)) return; // Safety check
          line.el.insertBefore(document.createTextNode(text[i]), cursor);
          await new Promise((r) => setTimeout(r, 20)); // Typing speed
        }

        // Cleanup cursor from line (unless last)
        if (line !== lines[lines.length - 1]) {
          if (line.el.contains(cursor)) line.el.removeChild(cursor);
        }
      }

      setupExit();
    };

    // 5. Exit Logic
    const setupExit = () => {
      // Delay interaction to prevent accidental clicks
      setTimeout(() => {
        const goHome = () => {
          window.removeEventListener("keydown", goHome);
          window.removeEventListener("click", goHome);

          // SPA Navigation if available, otherwise Force Reload
          if (window.history && window.history.pushState) {
            window.history.pushState(null, null, "/");
            window.dispatchEvent(new Event("popstate"));

            // Fallback reload if Router is missing (Standalone mode)
            if (!document.getElementById("page-content"))
              window.location.href = "/";
          } else {
            window.location.href = "/";
          }
        };

        window.addEventListener("keydown", goHome);
        window.addEventListener("click", goHome);
      }, 500);
    };

    // Execute
    runAnimation();
  };
  // --- EVENT LISTENERS ---
  // Listen for SPA Router Events
  document.addEventListener("spa-content-loaded", init);
  // Listen for Direct Page Load (GitHub Pages Standalone)
  document.addEventListener("DOMContentLoaded", init);
})();
