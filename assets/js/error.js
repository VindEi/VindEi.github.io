window.addEventListener("DOMContentLoaded", async () => {
  const lines = [
    { el: document.querySelector(".error-top-box"), text: "ERROR 404" },
    { el: document.querySelector(".error-message"), text: "The page you are looking for does not exist." },
    { el: document.querySelector(".error-details"), text: "Check the URL or press any key/button to return home." },
    { el: document.querySelector(".prompt-text"), text: "Press any key to continue" }
  ];

  // Clear all lines first
  lines.forEach(line => line.el.textContent = "");

  // Create cursor
  const cursor = document.createElement("span");
  cursor.textContent = "_";
  cursor.style.display = "inline";
  cursor.style.animation = "blink 0.7s steps(1) infinite";
  document.head.insertAdjacentHTML("beforeend", `
    <style>
      @keyframes blink {
        0%,50%,100% { opacity: 1; }
        25%,75% { opacity: 0; }
      }
    </style>
  `);

  // Type each line
  for (let line of lines) {
    line.el.appendChild(cursor);
    for (let i = 0; i < line.text.length; i++) {
      line.el.insertBefore(document.createTextNode(line.text[i]), cursor);
      await new Promise(r => setTimeout(r, 60 + Math.random()*50));
    }
    // keep cursor on last line only
    if (line !== lines[lines.length - 1]) line.el.removeChild(cursor);
  }

  // Prompt cursor stays
  lines[lines.length - 1].el.appendChild(cursor);

  let typingDone = true;

  const eraseLine = async (lineEl) => {
    const textNodes = Array.from(lineEl.childNodes).filter(n => n.nodeType === 3); // text nodes
    lineEl.appendChild(cursor); // move cursor to end
    for (let tn = textNodes.length - 1; tn >= 0; tn--) {
      let node = textNodes[tn];
      let len = node.textContent.length;
      while (len > 0) {
        node.textContent = node.textContent.substring(0, len - 1);
        len--;
        await new Promise(r => setTimeout(r, 40));
      }
      node.remove();
    }
    lineEl.removeChild(cursor); // remove cursor after line erased
  };

  const goHome = async () => {
    if (!typingDone) return;
    document.removeEventListener("keydown", goHome);
    document.removeEventListener("click", goHome);

    for (let i = lines.length - 1; i >= 0; i--) {
      await eraseLine(lines[i].el);
      await new Promise(r => setTimeout(r, 200));
    }

    document.body.classList.add("transition-home");
    setTimeout(() => { window.location.href = "/"; }, 2500);
  };

  document.addEventListener("keydown", goHome);
  document.addEventListener("click", goHome);
});
