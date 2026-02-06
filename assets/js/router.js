/**
 * Single Page Application (SPA) Router
 * Intercepts link clicks and manages dynamic content injection.
 */
document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("page-content");
  const header = document.getElementById("header-placeholder");
  const footer = document.getElementById("footer-placeholder");

  let isNavReady = false;

  const routes = {
    "/": "/pages/home.html",
    "/projects": "/pages/projects.html",
    "/projects/snapdns": "/pages/projects/snapdns.html",
    "/echo": "/pages/echo.html",
  };

  const titles = {
    "/": "VindE | Home",
    "/projects": "VindE | Projects",
    "/projects/snapdns": "VindE | SnapDNS",
    "/echo": "VindE | Echo",
  };

  /**
   * Updates visual 'active' state in navigation menus.
   */
  function updateActiveNav(path) {
    if (!isNavReady) return;

    document
      .querySelectorAll(".header-nav a, .echo-btn")
      .forEach((el) => el.classList.remove("active"));

    document.querySelectorAll(".header-nav a").forEach((link) => {
      const href = link.getAttribute("href");
      const isMatch = href === path || (href !== "/" && path.startsWith(href));
      if (isMatch) link.classList.add("active");
    });

    const echoBtn = document.querySelector(".echo-btn");
    if (echoBtn && path === "/echo") echoBtn.classList.add("active");
  }

  // Hook into componentsLoaded signal from script.js
  window.addEventListener("componentsLoaded", () => {
    isNavReady = true;
    updateActiveNav(location.pathname);
  });

  /**
   * Main Page Loader
   * Handles path normalization, metadata updates, and content injection.
   */
  async function loadPage(path) {
    // Normalize clean URL paths
    let cleanPath =
      path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
    if (cleanPath === "" || cleanPath === "/index.html") cleanPath = "/";

    document.title = titles[cleanPath] || "VindE | 404";
    updateActiveNav(cleanPath);

    const route = routes[cleanPath] || "/404.html";
    const is404 = route === "/404.html";

    // Manage UI visibility for error states
    if (header) header.style.display = is404 ? "none" : "block";
    if (footer) footer.style.display = is404 ? "none" : "block";

    try {
      const res = await fetch(route);
      if (!res.ok) throw new Error("HTTP_404");

      const rawHtml = await res.text();
      let content = rawHtml;

      // Extract specific content container if loading a full HTML document
      if (rawHtml.includes("bsod-container")) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");
        content = doc.querySelector(".bsod-container").outerHTML;
      }

      // Smooth Animation: Fade Out -> Swap -> Fade In
      main.classList.remove("loaded");

      setTimeout(() => {
        main.innerHTML = content;
        void main.offsetWidth; // Force Reflow
        main.classList.add("loaded");

        // Notify page-specific scripts (Echo map, Project cards)
        document.dispatchEvent(new Event("spa-content-loaded"));
      }, 200);
    } catch (err) {
      console.error("[Router] Route resolution failed:", err);
      main.innerHTML = `<div style="text-align:center; padding:100px;"><h1>ERROR_FETCH_FAILED</h1><a href="/" class="btn">REBOOT_SYSTEM</a></div>`;
      main.classList.add("loaded");
    }
  }

  // --- Interaction Event Listeners ---

  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    // Intercept internal links while permitting external targets to function normally
    if (
      link &&
      link.getAttribute("href")?.startsWith("/") &&
      !link.getAttribute("target")
    ) {
      e.preventDefault();
      const url = link.getAttribute("href");
      history.pushState(null, null, url);
      loadPage(url);
    }
  });

  window.addEventListener("popstate", () => loadPage(location.pathname));

  // Initialize initial path resolution
  loadPage(location.pathname);
});
