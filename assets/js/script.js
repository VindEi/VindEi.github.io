/**
 * Global Controller
 * Manages theme state and async component assembly.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Persistence: Apply theme immediately
  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "light") document.body.classList.add("light-theme");

  const loadComponents = async () => {
    try {
      const [hRes, fRes] = await Promise.all([
        fetch("/assets/components/header.html"),
        fetch("/assets/components/footer.html"),
      ]);

      document.getElementById("header-placeholder").innerHTML =
        await hRes.text();
      document.getElementById("footer-placeholder").innerHTML =
        await fRes.text();

      document.body.classList.add("loaded");

      // Update toggle icon
      const icon = document.querySelector("#theme-toggle i");
      if (icon)
        icon.className = document.body.classList.contains("light-theme")
          ? "fas fa-sun"
          : "fas fa-moon";

      window.dispatchEvent(new Event("componentsLoaded"));
    } catch (err) {
      console.error("Component load failed", err);
    }
  };

  loadComponents();

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#theme-toggle");
    if (!btn) return;
    const isLight = document.body.classList.toggle("light-theme");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    const icon = btn.querySelector("i");
    icon.className = isLight ? "fas fa-sun" : "fas fa-moon";
    document.dispatchEvent(
      new CustomEvent("themeChanged", {
        detail: { theme: isLight ? "light" : "dark" },
      }),
    );
  });
});
