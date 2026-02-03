document.addEventListener("DOMContentLoaded", () => {
  // 1. MOBILE CHECK: Exit immediately if device uses touch (no mouse)
  if (!window.matchMedia("(pointer: fine)").matches) return;

  // 2. SETUP
  const cursor = document.createElement("div");
  cursor.id = "sticky-cursor";
  document.body.appendChild(cursor);
  document.body.classList.add("custom-cursor-active");

  // State Variables
  let mouseX = -100,
    mouseY = -100; // Target mouse position
  let posX = -100,
    posY = -100; // Current cursor position (for lag effect)
  let width = 12,
    height = 12; // Current size

  let targetRect = null; // Bounding box of hovered element
  let isHovering = false;
  let isScrollbar = false;

  // Linear Interpolation (Smoothing)
  const lerp = (start, end, factor) => start + (end - start) * factor;

  // 3. EVENT LISTENERS

  // Track Mouse
  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Dynamic Scrollbar Detection
    // Checks if mouse is in the "gutter" between window width and document width
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    if (mouseX > window.innerWidth - scrollbarWidth - 5 && scrollbarWidth > 0) {
      isScrollbar = true;
      cursor.style.opacity = "0";
      document.body.style.cursor = "auto";
    } else {
      isScrollbar = false;
      cursor.style.opacity = "1";
      document.body.style.cursor = "none";
    }
  });

  // Handle Window Enter/Exit
  document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget) cursor.style.opacity = "0";
  });
  document.addEventListener("mouseover", () => {
    if (!isScrollbar) cursor.style.opacity = "1";
  });

  // Hover Detection (Delegation)
  document.addEventListener(
    "mouseover",
    (e) => {
      if (isScrollbar) return;

      // Detect interactive elements
      const target = e.target.closest(
        "a, button, .project-card, input, .hover-target",
      );

      if (target) {
        isHovering = true;
        targetRect = target.getBoundingClientRect();

        // OPTIONAL: Get the computed border radius of the target to match shape
        const style = window.getComputedStyle(target);
        cursor.dataset.borderRadius = style.borderRadius;

        cursor.classList.add("is-locked");
      } else {
        isHovering = false;
        targetRect = null;
        cursor.classList.remove("is-locked");
      }
    },
    { passive: true },
  );

  // Update Target Position on Scroll
  document.addEventListener(
    "scroll",
    () => {
      if (isHovering && document.querySelector(".is-locked")) {
        // Find the currently hovered element again to update coordinates
        // (Simplified: we unlock to prevent floating cursor issues during fast scroll)
        isHovering = false;
        cursor.classList.remove("is-locked");
      }
    },
    { passive: true },
  );

  // 4. ANIMATION LOOP (The Physics)
  function render() {
    let targetX, targetY, targetW, targetH, targetRadius;

    if (isHovering && targetRect && !isScrollbar) {
      // LOCKED STATE: Snap to element
      const padding = 8; // Extra breathing room around button
      targetX = targetRect.left - padding;
      targetY = targetRect.top - padding;
      targetW = targetRect.width + padding * 2;
      targetH = targetRect.height + padding * 2;
      targetRadius = cursor.dataset.borderRadius || "8px"; // Match button shape or default to 8px
    } else {
      // DEFAULT STATE: Follow mouse center
      targetW = 12;
      targetH = 12;
      targetX = mouseX - targetW / 2;
      targetY = mouseY - targetH / 2;
      targetRadius = "50%";
    }

    // Apply Physics (Lerp)
    // 0.2 = slow/heavy, 0.5 = fast/snappy
    const speed = isHovering ? 0.25 : 0.5;

    posX = lerp(posX, targetX, speed);
    posY = lerp(posY, targetY, speed);
    width = lerp(width, targetW, speed);
    height = lerp(height, targetH, speed);

    // Apply Styles (Using transform for position is more performant than top/left)
    cursor.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
    cursor.style.width = `${width}px`;
    cursor.style.height = `${height}px`;
    cursor.style.borderRadius = targetRadius;

    requestAnimationFrame(render);
  }

  // Start Loop
  render();
});
