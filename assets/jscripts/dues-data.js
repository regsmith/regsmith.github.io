export function normalizeDuesRows(rows = []) {
  return rows
    .map((row) => ({
      id: row.id,
      firstName: row.first_name || "",
      sleeperUsername: row.sleeper_username || "",
      leagueKey: row.league_key || "",
      seasonYear: Number(row.season_year),
      paid: Boolean(row.paid),
      updatedAt: row.updated_at || null,
    }))
    .sort((left, right) => {
      if (left.seasonYear !== right.seasonYear) {
        return right.seasonYear - left.seasonYear;
      }

      if (left.leagueKey !== right.leagueKey) {
        return left.leagueKey.localeCompare(right.leagueKey);
      }

      return left.firstName.localeCompare(right.firstName);
    });
}

export function getAvailableSeasons(rows = []) {
  return [...new Set(rows.map((row) => row.seasonYear).filter(Number.isFinite))].sort((left, right) => right - left);
}

export function getLeagueOptions(rows = []) {
  return [...new Set(rows.map((row) => row.leagueKey).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

export function getManagerOptions(rows = []) {
  return [...new Set(rows.map((row) => row.firstName).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

export function filterDuesRows(rows = [], filters = {}) {
  const { season, league = "ALL", manager = "ALL" } = filters;

  return rows.filter((row) => {
    if (Number.isFinite(Number(season)) && row.seasonYear !== Number(season)) {
      return false;
    }

    if (league !== "ALL" && row.leagueKey !== league) {
      return false;
    }

    if (manager !== "ALL" && row.firstName !== manager) {
      return false;
    }

    return true;
  });
}

export function summarizeDuesRows(rows = []) {
  const paidCount = rows.filter((row) => row.paid).length;

  return {
    memberCount: rows.length,
    paidCount,
    unpaidCount: rows.length - paidCount,
    leagueCount: getLeagueOptions(rows).length,
  };
}

export function summarizeByLeague(rows = []) {
  return getLeagueOptions(rows).map((leagueKey) => {
    const leagueRows = rows.filter((row) => row.leagueKey === leagueKey);
    const summary = summarizeDuesRows(leagueRows);

    return {
      leagueKey,
      ...summary,
    };
  });
}
