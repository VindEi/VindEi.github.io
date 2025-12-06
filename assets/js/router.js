document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("page-content");
  const header = document.getElementById("header-placeholder");
  const footer = document.getElementById("footer-placeholder");

  const routes = {
    "/": "/pages/home.html",
    "/projects": "/pages/projects.html",
  };

  const titles = {
    "/": "VindE | Home",
    "/projects": "VindE | Projects",
  };

  function updateActiveNav(path) {
    document.querySelectorAll(".header-nav a").forEach((link) => {
      link.classList.remove("active");
      const href = link.getAttribute("href");
      if (href === path || href === path.replace(/\/$/, "")) {
        link.classList.add("active");
      }
    });
  }

  async function loadPage(path) {
    let cleanPath =
      path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
    if (cleanPath === "" || cleanPath === "/index.html") cleanPath = "/";

    document.title = titles[cleanPath] || "VindE | 404";
    updateActiveNav(cleanPath);

    let route = routes[cleanPath] || "/404.html";
    const is404 = route === "/404.html";

    // --- TOGGLE UI ---
    // If 404, hide header/footer. Else show them.
    if (header) header.style.display = is404 ? "none" : "block";
    if (footer) footer.style.display = is404 ? "none" : "block";

    try {
      const res = await fetch(route);
      if (!res.ok) throw new Error("404");
      const html = await res.text();

      main.innerHTML = html;
      main.classList.remove("loaded");
      void main.offsetWidth;
      main.classList.add("loaded");

      // --- 404 SCRIPT HANDLER ---
      if (is404) {
        // We must manually execute the script because innerHTML won't run it
        // We remove the old script if it exists to allow re-running
        const oldScript = document.getElementById("error-script");
        if (oldScript) oldScript.remove();

        const script = document.createElement("script");
        script.src = "/assets/js/error.js";
        script.id = "error-script";
        document.body.appendChild(script);
      } else {
        document.dispatchEvent(new Event("spa-content-loaded"));
      }
    } catch (err) {
      console.error(err);
      main.innerHTML = "<h1>404 // DATA_CORRUPTED</h1>";
    }
  }

  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (link && link.getAttribute("href")?.startsWith("/")) {
      e.preventDefault();
      const url = link.getAttribute("href");
      history.pushState(null, null, url);
      loadPage(url);
    }
  });

  window.addEventListener("popstate", () => loadPage(location.pathname));
  loadPage(location.pathname);
});
