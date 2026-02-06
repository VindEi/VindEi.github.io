/**
 * VindE - Single Page Application (SPA) Router
 *
 * Logic Overview:
 * 1. Intercepts internal link clicks to prevent full page reloads.
 * 2. Dynamically fetches HTML fragments based on the current URL path.
 * 3. Lazy-loads page-specific CSS to optimize initial render speed.
 * 4. Manages metadata (page titles) and navigation active states.
 */

document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("page-content");
  const headerPlaceholder = document.getElementById("header-placeholder");
  const footerPlaceholder = document.getElementById("footer-placeholder");

  // State Management
  let isNavReady = false;
  const loadedAssets = new Set();

  // Route Mapping
  const routes = {
    "/": "/pages/home.html",
    "/projects": "/pages/projects.html",
    "/projects/snapdns": "/pages/projects/snapdns.html",
    "/echo": "/pages/echo.html",
  };

  // Metadata Mapping
  const titles = {
    "/": "VindE | Home",
    "/projects": "VindE | Projects",
    "/projects/snapdns": "VindE | SnapDNS",
    "/echo": "VindE | Echo",
  };

  /**
   * Dynamically injects CSS stylesheets into the document head.
   * This is used to remove non-critical CSS from the home page's initial load.
   *
   * @param {string} href - Path to the CSS file.
   */
  function lazyLoadCSS(href) {
    if (loadedAssets.has(href)) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);

    loadedAssets.add(href);
  }

  /**
   * Manages the 'active' class for navigation elements.
   * Logic triggers only after script.js confirms component injection.
   *
   * @param {string} path - The normalized URL path.
   */
  function updateActiveNav(path) {
    if (!isNavReady) return;

    // Reset all navigation items
    document.querySelectorAll(".header-nav a, .echo-btn").forEach((el) => {
      el.classList.remove("active");
    });

    // Handle Header Links (includes sub-page parent matching)
    document.querySelectorAll(".header-nav a").forEach((link) => {
      const href = link.getAttribute("href");
      const isExact = href === path;
      const isSubPage = href !== "/" && path.startsWith(href);

      if (isExact || isSubPage) {
        link.classList.add("active");
      }
    });

    // Handle Footer Echo Button
    const echoBtn = document.querySelector(".echo-btn");
    if (echoBtn && path === "/echo") {
      echoBtn.classList.add("active");
    }
  }

  /**
   * Main Navigation Orchestrator
   * Handles path resolution, asset loading, fetching, and content injection.
   *
   * @param {string} path - Target navigation path.
   */
  async function loadPage(path) {
    // 1. Normalize Path (Removes trailing slashes and handles index.html)
    let cleanPath =
      path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
    if (cleanPath === "" || cleanPath === "/index.html") cleanPath = "/";

    // 2. Resource Management: Lazy-load route-specific CSS
    if (cleanPath.startsWith("/projects")) {
      lazyLoadCSS("/assets/css/projects.css");
    }
    if (cleanPath === "/echo") {
      lazyLoadCSS("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    }

    // 3. Metadata and Navigation State
    document.title = titles[cleanPath] || "VindE | 404";
    updateActiveNav(cleanPath);

    // 4. Route Resolution
    const route = routes[cleanPath] || "/404.html";
    const is404 = route === "/404.html";

    // Toggle UI visibility for standalone error/BSOD pages
    if (headerPlaceholder)
      headerPlaceholder.style.display = is404 ? "none" : "block";
    if (footerPlaceholder)
      footerPlaceholder.style.display = is404 ? "none" : "block";

    try {
      const res = await fetch(route);
      if (!res.ok) throw new Error(`HTTP_${res.status}`);

      const rawHtml = await res.text();
      let content = rawHtml;

      // Extract .bsod-container if fetching a full HTML document (standalone fallback)
      if (rawHtml.includes("bsod-container")) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");
        const container = doc.querySelector(".bsod-container");
        content = container ? container.outerHTML : doc.body.innerHTML;
      }

      // 5. Injection and Transition Animation
      main.classList.remove("loaded");

      // Small delay to allow the CSS 'opacity 0' transition to complete
      setTimeout(() => {
        main.innerHTML = content;
        void main.offsetWidth; // Force Reflow to restart CSS animations
        main.classList.add("loaded");

        // Notify secondary scripts (Echo, Projects, Cursor) that DOM has updated
        document.dispatchEvent(new Event("spa-content-loaded"));
      }, 200);
    } catch (err) {
      console.error("[Router] Fatal Exception:", err);
      main.innerHTML = `<div style="text-align:center; padding:100px;"><h1>ERROR_FETCH_FAILED</h1><a href="/" class="btn">REBOOT_SYSTEM</a></div>`;
      main.classList.add("loaded");
    }
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  /**
   * Listen for component loader signal from script.js
   */
  window.addEventListener("componentsLoaded", () => {
    isNavReady = true;
    updateActiveNav(location.pathname);
  });

  /**
   * Intercept internal document links for SPA navigation
   */
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    // Only intercept local paths starting with /
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

  /**
   * Handle browser back/forward buttons
   */
  window.addEventListener("popstate", () => loadPage(location.pathname));

  // Initialize view for the current entry path
  loadPage(location.pathname);
});
