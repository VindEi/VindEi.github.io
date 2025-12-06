document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("page-content");
  const header = document.getElementById("header-placeholder");
  const footer = document.getElementById("footer-placeholder");

  // --- CONFIG ---
  const routes = {
    "/": "/pages/home.html",
    "/projects": "/pages/projects.html",
  };

  const titles = {
    "/": "VindE | Home",
    "/projects": "VindE | Projects",
  };

  // --- NAVIGATION ---
  function updateActiveNav(path) {
    document.querySelectorAll(".header-nav a").forEach((link) => {
      link.classList.remove("active");
      const href = link.getAttribute("href");
      if (href === path || href === path.replace(/\/$/, "")) {
        link.classList.add("active");
      }
    });
  }

  // --- 404 ANIMATION LOGIC (INTERNAL) ---
  function run404Animation() {
    const lines = [
      { el: document.querySelector(".error-top-box"), attr: "data-text" },
      { el: document.querySelector(".error-message"), attr: "data-text" },
      { el: document.querySelector(".error-details"), attr: "data-text" },
      { el: document.querySelector(".prompt-text"), attr: "data-text" },
    ];

    // If DOM isn't ready yet, retry in next frame
    if (!lines[0].el) {
      requestAnimationFrame(run404Animation);
      return;
    }

    // 1. Setup Cursor
    const cursor = document.createElement("span");
    cursor.textContent = "_";
    cursor.style.cssText =
      "display:inline-block; font-weight:bold; animation: blink 0.5s step-end infinite alternate;";

    // Inject CSS for blink if missing
    if (!document.getElementById("cursor-anim-style")) {
      const style = document.createElement("style");
      style.id = "cursor-anim-style";
      style.innerHTML = `@keyframes blink { 50% { opacity: 0; } }`;
      document.head.appendChild(style);
    }

    // 2. Async Typing Function
    const typeLine = async (line) => {
      if (!line.el) return;

      // Reset content
      line.el.textContent = "";
      const text = line.el.getAttribute(line.attr) || "";

      line.el.appendChild(cursor);

      for (let i = 0; i < text.length; i++) {
        // Stop if user navigated away
        if (!document.body.contains(line.el)) return;

        line.el.insertBefore(document.createTextNode(text[i]), cursor);
        await new Promise((r) => setTimeout(r, 20)); // Speed
      }
    };

    // 3. Orchestrate the Sequence
    (async () => {
      for (const line of lines) {
        await typeLine(line);
        // Move cursor to next line (remove from current unless last)
        if (line !== lines[lines.length - 1]) {
          if (line.el.contains(cursor)) line.el.removeChild(cursor);
        }
      }
    })();

    // 4. Exit Handler
    let canExit = false;
    setTimeout(() => {
      canExit = true;
    }, 500);

    const goHome = () => {
      if (!canExit) return;
      window.removeEventListener("keydown", goHome);
      window.removeEventListener("click", goHome);

      const event = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
      });
      // Simulate click or push state manually
      history.pushState(null, null, "/");
      loadPage("/");
    };

    window.addEventListener("keydown", goHome);
    window.addEventListener("click", goHome);
  }

  // --- MAIN LOADER ---
  async function loadPage(path) {
    let cleanPath =
      path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
    if (cleanPath === "" || cleanPath === "/index.html") cleanPath = "/";

    document.title = titles[cleanPath] || "VindE | 404";
    updateActiveNav(cleanPath);

    let route = routes[cleanPath] || "/404.html";
    const is404 = route === "/404.html";

    // Toggle Header/Footer visibility
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

      // Execute Logic
      if (is404) {
        // Wait 50ms for the HTML to be painted, then run animation
        setTimeout(run404Animation, 50);
      } else {
        document.dispatchEvent(new Event("spa-content-loaded"));
      }
    } catch (err) {
      console.error(err);
      main.innerHTML = "<h1>404 // DATA_CORRUPTED</h1>";
    }
  }

  // --- EVENTS ---
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
