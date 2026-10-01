// Scoring Engine - Centralized cricket logic
// All calculations derive from delivery history (authoritative source)

export const OVERS_PER_INNINGS = 4;
export const BALLS_PER_OVER = 6;
export const PLAYERS_PER_TEAM = 8;
export const MAX_OVERS_PER_BOWLER = 1;

export const EXTRA_TYPES = {
  WIDE: 'wide',
  NO_BALL: 'no_ball',
  BYE: 'bye',
  LEG_BYE: 'leg_bye',
};

export const DISMISSAL_TYPES = [
  'bowled',
  'caught',
  'run_out',
  'stumped',
  'hit_wicket',
  'retired',
  'hit_out',
];

// Determine if a delivery is a legal ball
export function isLegalDelivery(delivery) {
  // Use the is_legal field if present (from DB), otherwise derive
  if (delivery.is_legal !== undefined) return delivery.is_legal;
  return delivery.extra_type !== EXTRA_TYPES.WIDE && delivery.extra_type !== EXTRA_TYPES.NO_BALL;
}

// Calculate total runs from a delivery
export function getDeliveryTotalRuns(delivery) {
  return (delivery.batter_runs || 0) + (delivery.extra_runs || 0);
}

// Build complete innings state from delivery history
export function calculateInningsState(deliveries, oversLimit = OVERS_PER_INNINGS) {
  let totalRuns = 0;
  let totalWickets = 0;
  let legalBalls = 0;
  const batterStats = {}; // keyed by player_id
  const bowlerStats = {}; // keyed by player_id
  const dismissedPlayerIds = [];
  let currentStrikerId = null;
  let currentNonStrikerId = null;
  let currentBowlerId = null;

  // Sort deliveries by over_number then delivery_number
  const sorted = [...deliveries].sort((a, b) => {
    if (a.over_number !== b.over_number) return a.over_number - b.over_number;
    return a.delivery_number - b.delivery_number;
  });

  for (const d of sorted) {
    const deliveryRuns = getDeliveryTotalRuns(d);
    totalRuns += deliveryRuns;
    const legal = isLegalDelivery(d);

    // Track batter stats
    if (!batterStats[d.striker_id]) {
      batterStats[d.striker_id] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
    }

    // Batter gets credited only for batter_runs (not extras like byes/leg byes)
    if (d.extra_type !== EXTRA_TYPES.BYE && d.extra_type !== EXTRA_TYPES.LEG_BYE) {
      batterStats[d.striker_id].runs += (d.batter_runs || 0);
    }

    // Ball faced on legal deliveries and no-balls
    if (legal || d.extra_type === EXTRA_TYPES.NO_BALL) {
      batterStats[d.striker_id].balls += 1;
    }

    if (d.batter_runs === 4) batterStats[d.striker_id].fours += 1;
    if (d.batter_runs === 6) batterStats[d.striker_id].sixes += 1;

    // Track bowler stats
    if (!bowlerStats[d.bowler_id]) {
      bowlerStats[d.bowler_id] = { runs: 0, wickets: 0, legalBalls: 0, overs: new Set() };
    }
    bowlerStats[d.bowler_id].runs += deliveryRuns;
    bowlerStats[d.bowler_id].overs.add(d.over_number);

    if (legal) {
      bowlerStats[d.bowler_id].legalBalls += 1;
      legalBalls += 1;
    }

    // Track wickets
    if (d.is_wicket) {
      totalWickets += 1;
      bowlerStats[d.bowler_id].wickets += 1;
      if (d.dismissed_player_id) {
        dismissedPlayerIds.push(d.dismissed_player_id);
      }
    }

    // Track current players
    currentStrikerId = d.striker_id;
    currentNonStrikerId = d.non_striker_id;
    currentBowlerId = d.bowler_id;

    // Handle strike rotation
    const runsForStrike = d.batter_runs || 0;
    const extraRunsForStrike = (d.extra_type === EXTRA_TYPES.BYE || d.extra_type === EXTRA_TYPES.LEG_BYE) ? (d.extra_runs || 0) : 0;
    const totalRunsForStrike = runsForStrike + extraRunsForStrike;

    if (totalRunsForStrike % 2 === 1) {
      [currentStrikerId, currentNonStrikerId] = [currentNonStrikerId, currentStrikerId];
    }

    // If wicket fell, mark dismissed player's position as vacant
    if (d.is_wicket && d.dismissed_player_id) {
      if (d.dismissed_player_id === currentStrikerId) {
        currentStrikerId = null;
      } else if (d.dismissed_player_id === currentNonStrikerId) {
        currentNonStrikerId = null;
      }
    }
  }

  const completedOvers = Math.floor(legalBalls / BALLS_PER_OVER);
  const ballsInCurrentOver = legalBalls % BALLS_PER_OVER;
  const currentOverNumber = completedOvers + 1;
  const oversDisplay = `${completedOvers}.${ballsInCurrentOver}`;

  // Current over deliveries
  const currentOverDeliveries = sorted.filter(d => d.over_number === currentOverNumber);

  // Determine completed bowler IDs
  const completedBowlerIds = [];
  for (const [bId, stats] of Object.entries(bowlerStats)) {
    if (stats.legalBalls >= BALLS_PER_OVER) {
      completedBowlerIds.push(bId);
    }
  }

  // Check if innings is complete
  const isInningsComplete = completedOvers >= oversLimit || totalWickets >= (PLAYERS_PER_TEAM - 1);

  return {
    totalRuns,
    totalWickets,
    legalBalls,
    completedOvers,
    ballsInCurrentOver,
    oversDisplay,
    batterStats,
    bowlerStats,
    currentStrikerId,
    currentNonStrikerId,
    currentBowlerId,
    currentOverNumber,
    currentOverDeliveries,
    completedBowlerIds,
    dismissedPlayerIds,
    isInningsComplete,
    isOverComplete: ballsInCurrentOver === 0 && legalBalls > 0,
  };
}

// Build a delivery object ready for insertion
// Matches the actual DB schema: no match_id, uses delivery_number, is_legal, legal_ball_number
export function buildDelivery({
  inningsId,
  overNumber,
  deliveryNumber,
  legalBallNumber,
  strikerId,
  nonStrikerId,
  bowlerId,
  batterRuns = 0,
  extraRuns = 0,
  extraType = null,
  isWicket = false,
  dismissedPlayerId = null,
  wicketType = null,
}) {
  const isLegal = extraType !== EXTRA_TYPES.WIDE && extraType !== EXTRA_TYPES.NO_BALL;

  return {
    innings_id: inningsId,
    over_number: overNumber,
    delivery_number: deliveryNumber,
    legal_ball_number: isLegal ? legalBallNumber : 0,
    striker_id: strikerId,
    non_striker_id: nonStrikerId,
    bowler_id: bowlerId,
    batter_runs: batterRuns,
    extra_runs: extraRuns,
    extra_type: extraType,
    total_runs: batterRuns + extraRuns,
    is_legal: isLegal,
    is_wicket: isWicket,
    dismissed_player_id: dismissedPlayerId,
    wicket_type: wicketType,
  };
}

// Determine next delivery number for the over
export function getNextDeliveryNumber(deliveries, overNumber) {
  const overDeliveries = deliveries.filter(d => d.over_number === overNumber);
  return overDeliveries.length + 1;
}

// Calculate striker/non-striker after applying a new delivery
export function getStrikeAfterDelivery(strikerId, nonStrikerId, delivery) {
  let newStriker = strikerId;
  let newNonStriker = nonStrikerId;

  const runsForStrike = delivery.batter_runs || 0;
  const extraRunsForStrike = (delivery.extra_type === EXTRA_TYPES.BYE || delivery.extra_type === EXTRA_TYPES.LEG_BYE)
    ? (delivery.extra_runs || 0) : 0;
  const totalRunsForStrike = runsForStrike + extraRunsForStrike;

  if (totalRunsForStrike % 2 === 1) {
    [newStriker, newNonStriker] = [newNonStriker, newStriker];
  }

  return { strikerId: newStriker, nonStrikerId: newNonStriker };
}

// Determine match result
export function getMatchResult(innings1, innings2, team1Name, team2Name) {
  if (!innings1 || !innings2) return null;

  const score1 = innings1.totalRuns;
  const score2 = innings2.totalRuns;
  const wickets2 = innings2.totalWickets;

  if (score2 > score1) {
    const wicketsRemaining = (PLAYERS_PER_TEAM - 1) - wickets2;
    return `${team2Name} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
  } else if (score1 > score2) {
    return `${team1Name} won by ${score1 - score2} run${(score1 - score2) !== 1 ? 's' : ''}`;
  } else {
    return 'Match Tied';
  }
}
