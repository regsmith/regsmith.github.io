import { createElement } from "./site-data.js";
import { createPlayerIdentity, renderFailure, renderKeeperNavigation, renderLoading } from "./keeper-components.js";
import { loadKeeperConfig, loadLeagueWorkspace } from "./keeper-data.js";
import { buildDraftBoard } from "./keeper-rules.js";

async function init() {
  const root = document.getElementById("draft-planner-app");
  if (!root) return;
  renderLoading(root, "Preparing the draft room…");

  try {
    const config = await loadKeeperConfig();
    const workspace = await loadLeagueWorkspace(config);
    if (workspace.status !== "ready") {
      renderFailure(root, "League not ready", "Draft planning will be available when Sleeper publishes the league rosters.");
      return;
    }

    const teams = workspace.teams.map((team, index) => ({ ...team, draftSlot: index + 1 }));
    const selections = Object.fromEntries(teams.map((team) => [team.userId, []]));
    const setup = createElement("div", { className: "lci-planner-setup" });
    const boardTarget = createElement("div", { className: "lci-draft-board-wrap" });
    const warning = createElement("div", { className: "lci-planner-warning", attrs: { role: "status" } });

    const updateDraftSlot = (team, requestedSlot) => {
      const otherTeam = teams.find((candidate) => candidate.userId !== team.userId && candidate.draftSlot === requestedSlot);
      if (otherTeam) otherTeam.draftSlot = team.draftSlot;
      team.draftSlot = requestedSlot;
      renderSetup();
      renderBoard();
    };

    const updateSelection = (team, selectIndex, playerId) => {
      const next = [...selections[team.userId]];
      next[selectIndex] = playerId ? team.players.find((player) => player.playerId === playerId) : null;
      selections[team.userId] = next.filter(Boolean);
      renderSetup();
      renderBoard();
    };

    const renderSetup = () => {
      setup.replaceChildren();
      [...teams].sort((left, right) => left.draftSlot - right.draftSlot).forEach((team) => {
        const row = createElement("section", { className: "lci-planner-team" });
        const heading = createElement("div", { className: "lci-planner-team__name" });
        heading.append(createElement("strong", { text: team.teamName }), createElement("small", { text: `@${team.username}` }));

        const slotLabel = createElement("label", { text: "Draft slot" });
        const slotSelect = createElement("select", { attrs: { "aria-label": `${team.teamName} draft slot` } });
        teams.forEach((_candidate, index) => slotSelect.append(createElement("option", { text: String(index + 1), attrs: { value: index + 1 } })));
        slotSelect.value = team.draftSlot;
        slotSelect.addEventListener("change", () => updateDraftSlot(team, Number(slotSelect.value)));
        slotLabel.append(slotSelect);

        const keeperControls = createElement("div", { className: "lci-planner-team__keepers" });
        [0, 1].forEach((selectIndex) => {
          const label = createElement("label", { text: `Keeper ${selectIndex + 1}` });
          const select = createElement("select", { attrs: { "aria-label": `${team.teamName} keeper ${selectIndex + 1}` } });
          select.append(createElement("option", { text: "No keeper", attrs: { value: "" } }));
          team.players.forEach((player) => {
            const alreadySelectedElsewhere = selections[team.userId].some((selected, index) => index !== selectIndex && selected.playerId === player.playerId);
            select.append(createElement("option", {
              text: `${player.name} · round ${player.value}`,
              attrs: { value: player.playerId, ...(alreadySelectedElsewhere ? { disabled: "" } : {}) },
            }));
          });
          select.value = selections[team.userId][selectIndex]?.playerId || "";
          select.addEventListener("change", () => updateSelection(team, selectIndex, select.value));
          label.append(select);
          keeperControls.append(label);
        });
        row.append(heading, slotLabel, keeperControls);
        setup.append(row);
      });
    };

    const renderBoard = () => {
      const board = buildDraftBoard({ teams, rounds: config.draftRounds, selections });
      const conflicts = board.flat().filter((cell) => cell.keepers.length > 1);
      warning.textContent = conflicts.length ? "Two keepers are assigned to the same team and round. A traded pick or commissioner adjustment will be needed." : "";
      warning.hidden = !conflicts.length;

      const table = createElement("table", { className: "lci-draft-board" });
      const headRow = createElement("tr");
      headRow.append(createElement("th", { text: "Round" }));
      [...teams].sort((left, right) => left.draftSlot - right.draftSlot).forEach((team) => {
        const th = createElement("th");
        th.append(createElement("span", { text: String(team.draftSlot) }), createElement("small", { text: team.teamName }));
        headRow.append(th);
      });
      const head = createElement("thead");
      head.append(headRow);
      const body = createElement("tbody");
      board.forEach((round, roundIndex) => {
        const row = createElement("tr");
        row.append(createElement("th", { text: String(roundIndex + 1), attrs: { scope: "row" } }));
        round.forEach((cell) => {
          const td = createElement("td", { className: cell.keepers.length > 1 ? "has-conflict" : cell.keepers.length ? "has-keeper" : "" });
          td.append(createElement("small", { className: "lci-draft-board__pick", text: cell.label }));
          cell.keepers.forEach((keeper) => td.append(createPlayerIdentity(keeper, { compact: true })));
          row.append(td);
        });
        body.append(row);
      });
      table.append(head, body);
      boardTarget.replaceChildren(table);
    };

    const intro = createElement("p", { className: "lci-data-note", text: "Choose up to two eligible keepers per team, then assign each team a unique draft slot." });
    root.replaceChildren(renderKeeperNavigation("planner"), intro, setup, warning, boardTarget);
    renderSetup();
    renderBoard();
  } catch (error) {
    renderFailure(root, "Draft planner could not be loaded", `Sleeper or the local keeper data did not respond. ${error.message}`);
  }
}

init();
