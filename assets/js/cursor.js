document.addEventListener("DOMContentLoaded", () => {
  const cursor = document.createElement("div");
  cursor.id = "sticky-cursor";
  document.body.appendChild(cursor);
  // Initialization
  document.body.style.cursor = "none";
  let mouseX = -100,
    mouseY = -100;
  let posX = -100,
    posY = -100;
  let width = 12,
    height = 12;
  let targetRect = null;
  let isHovering = false;
  let onScrollbar = false;
  // Track Mouse Position & Scrollbar
  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    // Detect if mouse is over vertical scrollbar
    if (mouseX > window.innerWidth - 20) {
      onScrollbar = true;
      cursor.style.opacity = "0"; // Hide custom cursor
      document.body.style.cursor = "auto"; // Show system cursor
    } else {
      onScrollbar = false;
      cursor.style.opacity = "1";
      document.body.style.cursor = "none";
    }
  });
  // Reset Lock on Scroll
  document.addEventListener(
    "scroll",
    () => {
      if (isHovering) {
        isHovering = false;
        targetRect = null;
        cursor.classList.remove("is-locked");
      }
    },
    { capture: true, passive: true }
  );
  // Handle Interactive Elements
  document.addEventListener("mouseover", (e) => {
    if (onScrollbar) return;

    const target = e.target.closest("a, button, .project-card, .hover-target");
    if (target) {
      isHovering = true;
      targetRect = target.getBoundingClientRect();
      cursor.classList.add("is-locked");
    } else {
      isHovering = false;
      targetRect = null;
      cursor.classList.remove("is-locked");
    }
  });
  // Animation Loop
  function animateCursor() {
    if (isHovering && targetRect && !onScrollbar) {
      // Magnetic Effect (Slower, damped)
      const padding = 10;
      const targetX = targetRect.left - padding;
      const targetY = targetRect.top - padding;
      const targetW = targetRect.width + padding * 2;
      const targetH = targetRect.height + padding * 2;

      posX += (targetX - posX) * 0.4;
      posY += (targetY - posY) * 0.4;
      width += (targetW - width) * 0.4;
      height += (targetH - height) * 0.4;

      cursor.style.borderRadius = "8px";
    } else {
      // Free Follow (Fast)
      const targetX = mouseX - 6;
      const targetY = mouseY - 6;

      posX += (targetX - posX) * 0.9;
      posY += (targetY - posY) * 0.9;
      width += (12 - width) * 0.5;
      height += (12 - height) * 0.5;
      cursor.style.borderRadius = "50%";
    }

    cursor.style.transform = `translate(${posX}px, ${posY}px)`;
    cursor.style.width = `${width}px`;
    cursor.style.height = `${height}px`;

    requestAnimationFrame(animateCursor);
  }
  animateCursor();
});
