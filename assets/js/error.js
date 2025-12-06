(async function initErrorPage() {
  // Elements
  const lines = [
    { el: document.querySelector(".error-top-box"), text: "ERROR 404" },
    {
      el: document.querySelector(".error-message"),
      text: "The page you are looking for does not exist.",
    },
    {
      el: document.querySelector(".error-details"),
      text: "Check the URL or press any key to return.",
    },
    {
      el: document.querySelector(".prompt-text"),
      text: "Press any key to continue",
    },
  ];

  // Safety Check
  if (!lines[0].el) return;

  // Clear text for typing effect
  lines.forEach((line) => (line.el.textContent = ""));

  // Create Blinking Cursor
  const cursor = document.createElement("span");
  cursor.textContent = "_";
  cursor.style.cssText =
    "display:inline; animation: blink 0.7s steps(1) infinite;";

  // Inject Keyframes if missing
  if (!document.getElementById("bsod-cursor-style")) {
    const style = document.createElement("style");
    style.id = "bsod-cursor-style";
    style.textContent = `@keyframes blink { 0%,50%,100% { opacity: 1; } 25%,75% { opacity: 0; } }`;
    document.head.appendChild(style);
  }

  // Typing Loop
  for (let line of lines) {
    if (!document.body.contains(line.el)) return; // Stop if user left page
    line.el.appendChild(cursor);
    for (let char of line.text) {
      line.el.insertBefore(document.createTextNode(char), cursor);
      await new Promise((r) => setTimeout(r, 40));
    }
    if (line !== lines[lines.length - 1]) line.el.removeChild(cursor);
  }

  // Keep cursor at the end
  lines[lines.length - 1].el.appendChild(cursor);

  // Return Home Logic
  let inputActive = false;
  setTimeout(() => {
    inputActive = true;
  }, 1000);

  const goHome = () => {
    if (!inputActive) return;
    window.removeEventListener("keydown", goHome);
    window.removeEventListener("click", goHome);

    // Redirect via Router (assuming router exposes loadPage or we just use href)
    // Since this is a standalone script, we update location or trigger a click
    window.history.pushState(null, null, "/");
    // Trigger popstate to notify router
    window.dispatchEvent(new Event("popstate"));
  };

  window.addEventListener("keydown", goHome);
  window.addEventListener("click", goHome);
})();
