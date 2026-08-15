import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDraftBoard,
  calculateKeeperValue,
  formatPickLabel,
  keeperValueFromBid,
  lateSeasonTax,
  previousKeeperIds,
  sortKeeperRows,
} from "../assets/jscripts/keeper-rules.js";

test("late-season tax starts after week 13 and includes week 18", () => {
  assert.deepEqual([13, 14, 15, 16, 17, 18].map(lateSeasonTax), [0, 1, 2, 3, 4, 5]);
  assert.equal(keeperValueFromBid(5, 18), 4);
});

test("manual and Sleeper keeper flags are combined", () => {
  assert.deepEqual([...previousKeeperIds([{ player_id: "1", is_keeper: true }, { player_id: "2" }], ["3"])].sort(), ["1", "3"]);
});

test("a previous keeper retains first-round value until dropped", () => {
  const common = { playerId: "9509", draftPicks: [{ player_id: "9509", round: 1 }], previousKeepers: new Set(["9509"]) };
  assert.equal(calculateKeeperValue({ ...common, transactions: [] }).value, 1);

  const droppedAndAdded = [
    { status: "complete", type: "waiver", leg: 5, created: 2, drops: { "9509": 1 } },
    { status: "complete", type: "waiver", leg: 8, created: 3, adds: { "9509": 3 }, settings: { waiver_bid: 5 } },
  ];
  assert.deepEqual(calculateKeeperValue({ ...common, transactions: droppedAndAdded }), {
    value: 9,
    reason: "Dropped week 5, picked up week 8 for $5",
    source: "reacquired",
  });
});

test("keeper rows sort from earliest to latest round", () => {
  assert.deepEqual(sortKeeperRows([{ name: "Late", value: 9 }, { name: "Early", value: 1 }]).map((row) => row.name), ["Early", "Late"]);
});

test("draft board uses snake labels and places a keeper in its team's slot", () => {
  const teams = Array.from({ length: 10 }, (_, index) => ({
    userId: index === 7 ? "sky" : `team-${index + 1}`,
    teamName: index === 7 ? "Star Command" : `Team ${index + 1}`,
    draftSlot: index + 1,
  }));
  const board = buildDraftBoard({ teams, rounds: 2, selections: { sky: [{ playerId: "9509", name: "Bijan Robinson", value: 1 }] } });
  assert.equal(formatPickLabel(1, 8, 10), "1.08");
  assert.equal(formatPickLabel(2, 8, 10), "2.03");
  assert.equal(board[0][7].keepers[0].name, "Bijan Robinson");
});
