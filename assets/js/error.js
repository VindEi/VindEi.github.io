(async function initErrorPage() {
  // Select all elements that have data-text attributes
  const elements = [
    document.querySelector(".error-top-box"),
    document.querySelector(".error-message"),
    document.querySelector(".error-details"),
    document.querySelector(".prompt-text"),
  ];

  // Safety Check: If HTML isn't loaded yet, stop
  if (!elements[0]) return;

  // Prepare Cursor
  const cursor = document.createElement("span");
  cursor.textContent = "_";
  cursor.style.cssText =
    "display:inline-block; animation: blink 0.7s steps(1) infinite; color: inherit;";

  // Inject Keyframes if missing
  if (!document.getElementById("bsod-cursor-style")) {
    const style = document.createElement("style");
    style.id = "bsod-cursor-style";
    style.textContent = `@keyframes blink { 0%,50%,100% { opacity: 1; } 25%,75% { opacity: 0; } }`;
    document.head.appendChild(style);
  }

  // Clear initial content and start typing loop
  for (let el of elements) {
    if (!el) continue;

    // Get text from the HTML attribute
    const textToType = el.getAttribute("data-text") || "";
    el.textContent = ""; // Clear it

    el.appendChild(cursor);

    // Type character by character
    for (let char of textToType) {
      if (!document.body.contains(el)) return; // Stop if user left page
      el.insertBefore(document.createTextNode(char), cursor);
      // Fast typing speed
      await new Promise((r) => setTimeout(r, 20));
    }

    // Remove cursor from this line (unless it's the last one)
    if (el !== elements[elements.length - 1]) {
      el.removeChild(cursor);
    }
  }

  // Return Home Logic
  let inputActive = false;
  // Wait 1 second before allowing exit
  setTimeout(() => {
    inputActive = true;
  }, 500);

  const goHome = () => {
    if (!inputActive) return;
    window.removeEventListener("keydown", goHome);
    window.removeEventListener("click", goHome);

    // Trigger Router
    window.history.pushState(null, null, "/");
    window.dispatchEvent(new Event("popstate"));
  };

  window.addEventListener("keydown", goHome);
  window.addEventListener("click", goHome);
})();
