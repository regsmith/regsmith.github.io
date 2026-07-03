import test from "node:test";
import assert from "node:assert/strict";
import { filterDuesRows, getAvailableSeasons, getLeagueOptions, normalizeDuesRows, summarizeByLeague, summarizeDuesRows } from "../assets/jscripts/dues-data.js";

const rows = normalizeDuesRows([
  {
    id: "2",
    first_name: "Connor",
    sleeper_username: "Killericon",
    league_key: "LCD",
    season_year: 2027,
    paid: false,
    updated_at: "2026-07-03T18:17:13.703Z",
  },
  {
    id: "1",
    first_name: "Reg",
    sleeper_username: "Skyefall",
    league_key: "LCI",
    season_year: 2028,
    paid: true,
    updated_at: "2026-07-03T18:17:13.703Z",
  },
  {
    id: "3",
    first_name: "Neil",
    sleeper_username: "Neison56",
    league_key: "LCI",
    season_year: 2028,
    paid: false,
    updated_at: "2026-07-03T18:17:13.703Z",
  },
]);

test("getAvailableSeasons sorts seasons newest first", () => {
  assert.deepEqual(getAvailableSeasons(rows), [2028, 2027]);
});

test("filterDuesRows filters by season and league", () => {
  assert.equal(filterDuesRows(rows, { season: 2028, league: "LCI" }).length, 2);
  assert.equal(filterDuesRows(rows, { season: 2027, league: "LCD" }).length, 1);
  assert.equal(filterDuesRows(rows, { season: 2028, league: "LCD" }).length, 0);
});

test("summaries count paid and unpaid rows", () => {
  assert.deepEqual(getLeagueOptions(rows), ["LCD", "LCI"]);
  assert.deepEqual(summarizeDuesRows(filterDuesRows(rows, { season: 2028, league: "ALL" })), {
    memberCount: 2,
    paidCount: 1,
    unpaidCount: 1,
    leagueCount: 1,
  });

  assert.deepEqual(summarizeByLeague(filterDuesRows(rows, { season: 2028, league: "ALL" })), [
    {
      leagueKey: "LCI",
      memberCount: 2,
      paidCount: 1,
      unpaidCount: 1,
      leagueCount: 1,
    },
  ]);
});
