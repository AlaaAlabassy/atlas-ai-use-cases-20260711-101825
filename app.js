const state = {
  data: null,
  activeProfession: "الكل",
  query: "",
};

const professionColors = {
  "محاماة": "#0f766e",
  "محاسبة": "#2563eb",
  "هندسة": "#b36b00",
  "صناعة محتوى": "#be445f",
  "إنتاجية مهنية عامة": "#25734f",
};

const els = {
  sourceCount: document.querySelector("#sourceCount"),
  caseCount: document.querySelector("#caseCount"),
  professionCount: document.querySelector("#professionCount"),
  searchInput: document.querySelector("#searchInput"),
  filterList: document.querySelector("#filterList"),
  bars: document.querySelector("#bars"),
  cards: document.querySelector("#cards"),
  emptyState: document.querySelector("#emptyState"),
  activeMeta: document.querySelector("#activeMeta"),
  resetButton: document.querySelector("#resetButton"),
  template: document.querySelector("#caseTemplate"),
};

init();

async function init() {
  const response = await fetch("./data/cleaned_data.json");
  state.data = await response.json();

  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderCases();
  });

  els.resetButton.addEventListener("click", () => {
    state.activeProfession = "الكل";
    state.query = "";
    els.searchInput.value = "";
    renderFilters();
    renderCases();
  });

  renderSummary();
  renderFilters();
  renderBars();
  renderCases();
}

function allCases() {
  return state.data.professions.flatMap((group) =>
    group.cases.map((item) => ({
      ...item,
      profession: group.profession,
    })),
  );
}

function renderSummary() {
  const cases = allCases();
  els.sourceCount.textContent = state.data.input_summary.raw_files_read;
  els.caseCount.textContent = cases.length;
  els.professionCount.textContent = state.data.professions.length;
}

function renderFilters() {
  const counts = countByProfession();
  const filters = [["الكل", allCases().length], ...Object.entries(counts)];
  els.filterList.replaceChildren(
    ...filters.map(([name, count]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `filter-button${state.activeProfession === name ? " is-active" : ""}`;
      button.innerHTML = `<span>${name}</span><span>${count}</span>`;
      button.addEventListener("click", () => {
        state.activeProfession = name;
        renderFilters();
        renderCases();
      });
      return button;
    }),
  );
}

function renderBars() {
  const counts = countByProfession();
  const max = Math.max(...Object.values(counts));
  els.bars.replaceChildren(
    ...Object.entries(counts).map(([profession, count]) => {
      const row = document.createElement("div");
      row.className = "bar-row";
      const width = Math.max(10, Math.round((count / max) * 100));
      row.innerHTML = `
        <span>${profession}</span>
        <span class="bar-track">
          <span class="bar-fill" style="width: ${width}%; background: ${professionColors[profession] || "#0f766e"}"></span>
        </span>
        <strong>${count}</strong>
      `;
      return row;
    }),
  );
}

function renderCases() {
  const filtered = allCases().filter((item) => {
    const matchesProfession =
      state.activeProfession === "الكل" || item.profession === state.activeProfession;
    const text = [
      item.title,
      item.summary,
      item.profession,
      item.practical_workflows.join(" "),
      item.limitations_or_cautions.join(" "),
      item.evidence.map((entry) => `${entry.title} ${entry.evidence_excerpt}`).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return matchesProfession && (!state.query || text.includes(state.query));
  });

  els.activeMeta.textContent = `${filtered.length} من ${allCases().length} حالة`;
  els.emptyState.hidden = filtered.length !== 0;
  els.cards.replaceChildren(...filtered.map(renderCaseCard));
}

function renderCaseCard(item) {
  const fragment = els.template.content.cloneNode(true);
  const card = fragment.querySelector(".case-card");
  const pill = fragment.querySelector(".profession-pill");
  const sourceCount = fragment.querySelector(".source-count");

  pill.textContent = item.profession;
  pill.style.background = colorMix(professionColors[item.profession] || "#0f766e");
  pill.style.color = professionColors[item.profession] || "#0f766e";
  sourceCount.textContent = `${item.merged_from_sources.length} مصادر`;
  fragment.querySelector("h3").textContent = item.title;
  fragment.querySelector(".summary").textContent = item.summary;
  fillList(fragment.querySelector(".workflow-list"), item.practical_workflows);
  fillList(fragment.querySelector(".caution-list"), item.limitations_or_cautions);

  const evidenceList = fragment.querySelector(".evidence-list");
  evidenceList.replaceChildren(
    ...item.evidence.slice(0, 4).map((entry) => {
      const evidence = document.createElement("div");
      evidence.className = "evidence-item";
      evidence.innerHTML = `
        <a href="${entry.url}" target="_blank" rel="noreferrer">${escapeHtml(entry.title)}</a>
        <p>${escapeHtml(entry.evidence_excerpt)}</p>
      `;
      return evidence;
    }),
  );

  card.dataset.profession = item.profession;
  return fragment;
}

function fillList(list, items) {
  list.replaceChildren(
    ...items.map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    }),
  );
}

function countByProfession() {
  return Object.fromEntries(state.data.professions.map((group) => [group.profession, group.cases.length]));
}

function colorMix(hex) {
  return `${hex}18`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
