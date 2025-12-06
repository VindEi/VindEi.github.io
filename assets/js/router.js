document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("page-content");
  // --- ROUTE CONFIGURATION ---
  const routes = {
    "/": "/pages/home.html",
    "/projects": "/pages/projects.html",
  };
  const titles = {
    "/": "VindE | Home",
    "/projects": "VindE | Projects",
  };
  // --- NAVIGATION STATE ---
  function updateActiveNav(path) {
    document.querySelectorAll(".header-nav a").forEach((link) => {
      link.classList.remove("active");

      const href = link.getAttribute("href");
      // Match specific path or path without trailing slash
      if (href === path || href === path.replace(/\/$/, "")) {
        link.classList.add("active");
      }
    });
  }
  // --- MAIN PAGE LOADER ---
  async function loadPage(path) {
    // Normalize Path (Remove trailing slash unless root)
    let cleanPath =
      path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

    // Handle index/root edge cases
    if (cleanPath === "" || cleanPath === "/index.html") cleanPath = "/";

    // Update Metadata
    document.title = titles[cleanPath] || "VindE | 404";
    updateActiveNav(cleanPath);

    // Determine content source
    let route = routes[cleanPath] || "/404.html";

    try {
      const res = await fetch(route);
      if (!res.ok) throw new Error("404");
      const html = await res.text();

      // Render and Trigger Animation
      main.innerHTML = html;
      main.classList.remove("loaded");
      void main.offsetWidth; // Force Reflow
      main.classList.add("loaded");

      // Dispatch Event for Scripts
      document.dispatchEvent(new Event("spa-content-loaded"));
    } catch (err) {
      console.error(err);
      main.innerHTML = "<h1>404 // DATA_CORRUPTED</h1>";
    }
  }
  // --- EVENT HANDLERS ---
  // Intercept Internal Links for SPA Routing
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (link && link.getAttribute("href")?.startsWith("/")) {
      e.preventDefault();
      const url = link.getAttribute("href");
      history.pushState(null, null, url);
      loadPage(url);
    }
  });
  // Handle Browser Back/Forward Buttons
  window.addEventListener("popstate", () => loadPage(location.pathname));
  // Initial Load
  loadPage(location.pathname);
});
