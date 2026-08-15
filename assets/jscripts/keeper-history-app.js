import { createElement, fetchJson } from "./site-data.js";
import { createPlayerIdentity, renderFailure, renderKeeperNavigation, renderLoading } from "./keeper-components.js";
import { formatPickLabel } from "./keeper-rules.js";

async function init() {
  const root = document.getElementById("keeper-history-app");
  if (!root) return;
  renderLoading(root, "Loading keeper history…");

  try {
    const history = await fetchJson("/assets/data/keeper-history.json");
    const seasons = [...(history.seasons || [])].sort((left, right) => right.season - left.season);
    if (!seasons.length) {
      renderFailure(root, "No keeper history yet", "Confirmed keeper selections will appear here after a season is published.");
      return;
    }

    let selectedSeason = seasons[0].season;
    const controls = createElement("section", { className: "lci-panel lci-history-controls" });
    const seasonLabel = createElement("label", { text: "Season" });
    const seasonSelect = createElement("select", { attrs: { "aria-label": "Select keeper season" } });
    seasons.forEach((season) => seasonSelect.append(createElement("option", { text: String(season.season), attrs: { value: season.season } })));
    seasonLabel.append(seasonSelect);
    controls.append(seasonLabel);

    const summary = createElement("p", { className: "lci-data-note" });
    const grid = createElement("div", { className: "lci-history-grid" });
    const render = () => {
      const season = seasons.find((entry) => entry.season === selectedSeason);
      const keeperCount = season.teams.reduce((total, team) => total + team.keepers.length, 0);
      summary.textContent = `${keeperCount} confirmed keepers · ${season.teams.length} teams`;
      grid.replaceChildren();

      season.teams.forEach((team) => {
        const card = createElement("article", { className: "lci-history-card" });
        const header = createElement("header");
        header.append(createElement("h2", { text: team.teamName }), createElement("p", { text: `@${team.username}` }));
        const list = createElement("div", { className: "lci-history-card__keepers" });
        if (!team.keepers.length) list.append(createElement("p", { text: "No keepers selected" }));
        team.keepers.forEach((keeper) => {
          const row = createElement("div", { className: "lci-history-keeper" });
          row.append(
            createPlayerIdentity(keeper, { compact: true }),
            createElement("span", { className: "lci-pick-badge", text: formatPickLabel(keeper.round, keeper.draftSlot, season.teams.length) }),
          );
          list.append(row);
        });
        card.append(header, list);
        grid.append(card);
      });
    };

    seasonSelect.addEventListener("change", () => { selectedSeason = Number(seasonSelect.value); render(); });
    root.replaceChildren(renderKeeperNavigation("history"), controls, summary, grid);
    render();
  } catch (error) {
    renderFailure(root, "Keeper history could not be loaded", error.message);
  }
}

init();
