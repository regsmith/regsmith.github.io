import { createElement } from "./site-data.js";
import { loadKeeperConfig, loadLeagueWorkspace } from "./keeper-data.js";
import { renderFailure, renderKeeperNavigation, renderKeeperTable, renderLoading } from "./keeper-components.js";

async function init() {
  const root = document.getElementById("keeper-app");
  if (!root) return;
  renderLoading(root);

  try {
    const config = await loadKeeperConfig();
    const workspace = await loadLeagueWorkspace(config);
    if (workspace.status !== "ready") {
      renderFailure(root, "League not ready", "Sleeper has not published rosters for this league yet. Try again after rosters are available.");
      return;
    }

    let primaryUserId = workspace.teams[0]?.userId;
    let comparisonUserId = "";
    let compare = false;

    const controls = createElement("section", { className: "lci-panel lci-keeper-controls" });
    const primaryLabel = createElement("label", { text: "Team" });
    const primarySelect = createElement("select", { attrs: { "aria-label": "Select a team" } });
    const compareToggleLabel = createElement("label", { className: "lci-check" });
    const compareToggle = createElement("input", { attrs: { type: "checkbox" } });
    compareToggleLabel.append(compareToggle, document.createTextNode(" Compare with another team"));
    const comparisonLabel = createElement("label", { text: "Compare against" });
    const comparisonSelect = createElement("select", { attrs: { "aria-label": "Select a comparison team", disabled: "" } });

    workspace.teams.forEach((team) => {
      const label = `${team.teamName} · @${team.username}`;
      primarySelect.append(createElement("option", { text: label, attrs: { value: team.userId } }));
      comparisonSelect.append(createElement("option", { text: label, attrs: { value: team.userId } }));
    });
    comparisonUserId = workspace.teams[1]?.userId || workspace.teams[0]?.userId;
    comparisonSelect.value = comparisonUserId;

    primaryLabel.append(primarySelect);
    comparisonLabel.append(comparisonSelect);
    controls.append(primaryLabel, compareToggleLabel, comparisonLabel);

    const results = createElement("div", { className: "lci-keeper-results" });
    const render = () => {
      comparisonLabel.hidden = !compare;
      comparisonSelect.disabled = !compare;
      const selectedTeams = [workspace.teams.find((team) => team.userId === primaryUserId)];
      if (compare) selectedTeams.push(workspace.teams.find((team) => team.userId === comparisonUserId));
      results.classList.toggle("is-comparing", compare);
      results.replaceChildren(...selectedTeams.filter(Boolean).map((team) => renderKeeperTable(team)));
    };

    primarySelect.addEventListener("change", () => { primaryUserId = primarySelect.value; render(); });
    comparisonSelect.addEventListener("change", () => { comparisonUserId = comparisonSelect.value; render(); });
    compareToggle.addEventListener("change", () => { compare = compareToggle.checked; render(); });

    const note = createElement("p", {
      className: "lci-data-note",
      text: `Live ${config.analysisSeason} Sleeper rosters and transactions · values for the ${config.targetSeason} draft`,
    });
    root.replaceChildren(renderKeeperNavigation("values"), controls, note, results);
    render();
  } catch (error) {
    renderFailure(root, "Keeper values could not be loaded", `Sleeper or the local keeper data did not respond. ${error.message}`);
  }
}

init();
