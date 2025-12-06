function initProjects() {
  const grid = document.querySelector(".projects-grid");
  const detailContainer = document.getElementById("project-detail");
  if (!grid || !detailContainer) return;
  const renderDetail = (card) => {
    // Reset visual state
    document
      .querySelectorAll(".project-card")
      .forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    // Extract project data
    const title = card.dataset.title;
    const desc = card.dataset.desc;
    const github = card.dataset.github;
    let download = card.dataset.download;
    const status = card.dataset.status;

    // Tags
    const license = card.dataset.license;
    const type = card.dataset.type;
    const platform = card.dataset.platform;

    // Generate status badge
    let statusHTML = "";
    let statusClass = "";
    if (status === "wip") {
      statusHTML = "🚧 Work in Progress";
      statusClass = "wip";
    } else {
      statusHTML = "✅ Stable Release";
      statusClass = "stable";
    }

    // Generate Download Button (Lock if WIP)
    let downloadBtn = "";
    if (status === "wip" || !download || download === "#") {
      downloadBtn = `<span class="btn-action disabled">Download <i class="fas fa-lock"></i></span>`;
    } else {
      downloadBtn = `<a href="${download}" target="_blank" class="btn-action primary">Download <i class="fas fa-download"></i></a>`;
    }

    // Generate GitHub Button
    const githubBtn =
      github && github !== "#"
        ? `<a href="${github}" target="_blank" class="btn-action">GitHub <i class="fab fa-github"></i></a>`
        : ``;

    // Populate Detail View
    detailContainer.innerHTML = `
  <div class="fade-in">
    <div class="detail-header">
      <h3>${title}</h3>
      <p class="subtitle ${statusClass}">${statusHTML}</p> 
      
      <div class="tags-row">
        ${license ? `<span class="tag-pill license">${license}</span>` : ""}
        ${type ? `<span class="tag-pill type">${type}</span>` : ""}
        ${platform ? `<span class="tag-pill platform">${platform}</span>` : ""}
      </div>
    </div>
    
    <p>${desc}</p>
    
    <div class="detail-actions">
      ${githubBtn}
      ${downloadBtn}
    </div>
  </div>
`;
  };
  // Event Delegation for Card Clicks
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".project-card");
    if (card) renderDetail(card);
  });
  // Select first project on load
  const first = grid.querySelector(".project-card");
  if (first) renderDetail(first);
}
// Initialize on SPA load and initial page load
document.addEventListener("spa-content-loaded", initProjects);
document.addEventListener("DOMContentLoaded", initProjects);
