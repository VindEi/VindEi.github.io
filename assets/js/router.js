document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("page-content");
  const headerPlaceholder = document.getElementById("header-placeholder");
  const footerPlaceholder = document.getElementById("footer-placeholder");

  // State to track if header HTML is injected
  let isNavReady = false;

  // --- CONFIGURATION ---
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

  // --- NAVIGATION HIGHLIGHT LOGIC ---
  function updateActiveNav(path) {
    if (!isNavReady) return; // Wait for header to exist

    // 1. Clean up old active states
    document.querySelectorAll(".header-nav a, .echo-btn").forEach((el) => {
      el.classList.remove("active");
    });

    // 2. Highlight Header Links
    document.querySelectorAll(".header-nav a").forEach((link) => {
      const href = link.getAttribute("href");

      // Exact match OR Subpage match (excluding root "/")
      const isSubPage = href !== "/" && path.startsWith(href);

      if (href === path || isSubPage) {
        link.classList.add("active");
      }
    });

    // 3. Highlight Footer Echo Button
    const echoBtn = document.querySelector(".echo-btn");
    if (echoBtn && path === "/echo") {
      echoBtn.classList.add("active");
    }
  }

  // --- EVENT: Listen for Component Loader (from script.js) ---
  window.addEventListener("componentsLoaded", () => {
    isNavReady = true;
    updateActiveNav(location.pathname); // Sync nav immediately on load
  });

  // --- MAIN PAGE LOADER ---
  async function loadPage(path) {
    // 1. Normalize Path
    let cleanPath =
      path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
    if (cleanPath === "" || cleanPath === "/index.html") cleanPath = "/";

    // 2. Update Metadata
    document.title = titles[cleanPath] || "VindE | 404";

    // 3. Update Nav (if header is ready, otherwise event listener handles it)
    updateActiveNav(cleanPath);

    // 4. Determine Route
    const route = routes[cleanPath] || "/404.html";
    const is404 = route === "/404.html";

    // 5. Hide/Show Header & Footer based on 404 state
    if (headerPlaceholder)
      headerPlaceholder.style.display = is404 ? "none" : "block";
    if (footerPlaceholder)
      footerPlaceholder.style.display = is404 ? "none" : "block";

    // 6. Fetch Content
    try {
      const res = await fetch(route);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      const rawHtml = await res.text();
      let content = rawHtml;

      // PARSING: Extract .bsod-container or body content if fetching a full HTML file
      if (rawHtml.includes("<html") || rawHtml.includes("bsod-container")) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");
        const container = doc.querySelector(".bsod-container");
        content = container ? container.outerHTML : doc.body.innerHTML;
      }

      // 7. Inject & Animate
      main.classList.remove("loaded"); // Fade out

      // Small delay for CSS transition
      setTimeout(() => {
        main.innerHTML = content;
        void main.offsetWidth; // Force Reflow
        main.classList.add("loaded"); // Fade in

        // Dispatch Event for page-specific scripts (Projects/Echo)
        document.dispatchEvent(new Event("spa-content-loaded"));
      }, 200);
    } catch (err) {
      console.error("Router Error:", err);
      // Fallback 404 injection
      main.innerHTML = `<div style="text-align:center; padding: 50px;"><h1>404 // DATA_CORRUPTED</h1><p>The requested route could not be resolved.</p><a href="/" class="btn">RETURN_HOME</a></div>`;
      main.classList.add("loaded");
    }
  }

  // --- INTERACTION HANDLERS ---
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    // Intercept local links only
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

  // Handle Back/Forward Browser Buttons
  window.addEventListener("popstate", () => loadPage(location.pathname));

  // Initial Load
  loadPage(location.pathname);
});
