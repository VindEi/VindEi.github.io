document.addEventListener("DOMContentLoaded", () => {
  // --- 1. THEME INITIALIZATION ---
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
  }

  // --- 2. ICON SYNC LOGIC ---
  function syncThemeIcon() {
    const btn = document.querySelector("#theme-toggle");
    // NOTE: Button might not be loaded yet if header fetch is slow
    if (!btn) return;

    const icon = btn.querySelector("i");
    if (!icon) return;

    const isLight = document.body.classList.contains("light-theme");
    icon.className = isLight ? "fas fa-sun" : "fas fa-moon";
  }

  // --- 3. COMPONENT LOADER ---
  // OPTIMIZED: Uses Promise.all to load both header and footer efficiently
  const loadComponents = async () => {
    try {
      const [headerRes, footerRes] = await Promise.all([
        fetch("/assets/components/header.html"),
        fetch("/assets/components/footer.html"),
      ]);

      if (!headerRes.ok || !footerRes.ok)
        throw new Error("Component Fetch Failed");

      document.getElementById("header-placeholder").innerHTML =
        await headerRes.text();
      document.getElementById("footer-placeholder").innerHTML =
        await footerRes.text();

      // FIXED: Notify the app that the skeleton is ready
      document.body.classList.add("loaded");
      syncThemeIcon(); // Sync icon after header loads

      // FIXED: Dispatch Custom Event so router knows it can highlight links now
      window.dispatchEvent(new Event("componentsLoaded"));
    } catch (err) {
      console.error("CRITICAL: Failed to load layout components:", err);
    }
  };

  // Start Loading
  loadComponents();

  // --- 4. THEME TOGGLE EVENT ---
  // Uses event delegation (document level) so it works even if header reloads
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#theme-toggle");
    if (!btn) return;

    // Toggle Theme
    const isLightNow = document.body.classList.toggle("light-theme");

    // Update Icon
    syncThemeIcon();

    // Save Preference
    localStorage.setItem("theme", isLightNow ? "light" : "dark");

    // Notify other scripts (like Echo map)
    document.dispatchEvent(
      new CustomEvent("themeChanged", {
        detail: { theme: isLightNow ? "light" : "dark" },
      }),
    );
  });
});
