document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("page-content");
  const routes = {
    "/": "/pages/home.html",
    "/projects": "/pages/projects.html",
  };
  // Page Title Configuration
  const titles = {
    "/": "VindE | Home",
    "/projects": "VindE | Projects",
  };
  // Update Navigation State
  function updateActiveNav(path) {
    document.querySelectorAll(".header-nav a").forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === path) {
        link.classList.add("active");
      }
    });
  }
  // Main Load Function
  async function loadPage(path) {
    // Normalize root path
    if (path === "" || path === "/index.html") path = "/";
    // Set Document Title
    document.title = titles[path] || "VindE | 404";

    // Update Header Navigation
    updateActiveNav(path);

    // Fetch and Render Content
    let route = routes[path] || "/404.html";
    try {
      const res = await fetch(route);
      if (!res.ok) throw new Error("404");
      const html = await res.text();

      main.innerHTML = html;
      main.classList.remove("loaded");
      void main.offsetWidth; // Trigger reflow for animation
      main.classList.add("loaded");

      // Notify other scripts
      document.dispatchEvent(new Event("spa-content-loaded"));
    } catch (err) {
      console.error(err);
      main.innerHTML =
        "<h1>404 // DATA_CORRUPTED</h1><p>Return to <a href='/'>Home</a></p>";
    }
  }
  // Intercept Navigation Links
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (link && link.getAttribute("href")?.startsWith("/")) {
      e.preventDefault();
      const url = link.getAttribute("href");
      history.pushState(null, null, url);
      loadPage(url);
    }
  });
  // Handle Browser Back/Forward
  window.addEventListener("popstate", () => loadPage(location.pathname));
  // Initial Load
  loadPage(location.pathname);
});
