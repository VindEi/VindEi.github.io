/**
 * Global Site Initialization
 */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Theme Persistence
  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
  }

  const syncThemeIcon = () => {
    const btn = document.querySelector("#theme-toggle i");
    if (!btn) return;
    btn.className = document.body.classList.contains("light-theme")
      ? "fas fa-sun"
      : "fas fa-moon";
  };

  // 2. Component Fetcher
  const loadComponents = async () => {
    try {
      const [hRes, fRes] = await Promise.all([
        fetch("/assets/components/header.html"),
        fetch("/assets/components/footer.html"),
      ]);

      if (!hRes.ok || !fRes.ok) throw new Error("Fetch failed");

      document.getElementById("header-placeholder").innerHTML =
        await hRes.text();
      document.getElementById("footer-placeholder").innerHTML =
        await fRes.text();

      // Show the header/footer
      document.body.classList.add("loaded");
      syncThemeIcon();

      // Notify router
      window.dispatchEvent(new Event("componentsLoaded"));
    } catch (err) {
      console.error("[Critical] Failed to load components:", err);
    }
  };

  loadComponents();

  // 3. Theme Toggle Listener
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#theme-toggle");
    if (!btn) return;

    const isLight = document.body.classList.toggle("light-theme");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    syncThemeIcon();

    document.dispatchEvent(
      new CustomEvent("themeChanged", {
        detail: { theme: isLight ? "light" : "dark" },
      }),
    );
  });
});
