export const BID_TO_KEEPER_ROUND = Object.freeze([
  { low: 66, high: 100, round: 1 },
  { low: 46, high: 65, round: 2 },
  { low: 36, high: 45, round: 3 },
  { low: 26, high: 35, round: 4 },
  { low: 21, high: 25, round: 5 },
  { low: 16, high: 20, round: 6 },
  { low: 11, high: 15, round: 7 },
  { low: 6, high: 10, round: 8 },
  { low: 1, high: 5, round: 9 },
  { low: 0, high: 0, round: 10 },
]);

export function lateSeasonTax(week) {
  const numericWeek = Number(week);
  if (!Number.isFinite(numericWeek) || numericWeek <= 13) {
    return 0;
  }

  return Math.min(numericWeek - 13, 6);
}

export function keeperValueFromBid(bid, week) {
  const numericBid = Number(bid) || 0;
  const band = BID_TO_KEEPER_ROUND.find(({ low, high }) => low <= numericBid && numericBid <= high);
  return Math.max((band?.round ?? 10) - lateSeasonTax(week), 1);
}

export function keeperValueFromDraft(round) {
  return Math.max(Number(round) - 1, 1);
}

export function previousKeeperIds(draftPicks = [], manualKeeperIds = []) {
  const ids = new Set(manualKeeperIds.map(String));
  draftPicks.forEach((pick) => {
    if (pick?.is_keeper) {
      ids.add(String(pick.player_id));
    }
  });
  return ids;
}

function completedTransactions(transactions = []) {
  return transactions
    .filter((transaction) => transaction?.status === "complete")
    .sort((left, right) => {
      const weekDifference = Number(right.leg || 0) - Number(left.leg || 0);
      return weekDifference || Number(right.created || 0) - Number(left.created || 0);
    });
}

export function playerWasDropped(playerId, transactions = []) {
  return Boolean(latestDrop(playerId, transactions));
}

export function latestDrop(playerId, transactions = []) {
  const id = String(playerId);
  return completedTransactions(transactions).find(
    (transaction) => !["trade", "commissioner"].includes(transaction.type) && transaction.drops && Object.hasOwn(transaction.drops, id),
  );
}

export function latestAdd(playerId, transactions = []) {
  const id = String(playerId);
  return completedTransactions(transactions).find(
    (transaction) => transaction.type !== "trade" && transaction.adds && Object.hasOwn(transaction.adds, id),
  );
}

export function calculateKeeperValue({ playerId, draftPicks = [], transactions = [], previousKeepers = new Set() }) {
  const id = String(playerId);
  const draftPick = draftPicks.find((pick) => String(pick.player_id) === id);
  const dropTransaction = latestDrop(id, transactions);
  const dropped = Boolean(dropTransaction);

  if (previousKeepers.has(id) && !dropped) {
    return { value: 1, reason: "Previous draft keeper", source: "previous-keeper" };
  }

  if (dropped || !draftPick) {
    const transaction = latestAdd(id, transactions);
    if (!transaction) {
      return { value: 10, reason: "Undrafted; no acquisition found", source: "undrafted" };
    }

    const week = Number(transaction.leg);
    const bid = Number(transaction.settings?.waiver_bid) || 0;
    const pickupReason = `Picked up week ${week} for $${bid}`;
    return {
      value: keeperValueFromBid(bid, week),
      reason: dropped ? `Dropped week ${dropTransaction.leg}, ${pickupReason.toLowerCase()}` : pickupReason,
      source: dropped ? "reacquired" : "acquired",
    };
  }

  return {
    value: keeperValueFromDraft(draftPick.round),
    reason: `Drafted in round ${draftPick.round}`,
    source: "drafted",
  };
}

export function sortKeeperRows(rows = []) {
  return [...rows].sort((left, right) => Number(left.value) - Number(right.value) || left.name.localeCompare(right.name));
}

export function snakePickInRound(round, draftSlot, teamCount) {
  const numericRound = Number(round);
  const numericSlot = Number(draftSlot);
  return numericRound % 2 === 0 ? Number(teamCount) + 1 - numericSlot : numericSlot;
}

export function formatPickLabel(round, draftSlot, teamCount) {
  return `${round}.${String(snakePickInRound(round, draftSlot, teamCount)).padStart(2, "0")}`;
}

export function buildDraftBoard({ teams = [], rounds = 15, selections = {} }) {
  const teamCount = teams.length;
  const board = Array.from({ length: rounds }, (_, roundIndex) =>
    Array.from({ length: teamCount }, (_, columnIndex) => ({
      round: roundIndex + 1,
      draftSlot: columnIndex + 1,
      label: formatPickLabel(roundIndex + 1, columnIndex + 1, teamCount),
      team: teams.find((team) => Number(team.draftSlot) === columnIndex + 1) ?? null,
      keepers: [],
    })),
  );

  teams.forEach((team) => {
    const columnIndex = Number(team.draftSlot) - 1;
    (selections[team.userId] || []).forEach((player) => {
      const roundIndex = Number(player.value) - 1;
      if (board[roundIndex]?.[columnIndex]) {
        board[roundIndex][columnIndex].keepers.push(player);
      }
    });
  });

  return board;
}
