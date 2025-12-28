function initProjects() {
  const grid = document.querySelector(".projects-grid");
  const detailContainer = document.getElementById("project-detail");

  if (!grid || !detailContainer) return;

  const renderDetail = (card) => {
    // 1. Visual Active State
    document
      .querySelectorAll(".project-card")
      .forEach((c) => c.classList.remove("active"));
    card.classList.add("active");

    // 2. Get Data
    const title = card.dataset.title;
    const desc = card.dataset.desc;
    const github = card.dataset.github;
    const download = card.dataset.download;
    const status = card.dataset.status;
    const productPage = card.dataset.productPage;

    // NEW: Get the Icon HTML from the card
    const iconHtml = card.dataset.icon || "";

    // Tags
    const license = card.dataset.license;
    const type = card.dataset.type;
    const platform = card.dataset.platform;

    // 3. Status Badge Logic
    let statusHTML = "";
    let statusClass = "";
    if (status === "wip") {
      statusHTML = "🚧 Work in Progress";
      statusClass = "wip";
    } else {
      statusHTML = "✅ Stable Release";
      statusClass = "stable";
    }

    // 4. Action Button Logic
    let mainActionBtn = "";
    if (productPage) {
      mainActionBtn = `<a href="${productPage}" class="btn-action primary">View Product Page <i class="fas fa-arrow-right"></i></a>`;
    } else {
      if (status === "wip" || !download || download === "#") {
        mainActionBtn = `<span class="btn-action disabled">Download <i class="fas fa-lock"></i></span>`;
      } else {
        mainActionBtn = `<a href="${download}" target="_blank" class="btn-action primary">Download <i class="fas fa-download"></i></a>`;
      }
    }

    const githubBtn =
      github && github !== "#"
        ? `<a href="${github}" target="_blank" class="btn-action">GitHub <i class="fab fa-github"></i></a>`
        : ``;

    // 5. Render HTML
    // We insert ${iconHtml} inside the h3
    detailContainer.innerHTML = `
      <div class="fade-in">
        <div class="detail-header">
          <h3><span style="margin-right:10px;">${iconHtml}</span>${title}</h3>
          <p class="subtitle ${statusClass}">${statusHTML}</p> 
          
          <div class="tags-row">
            ${license ? `<span class="tag-pill license">${license}</span>` : ""}
            ${type ? `<span class="tag-pill type">${type}</span>` : ""}
            ${
              platform
                ? `<span class="tag-pill platform">${platform}</span>`
                : ""
            }
          </div>
        </div>
        
        <p>${desc}</p>
        
        <div class="detail-actions">
          ${mainActionBtn}
          ${githubBtn}
        </div>
      </div>
    `;
  };

  // Event Delegation
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".project-card");
    if (card) renderDetail(card);
  });

  // Select first project
  const first = grid.querySelector(".project-card");
  if (first) renderDetail(first);
}

document.addEventListener("spa-content-loaded", initProjects);
document.addEventListener("DOMContentLoaded", initProjects);
