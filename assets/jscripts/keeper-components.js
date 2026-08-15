import { createElement } from "./site-data.js";
import { playerImageUrl, playerProfileUrl } from "./keeper-data.js";

export function renderKeeperNavigation(active) {
  const nav = createElement("nav", { className: "lci-tool-nav", attrs: { "aria-label": "Keeper tools" } });
  [
    ["values", "/keepers/", "Keeper values"],
    ["history", "/keepers/history/", "Keepers by season"],
    ["planner", "/keepers/draft-planner/", "Draft planner"],
  ].forEach(([key, href, label]) => {
    nav.append(createElement("a", { className: key === active ? "is-active" : "", text: label, attrs: { href, ...(key === active ? { "aria-current": "page" } : {}) } }));
  });
  return nav;
}

export function roundLabel(value) {
  const round = Number(value);
  const remainder = round % 100;
  const suffix = remainder >= 11 && remainder <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[round % 10] || "th");
  return `${round}${suffix}`;
}

export function createPlayerIdentity(player, { compact = false } = {}) {
  const link = createElement("a", {
    className: `lci-player${compact ? " lci-player--compact" : ""}`,
    attrs: { href: playerProfileUrl(player.playerId), target: "_blank", rel: "noopener", title: `Open ${player.name} on Sleeper` },
  });
  const image = createElement("img", {
    className: "lci-player__image",
    attrs: { src: playerImageUrl(player.playerId), alt: "", loading: "lazy", width: compact ? 34 : 48, height: compact ? 34 : 48 },
  });
  image.addEventListener("error", () => image.classList.add("is-missing"), { once: true });
  const fallback = createElement("span", { className: "lci-player__fallback", text: player.position || "NFL", attrs: { "aria-hidden": "true" } });
  const copy = createElement("span", { className: "lci-player__copy" });
  copy.append(createElement("strong", { text: player.name }), createElement("small", { text: [player.position, player.nflTeam].filter(Boolean).join(" · ") }));
  link.append(image, fallback, copy);
  return link;
}

export function renderKeeperTable(team, { headingLevel = "h2" } = {}) {
  const section = createElement("section", { className: "lci-keeper-team" });
  const heading = createElement(headingLevel, { text: team.teamName });
  const username = createElement("p", { className: "lci-keeper-team__manager", text: `@${team.username}` });
  const wrapper = createElement("div", { className: "lci-table-wrap" });
  const table = createElement("table", { className: "lci-keeper-table" });
  const head = createElement("thead", { html: "<tr><th>Player</th><th>Value</th><th>Why</th></tr>" });
  const body = createElement("tbody");

  team.players.forEach((player) => {
    const row = createElement("tr");
    const identity = createElement("td");
    identity.append(createPlayerIdentity(player));
    const value = createElement("td");
    value.append(createElement("span", { className: "lci-round-badge", text: roundLabel(player.value) }), document.createTextNode(" round"));
    row.append(identity, value, createElement("td", { text: player.reason }));
    body.append(row);
  });

  table.append(head, body);
  wrapper.append(table);
  section.append(heading, username, wrapper);
  return section;
}

export function renderLoading(target, message = "Loading league data…") {
  target.replaceChildren(createElement("div", { className: "lci-app-state", text: message, attrs: { role: "status" } }));
}

export function renderFailure(target, title, message) {
  const state = createElement("div", { className: "lci-app-state lci-app-state--error", attrs: { role: "alert" } });
  state.append(createElement("strong", { text: title }), createElement("p", { text: message }));
  target.replaceChildren(state);
}
