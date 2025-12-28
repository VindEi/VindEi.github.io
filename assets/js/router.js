document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("page-content");
  const header = document.getElementById("header-placeholder");
  const footer = document.getElementById("footer-placeholder");

  // --- CONFIGURATION ---
  const routes = {
    "/": "/pages/home.html",
    "/projects": "/pages/projects.html",
    "/projects/snapdns": "/pages/projects/snapdns.html",
  };

  const titles = {
    "/": "VindE | Home",
    "/projects": "VindE | Projects",
    "/projects/snapdns": "VindE | SnapDNS",
  };

  // --- NAVIGATION STATE ---
  function updateActiveNav(path) {
    document.querySelectorAll(".header-nav a").forEach((link) => {
      link.classList.remove("active");
      const href = link.getAttribute("href");
      // Match path exactly or without trailing slash
      if (href === path || href === path.replace(/\/$/, "")) {
        link.classList.add("active");
      }
    });
  }

  // --- MAIN PAGE LOADER ---
  async function loadPage(path) {
    // Normalize path
    let cleanPath =
      path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
    if (cleanPath === "" || cleanPath === "/index.html") cleanPath = "/";

    // Update Metadata
    document.title = titles[cleanPath] || "VindE | 404";
    updateActiveNav(cleanPath);

    // Determine Route
    let route = routes[cleanPath] || "/404.html";
    const is404 = route === "/404.html";

    // Toggle UI Elements (Hide Header/Footer on 404)
    if (header) header.style.display = is404 ? "none" : "block";
    if (footer) footer.style.display = is404 ? "none" : "block";

    try {
      const res = await fetch(route);
      if (!res.ok) throw new Error("404");
      const rawHtml = await res.text();

      // Content Parsing
      // If fetching a full HTML file (like 404.html), extract only the relevant container
      let content = rawHtml;
      if (rawHtml.includes("<html") || rawHtml.includes("bsod-container")) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");
        const container = doc.querySelector(".bsod-container");

        if (container) {
          content = container.outerHTML;
        } else {
          content = doc.body.innerHTML;
        }
      }

      // Inject Content & Trigger Animation
      main.innerHTML = content;
      main.classList.remove("loaded");
      void main.offsetWidth; // Force reflow
      main.classList.add("loaded");

      // Notify scripts that content has changed
      document.dispatchEvent(new Event("spa-content-loaded"));
    } catch (err) {
      console.error(err);
      main.innerHTML = "<h1>404 // DATA_CORRUPTED</h1>";
    }
  }

  // --- EVENT LISTENERS ---

  // Intercept Internal Links
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (link && link.getAttribute("href")?.startsWith("/")) {
      e.preventDefault();
      const url = link.getAttribute("href");
      history.pushState(null, null, url);
      loadPage(url);
    }
  });

  // Handle Browser Navigation (Back/Forward)
  window.addEventListener("popstate", () => loadPage(location.pathname));

  // Initial Load
  loadPage(location.pathname);
});
