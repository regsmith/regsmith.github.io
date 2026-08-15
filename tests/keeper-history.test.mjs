import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const history = JSON.parse(readFileSync(new URL("../assets/data/keeper-history.json", import.meta.url)));
const config = JSON.parse(readFileSync(new URL("../assets/data/keeper-config.json", import.meta.url)));

test("2025 keeper history contains ten teams with no more than two keepers", () => {
  const season = history.seasons.find((entry) => entry.season === 2025);
  assert.equal(season.teams.length, 10);
  assert.ok(season.teams.every((team) => team.keepers.length <= 2));
  assert.equal(new Set(season.teams.flatMap((team) => team.keepers.map((keeper) => keeper.playerId))).size, 20);
});

test("commissioner-sourced history matches the manual override list", () => {
  const season = history.seasons.find((entry) => entry.season === 2025);
  const manualIds = season.teams
    .flatMap((team) => team.keepers)
    .filter((keeper) => keeper.source === "commissioner")
    .map((keeper) => keeper.playerId)
    .sort();
  assert.deepEqual(manualIds, [...config.manualKeeperPlayerIds].sort());
});
