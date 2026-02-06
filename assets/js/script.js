/**
 * Global Site Controller
 * Orchestrates theme persistence and asynchronous component assembly.
 */
document.addEventListener("DOMContentLoaded", () => {
  // --- 1. THEME INITIALIZATION ---
  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
  }

  /**
   * Syncs the moon/sun icon based on current theme.
   */
  function syncThemeIcon() {
    const btn = document.querySelector("#theme-toggle");
    if (!btn) return;
    const icon = btn.querySelector("i");
    if (!icon) return;
    icon.className = document.body.classList.contains("light-theme")
      ? "fas fa-sun"
      : "fas fa-moon";
  }

  /**
   * Fetches and injects Header and Footer HTML fragments.
   * Uses Promise.all to ensure both load before revealing the UI.
   */
  const loadComponents = async () => {
    const headerPlaceholder = document.getElementById("header-placeholder");
    const footerPlaceholder = document.getElementById("footer-placeholder");

    try {
      const [headerRes, footerRes] = await Promise.all([
        fetch("/assets/components/header.html"),
        fetch("/assets/components/footer.html"),
      ]);

      if (!headerRes.ok || !footerRes.ok)
        throw new Error("Component Fetch Failure");

      headerPlaceholder.innerHTML = await headerRes.text();
      footerPlaceholder.innerHTML = await footerRes.text();

      // UI Reveal: Remove initial hiding opacity
      document.body.classList.add("loaded");
      syncThemeIcon();

      // Dispatch event to allow router.js to update navigation active states
      window.dispatchEvent(new Event("componentsLoaded"));
    } catch (err) {
      console.error("[Critical] Layout assembly failed:", err);
    }
  };

  loadComponents();

  // --- 2. THEME TOGGLE EVENT ---
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#theme-toggle");
    if (!btn) return;

    const isLightNow = document.body.classList.toggle("light-theme");
    syncThemeIcon();
    localStorage.setItem("theme", isLightNow ? "light" : "dark");

    // Signal theme-aware components (like Leaflet) to re-render
    document.dispatchEvent(
      new CustomEvent("themeChanged", {
        detail: { theme: isLightNow ? "light" : "dark" },
      }),
    );
  });
});
