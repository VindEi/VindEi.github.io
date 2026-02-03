/**
 * Renders the Detail Panel in the Projects List
 */
function renderDetail(card, detailContainer) {
  // 1. Visual Active State
  document
    .querySelectorAll(".project-card")
    .forEach((c) => c.classList.remove("active"));
  card.classList.add("active");

  // 2. Extract Data
  const {
    title,
    desc,
    github,
    download,
    status,
    productPage,
    license,
    type,
    platform,
    icon,
  } = card.dataset;

  // 3. Status Badge Logic
  const statusHTML =
    status === "wip" ? "🚧 Work in Progress" : "✅ Stable Release";
  const statusClass = status === "wip" ? "wip" : "stable";

  // 4. Action Buttons Logic
  let mainActionBtn = "";
  if (productPage) {
    mainActionBtn = `<a href="${productPage}" class="btn-action primary">View Product Page <i class="fas fa-arrow-right"></i></a>`;
  } else {
    const isDisabled = status === "wip" || !download || download === "#";
    mainActionBtn = isDisabled
      ? `<span class="btn-action disabled">Download <i class="fas fa-lock"></i></span>`
      : `<a href="${download}" target="_blank" rel="noopener noreferrer" class="btn-action primary">Download <i class="fas fa-download"></i></a>`;
  }

  const githubBtn =
    github && github !== "#"
      ? `<a href="${github}" target="_blank" rel="noopener noreferrer" class="btn-action">GitHub <i class="fab fa-github"></i></a>`
      : ``;

  // 5. Render to DOM
  detailContainer.innerHTML = `
    <div class="fade-in">
      <div class="detail-header">
        <h3><span style="margin-right:10px;">${icon || ""}</span>${title}</h3>
        <p class="subtitle ${statusClass}">${statusHTML}</p> 
        
        <div class="tags-row">
          ${license ? `<span class="tag-pill license">${license}</span>` : ""}
          ${type ? `<span class="tag-pill type">${type}</span>` : ""}
          ${platform ? `<span class="tag-pill platform">${platform}</span>` : ""}
        </div>
      </div>
      
      <p>${desc}</p>
      
      <div class="detail-actions">
        ${mainActionBtn}
        ${githubBtn}
      </div>
    </div>
  `;
}

/**
 * LOGIC 1: Projects List Page
 */
function initProjectList() {
  const grid = document.querySelector(".projects-grid");
  const detailContainer = document.getElementById("project-detail");

  if (!grid || !detailContainer) return;

  // Click Event
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".project-card");
    if (card) renderDetail(card, detailContainer);
  });

  // Keyboard Event (Enter/Space to select)
  grid.addEventListener("keydown", (e) => {
    const card = e.target.closest(".project-card");
    if (!card) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      renderDetail(card, detailContainer);
    }
  });

  // Init first card
  const first = grid.querySelector(".project-card");
  if (first) renderDetail(first, detailContainer);
}

/**
 * LOGIC 2: SnapDNS Product Page (Mobile Swap)
 */
function initSnapDNS() {
  const visual = document.querySelector(".product-visual");
  if (!visual) return;

  const toggleSwap = () => {
    if (window.innerWidth < 900) {
      visual.classList.toggle("swapped");
    }
  };

  visual.addEventListener("click", toggleSwap);
  visual.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSwap();
    }
  });
}

/**
 * Main Initializer (Route Dispatcher)
 */
function initProjectsHandler() {
  // Check which page we are on based on existing elements
  if (document.querySelector(".projects-grid")) {
    initProjectList();
  } else if (document.querySelector(".product-visual")) {
    initSnapDNS();
  }
}

// Attach to Router Events
document.addEventListener("spa-content-loaded", initProjectsHandler);
document.addEventListener("DOMContentLoaded", initProjectsHandler);
