(function () {
  let isAnimating = false;

  const initErrorPage = async () => {
    const container = document.querySelector(".bsod-container");
    if (!container) return; // Not on error page
    if (isAnimating) return; // Prevent double firing
    isAnimating = true;

    // Elements
    const lines = Array.from(document.querySelectorAll(".error-line"));
    const cursor = document.querySelector(".blinking-cursor");

    // Reset state (clear text for typing effect)
    lines.forEach((line) => {
      line._fullText = line.getAttribute("data-text");
      line.textContent = "";
      line.style.opacity = "1"; // Make visible but empty
    });

    if (cursor) cursor.style.opacity = "1";

    // --- TYPING LOGIC ---
    const typeLine = async (element) => {
      const text = element._fullText;
      if (!text) return;

      // Move cursor to this line
      element.appendChild(cursor);

      for (let i = 0; i < text.length; i++) {
        // Stop if user navigated away
        if (!document.body.contains(element)) return;

        element.insertBefore(document.createTextNode(text[i]), cursor);

        // Random typing variance for realism
        const delay = Math.random() * 30 + 10;
        await new Promise((r) => setTimeout(r, delay));
      }
    };

    // Process lines sequentially
    for (const line of lines) {
      await typeLine(line);
    }

    // Enable Exit Interaction
    setTimeout(() => {
      const goHome = (e) => {
        // Prevent trigger on text selection
        if (window.getSelection().toString().length > 0) return;

        window.removeEventListener("keydown", goHome);
        window.removeEventListener("click", goHome);

        // Visual Feedback
        document.body.style.transition = "filter 0.5s ease, opacity 0.5s ease";
        document.body.style.filter = "brightness(5) blur(10px)";
        document.body.style.opacity = "0";

        // Navigation
        setTimeout(() => {
          if (window.routerLoadPage) {
            // If router is available (SPA)
            window.history.pushState(null, null, "/");
            window.routerLoadPage("/");
            // Reset styles after nav
            setTimeout(() => {
              document.body.style = "";
              isAnimating = false;
            }, 500);
          } else {
            // Standalone Fallback
            window.location.href = "/";
          }
        }, 500);
      };

      window.addEventListener("keydown", goHome);
      window.addEventListener("click", goHome);
    }, 500);
  };

  // Attach Listeners
  document.addEventListener("spa-content-loaded", initErrorPage);
  document.addEventListener("DOMContentLoaded", initErrorPage);
})();
