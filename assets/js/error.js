(async function () {
  // Elements
  const lines = [
    { el: document.querySelector(".error-top-box"), attr: "data-text" },
    { el: document.querySelector(".error-message"), attr: "data-text" },
    { el: document.querySelector(".error-details"), attr: "data-text" },
    { el: document.querySelector(".prompt-text"), attr: "data-text" },
  ];

  // Cursor Setup
  const cursor = document.createElement("span");
  cursor.textContent = "_";
  cursor.style.display = "inline-block";
  cursor.style.animation = "blink 0.5s step-end infinite alternate";

  if (!document.getElementById("cursor-keyframe")) {
    const style = document.createElement("style");
    style.id = "cursor-keyframe";
    style.innerHTML = `@keyframes blink { 50% { opacity: 0; } }`;
    document.head.appendChild(style);
  }

  // Animation Loop
  for (const line of lines) {
    if (!line.el) continue;

    // Reset content immediately
    line.el.textContent = "";

    // Get text
    const text = line.el.getAttribute(line.attr) || "";

    // Attach cursor
    line.el.appendChild(cursor);

    // Type characters
    for (let i = 0; i < text.length; i++) {
      // Safety check: User might have clicked away
      if (!document.body.contains(line.el)) return;

      line.el.insertBefore(document.createTextNode(text[i]), cursor);
      await new Promise((r) => setTimeout(r, 25)); // Typing Speed
    }

    // Remove cursor from this line (except last one)
    if (line !== lines[lines.length - 1]) {
      if (line.el.contains(cursor)) line.el.removeChild(cursor);
    }
  }

  // Exit Handler
  let canExit = false;
  setTimeout(() => {
    canExit = true;
  }, 500);

  function goHome() {
    if (!canExit) return;
    window.removeEventListener("keydown", goHome);
    window.removeEventListener("click", goHome);

    window.history.pushState(null, null, "/");
    window.dispatchEvent(new Event("popstate"));
  }

  window.addEventListener("keydown", goHome);
  window.addEventListener("click", goHome);
})();
