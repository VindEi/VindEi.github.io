/**
 * Single Page Application Router
 */
document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("page-content");
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

  function updateActiveNav(path) {
    if (!isNavReady) return;
    document
      .querySelectorAll(".header-nav a, .echo-btn")
      .forEach((el) => el.classList.remove("active"));
    document.querySelectorAll(".header-nav a").forEach((link) => {
      const href = link.getAttribute("href");
      if (href === path || (href !== "/" && path.startsWith(href)))
        link.classList.add("active");
    });
    if (path === "/echo" && document.querySelector(".echo-btn")) {
      document.querySelector(".echo-btn").classList.add("active");
    }
  }

  async function loadPage(path) {
    // Path Normalization
    let cleanPath =
      path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
    if (cleanPath === "" || cleanPath === "/index.html") cleanPath = "/";

    document.title = titles[cleanPath] || "VindE | 404";
    updateActiveNav(cleanPath);

    const routeFile = routes[cleanPath] || "/404.html";

    try {
      const res = await fetch(routeFile);
      if (!res.ok) throw new Error("HTTP_ERR");
      const rawHtml = await res.text();

      let content = rawHtml;
      // Extract content from standalone 404 pages
      if (rawHtml.includes("bsod-container")) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");
        content = doc.querySelector(".bsod-container")?.outerHTML || rawHtml;
      }

      // Transition
      main.classList.remove("loaded");
      setTimeout(() => {
        main.innerHTML = content;
        void main.offsetWidth; // Reflow
        main.classList.add("loaded");
        document.dispatchEvent(new Event("spa-content-loaded"));
      }, 150);
    } catch (err) {
      console.error("[Router] Failed to load path:", cleanPath);
      main.innerHTML = "<h1>DATA_LOAD_ERROR</h1>";
      main.classList.add("loaded");
    }
  }

  window.addEventListener("componentsLoaded", () => {
    isNavReady = true;
    updateActiveNav(location.pathname);
  });

  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("a");
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
  loadPage(location.pathname);
});
