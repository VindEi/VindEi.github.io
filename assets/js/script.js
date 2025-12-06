document.addEventListener("DOMContentLoaded", () => {
  // Fetch and inject HTML components
  const loadHTML = (selector, path) => {
    fetch(path)
      .then((res) => res.text())
      .then((html) => {
        document.querySelector(selector).innerHTML = html;
        checkLoadStatus();
        // Highlight nav if header just loaded
        if (selector === "#header-placeholder") {
          highlightCurrentPage();
        }
      })
      .catch((err) => console.error("Failed to load", path, err));
  };
  loadHTML("#header-placeholder", "/assets/components/header.html");
  loadHTML("#footer-placeholder", "/assets/components/footer.html");
  // Reveal Page Content
  function checkLoadStatus() {
    const header = document.querySelector("#header-placeholder").innerHTML;
    const footer = document.querySelector("#footer-placeholder").innerHTML;
    if (header && footer) {
      document.body.classList.add("loaded");
      const main = document.getElementById("page-content");
      if (main) main.classList.add("loaded");
    }
  }
  // Set Active Link State
  function highlightCurrentPage() {
    let path = window.location.pathname;
    if (path === "" || path === "/index.html") path = "/";
    const links = document.querySelectorAll(".header-nav a");
    links.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === path) {
        link.classList.add("active");
      }
    });
  }
  // Theme Toggle Handler
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#theme-toggle");
    if (btn) {
      document.body.classList.toggle("light-theme");
      const icon = btn.querySelector("i");
      if (document.body.classList.contains("light-theme")) {
        icon.className = "fas fa-sun";
      } else {
        icon.className = "fas fa-moon";
      }
    }
  });
});
