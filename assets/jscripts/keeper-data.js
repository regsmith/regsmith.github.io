import { fetchJson } from "./site-data.js";
import { calculateKeeperValue, previousKeeperIds, sortKeeperRows } from "./keeper-rules.js";

const SLEEPER_API = "https://api.sleeper.app/v1";

async function fetchJsonForSession(url) {
  const cacheKey = `lci:${url}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (_error) {
    // Storage can be disabled without preventing the tool from loading.
  }

  const data = await fetchJson(url);
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (_error) {
    // Sleeper data remains usable when storage is unavailable or full.
  }
  return data;
}

export async function loadKeeperConfig() {
  return fetchJson("/assets/data/keeper-config.json");
}

export async function loadPlayerCatalog() {
  return fetchJson("/assets/data/keeper-players.json");
}

export async function loadLeagueWorkspace(config) {
  const transactionRequests = Array.from({ length: config.transactionWeeks }, (_, index) =>
    fetchJsonForSession(`${SLEEPER_API}/league/${config.leagueId}/transactions/${index + 1}`),
  );

  const [users, rosters, draftPicks, transactionWeeks, playerCatalog] = await Promise.all([
    fetchJsonForSession(`${SLEEPER_API}/league/${config.leagueId}/users`),
    fetchJsonForSession(`${SLEEPER_API}/league/${config.leagueId}/rosters`),
    fetchJsonForSession(`${SLEEPER_API}/draft/${config.draftId}/picks`),
    Promise.all(transactionRequests),
    loadPlayerCatalog(),
  ]);

  if (!users.length || !rosters.length) {
    return { status: "league-not-ready", users, rosters, draftPicks, transactions: [], playerCatalog, teams: [] };
  }

  const transactions = transactionWeeks.flat();
  const userById = new Map(users.map((user) => [String(user.user_id), user]));
  const previousKeepers = previousKeeperIds(draftPicks, config.manualKeeperPlayerIds);
  const pickByPlayerId = new Map(draftPicks.map((pick) => [String(pick.player_id), pick]));

  const teams = rosters
    .filter((roster) => roster.owner_id)
    .map((roster) => {
      const user = userById.get(String(roster.owner_id)) || {};
      const username = user.display_name || `User ${roster.owner_id}`;
      const teamName = user.metadata?.team_name || username;
      const players = (roster.players || []).map((playerId) => {
        const id = String(playerId);
        const catalogPlayer = playerCatalog[id] || {};
        const draftMetadata = pickByPlayerId.get(id)?.metadata || {};
        const name = catalogPlayer.full_name || [catalogPlayer.first_name, catalogPlayer.last_name].filter(Boolean).join(" ") ||
          [draftMetadata.first_name, draftMetadata.last_name].filter(Boolean).join(" ") || `Sleeper player ${id}`;
        const calculation = calculateKeeperValue({ playerId: id, draftPicks, transactions, previousKeepers });
        return {
          playerId: id,
          name,
          position: catalogPlayer.position || draftMetadata.position || "—",
          nflTeam: catalogPlayer.team || draftMetadata.team || "",
          ...calculation,
        };
      });

      return {
        userId: String(roster.owner_id),
        rosterId: Number(roster.roster_id),
        username,
        teamName,
        players: sortKeeperRows(players),
      };
    })
    .sort((left, right) => left.teamName.localeCompare(right.teamName));

  return { status: "ready", users, rosters, draftPicks, transactions, playerCatalog, teams };
}

export function playerImageUrl(playerId) {
  return `https://sleepercdn.com/content/nfl/players/${encodeURIComponent(playerId)}.jpg`;
}

export function playerProfileUrl(playerId) {
  return `https://sleeper.com/sports/nfl/players/${encodeURIComponent(playerId)}`;
}
