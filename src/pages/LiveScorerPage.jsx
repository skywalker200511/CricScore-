import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchMatch,
  fetchInnings,
  fetchCurrentInnings,
  fetchDeliveries,
  insertDelivery,
  deleteDelivery,
  updateInningsStatus,
  updateMatchStatus,
  createSecondInnings,
  fetchPlayersByTeam,
} from '../lib/database.js';
import {
  calculateInningsState,
  buildDelivery,
  getNextDeliveryNumber,
  getStrikeAfterDelivery,
  getMatchResult,
  isLegalDelivery,
  OVERS_PER_INNINGS,
  BALLS_PER_OVER,
  PLAYERS_PER_TEAM,
  EXTRA_TYPES,
} from '../lib/scoringEngine.js';
import SelectBatsmenModal from '../components/SelectBatsmenModal.jsx';
import SelectBowlerModal from '../components/SelectBowlerModal.jsx';
import WicketModal from '../components/WicketModal.jsx';
import InningsCompleteModal from '../components/InningsCompleteModal.jsx';
import MatchCompleteModal from '../components/MatchCompleteModal.jsx';
import UndoConfirmModal from '../components/UndoConfirmModal.jsx';

export default function LiveScorerPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();

  // Core state
  const [match, setMatch] = useState(null);
  const [currentInnings, setCurrentInnings] = useState(null);
  const [allInnings, setAllInnings] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [battingPlayers, setBattingPlayers] = useState([]);
  const [bowlingPlayers, setBowlingPlayers] = useState([]);
  const [firstInningsState, setFirstInningsState] = useState(null);

  // Live scorer state
  const [strikerId, setStrikerId] = useState(null);
  const [nonStrikerId, setNonStrikerId] = useState(null);
  const [bowlerId, setBowlerId] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [showBatsmenModal, setShowBatsmenModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showInningsComplete, setShowInningsComplete] = useState(false);
  const [showMatchComplete, setShowMatchComplete] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [pendingWicketOutcome, setPendingWicketOutcome] = useState(null);

  // Completed over number for bowler modal
  const [completedOverNumber, setCompletedOverNumber] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Calculate innings state from deliveries
  const inningsState = calculateInningsState(deliveries);

  // Load match data
  const loadMatchData = useCallback(async () => {
    try {
      const m = await fetchMatch(matchId);
      setMatch(m);

      const allInn = await fetchInnings(matchId);
      setAllInnings(allInn);

      const currentInn = allInn.find(i => i.status === 'in_progress') || allInn[allInn.length - 1];
      setCurrentInnings(currentInn);

      if (currentInn) {
        const dels = await fetchDeliveries(currentInn.id);
        setDeliveries(dels);

        // Load players
        const batPlayers = await fetchPlayersByTeam(currentInn.batting_team_id);
        const bowlPlayers = await fetchPlayersByTeam(currentInn.bowling_team_id);
        setBattingPlayers(batPlayers);
        setBowlingPlayers(bowlPlayers);

        // If second innings, reconstruct first innings state for match complete display
        if (currentInn.innings_number === 2) {
          const inn1 = allInn.find(i => i.innings_number === 1);
          if (inn1) {
            const inn1Deliveries = await fetchDeliveries(inn1.id);
            const inn1State = calculateInningsState(inn1Deliveries);
            setFirstInningsState(inn1State);
          }
        }

        // Reconstruct state from deliveries
        if (dels.length > 0) {
          const state = calculateInningsState(dels);
          const lastDelivery = dels[dels.length - 1];
          
          // Reconstruct striker/non-striker
          let recStrikerId = lastDelivery.striker_id;
          let recNonStrikerId = lastDelivery.non_striker_id;
          
          // Apply strike rotation from last delivery
          const strikeResult = getStrikeAfterDelivery(recStrikerId, recNonStrikerId, lastDelivery);
          recStrikerId = strikeResult.strikerId;
          recNonStrikerId = strikeResult.nonStrikerId;

          // Handle end-of-over strike swap
          if (state.ballsInCurrentOver === 0 && state.legalBalls > 0) {
            [recStrikerId, recNonStrikerId] = [recNonStrikerId, recStrikerId];
          }

          // Handle wicket - if dismissed player is still in the striker/non-striker,
          // that means we need a new batsman
          if (lastDelivery.is_wicket && lastDelivery.dismissed_player_id) {
            if (recStrikerId === lastDelivery.dismissed_player_id) recStrikerId = null;
            if (recNonStrikerId === lastDelivery.dismissed_player_id) recNonStrikerId = null;
          }

          setStrikerId(recStrikerId);
          setNonStrikerId(recNonStrikerId);
          setBowlerId(state.currentBowlerId);

          // Check if over just completed and needs new bowler
          if (state.ballsInCurrentOver === 0 && state.legalBalls > 0 && !state.isInningsComplete) {
            if (state.completedOvers < OVERS_PER_INNINGS) {
              setCompletedOverNumber(state.completedOvers);
              setShowBowlerModal(true);
            }
          }

          // Check if innings is complete
          if (state.isInningsComplete && currentInn.status === 'in_progress') {
            if (currentInn.innings_number === 1) {
              setShowInningsComplete(true);
            } else {
              setShowMatchComplete(true);
            }
          }
        } else {
          // No deliveries yet — show opening batsmen modal
          setShowBatsmenModal(true);
        }
      }
    } catch (err) {
      console.error('Error loading match:', err);
      setError('Failed to load match data');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadMatchData();
  }, [loadMatchData]);

  // Get player name by id
  function getPlayerName(playerId) {
    const all = [...battingPlayers, ...bowlingPlayers];
    const player = all.find(p => p.id === playerId);
    return player?.name || 'Unknown';
  }

  // Handle opening batsmen confirmation
  function handleBatsmenConfirm(striker, nonStriker) {
    setStrikerId(striker);
    setNonStrikerId(nonStriker);
    setShowBatsmenModal(false);
    // Show bowler selection if no bowler set
    if (!bowlerId) {
      setShowBowlerModal(true);
    }
  }

  // Handle bowler confirmation
  function handleBowlerConfirm(newBowlerId) {
    setBowlerId(newBowlerId);
    setShowBowlerModal(false);
    setCompletedOverNumber(null);
  }

  // Handle scoring keypad tap
  function handleOutcomeSelect(outcome) {
    if (outcome.type === 'wicket') {
      setPendingWicketOutcome(outcome);
      setShowWicketModal(true);
      return;
    }
    setSelectedOutcome(outcome);
  }

  // Handle wicket confirmation
  function handleWicketConfirm({ dismissedId, wicketType, newBatsmanId }) {
    setShowWicketModal(false);
    const outcome = {
      type: 'wicket',
      batterRuns: 0,
      extraRuns: 0,
      extraType: null,
      isWicket: true,
      dismissedPlayerId: dismissedId,
      wicketType: wicketType,
      newBatsmanId: newBatsmanId,
    };
    setSelectedOutcome(outcome);
    setPendingWicketOutcome(null);
  }

  // Submit delivery
  async function handleSubmitDelivery() {
    if (!selectedOutcome || !strikerId || !nonStrikerId || !bowlerId || submitting) return;

    setSubmitting(true);
    try {
      const overNumber = inningsState.completedOvers + 1;
      const deliveryNumber = getNextDeliveryNumber(deliveries, overNumber);
      const isLegal = selectedOutcome.extraType !== EXTRA_TYPES.WIDE && selectedOutcome.extraType !== EXTRA_TYPES.NO_BALL;
      const legalBallNumber = isLegal ? inningsState.ballsInCurrentOver + 1 : 0;

      const delivery = buildDelivery({
        inningsId: currentInnings.id,
        overNumber,
        deliveryNumber,
        legalBallNumber,
        strikerId,
        nonStrikerId,
        bowlerId,
        batterRuns: selectedOutcome.batterRuns || 0,
        extraRuns: selectedOutcome.extraRuns || 0,
        extraType: selectedOutcome.extraType || null,
        isWicket: selectedOutcome.isWicket || false,
        dismissedPlayerId: selectedOutcome.dismissedPlayerId || null,
        wicketType: selectedOutcome.wicketType || null,
      });

      const saved = await insertDelivery(delivery);
      const newDeliveries = [...deliveries, saved];
      setDeliveries(newDeliveries);

      // Calculate new state
      const newState = calculateInningsState(newDeliveries);

      // Update strike
      const strikeResult = getStrikeAfterDelivery(strikerId, nonStrikerId, saved);
      let newStriker = strikeResult.strikerId;
      let newNonStriker = strikeResult.nonStrikerId;

      // Handle wicket - new batsman replaces dismissed player
      if (selectedOutcome.isWicket && selectedOutcome.dismissedPlayerId) {
        if (selectedOutcome.dismissedPlayerId === newStriker) {
          newStriker = selectedOutcome.newBatsmanId;
        } else if (selectedOutcome.dismissedPlayerId === newNonStriker) {
          newNonStriker = selectedOutcome.newBatsmanId;
        }
      }

      // Check if innings is complete
      if (newState.isInningsComplete) {
        setStrikerId(newStriker);
        setNonStrikerId(newNonStriker);
        setSelectedOutcome(null);

        if (currentInnings.innings_number === 1) {
          await updateInningsStatus(currentInnings.id, 'completed');
          setShowInningsComplete(true);
        } else {
          await updateInningsStatus(currentInnings.id, 'completed');
          await updateMatchStatus(matchId, 'completed');
          setShowMatchComplete(true);
        }
        setSubmitting(false);
        return;
      }

      // Check second innings chase target met
      if (currentInnings.innings_number === 2 && currentInnings.target) {
        if (newState.totalRuns >= currentInnings.target) {
          setStrikerId(newStriker);
          setNonStrikerId(newNonStriker);
          setSelectedOutcome(null);
          await updateInningsStatus(currentInnings.id, 'completed');
          await updateMatchStatus(matchId, 'completed');
          setShowMatchComplete(true);
          setSubmitting(false);
          return;
        }
      }

      // Check if over is complete
      if (newState.ballsInCurrentOver === 0 && newState.legalBalls > 0) {
        // End of over - swap strike
        [newStriker, newNonStriker] = [newNonStriker, newStriker];
        setStrikerId(newStriker);
        setNonStrikerId(newNonStriker);
        
        if (newState.completedOvers < OVERS_PER_INNINGS) {
          setCompletedOverNumber(newState.completedOvers);
          setShowBowlerModal(true);
        }
      } else {
        setStrikerId(newStriker);
        setNonStrikerId(newNonStriker);
      }

      setSelectedOutcome(null);
    } catch (err) {
      console.error('Error submitting delivery:', err);
      setError('Failed to submit delivery');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle undo
  async function handleUndo() {
    setShowUndoConfirm(false);
    if (deliveries.length === 0) return;

    try {
      const lastDelivery = deliveries[deliveries.length - 1];
      await deleteDelivery(lastDelivery.id);
      
      const newDeliveries = deliveries.slice(0, -1);
      setDeliveries(newDeliveries);

      if (newDeliveries.length === 0) {
        setStrikerId(null);
        setNonStrikerId(null);
        setBowlerId(null);
        setShowBatsmenModal(true);
        return;
      }

      // Reconstruct state
      const newState = calculateInningsState(newDeliveries);
      const prevLastDelivery = newDeliveries[newDeliveries.length - 1];
      
      let recStrikerId = prevLastDelivery.striker_id;
      let recNonStrikerId = prevLastDelivery.non_striker_id;
      
      const strikeResult = getStrikeAfterDelivery(recStrikerId, recNonStrikerId, prevLastDelivery);
      recStrikerId = strikeResult.strikerId;
      recNonStrikerId = strikeResult.nonStrikerId;

      // Handle end-of-over strike swap
      if (newState.ballsInCurrentOver === 0 && newState.legalBalls > 0) {
        [recStrikerId, recNonStrikerId] = [recNonStrikerId, recStrikerId];
      }

      if (prevLastDelivery.is_wicket && prevLastDelivery.dismissed_player_id) {
        if (recStrikerId === prevLastDelivery.dismissed_player_id) recStrikerId = null;
        if (recNonStrikerId === prevLastDelivery.dismissed_player_id) recNonStrikerId = null;
      }

      setStrikerId(recStrikerId);
      setNonStrikerId(recNonStrikerId);
      setBowlerId(newState.currentBowlerId);
      setSelectedOutcome(null);
    } catch (err) {
      console.error('Error undoing delivery:', err);
      setError('Failed to undo delivery');
    }
  }

  // Handle start second innings
  async function handleStartSecondInnings() {
    setShowInningsComplete(false);
    try {
      const firstInnState = calculateInningsState(deliveries);
      setFirstInningsState(firstInnState);
      const target = firstInnState.totalRuns + 1;

      // Determine second innings teams (swap batting/bowling)
      const secondBattingTeamId = currentInnings.bowling_team_id;
      const secondBowlingTeamId = currentInnings.batting_team_id;

      const newInnings = await createSecondInnings(matchId, secondBattingTeamId, secondBowlingTeamId, target);
      await updateMatchStatus(matchId, 'live', 2);

      // Reset state for second innings
      setCurrentInnings(newInnings);
      setDeliveries([]);
      setStrikerId(null);
      setNonStrikerId(null);
      setBowlerId(null);
      setSelectedOutcome(null);

      // Load new players
      const batPlayers = await fetchPlayersByTeam(secondBattingTeamId);
      const bowlPlayers = await fetchPlayersByTeam(secondBowlingTeamId);
      setBattingPlayers(batPlayers);
      setBowlingPlayers(bowlPlayers);

      // Show batsmen selection
      setShowBatsmenModal(true);
    } catch (err) {
      console.error('Error starting second innings:', err);
      setError('Failed to start second innings');
    }
  }

  // Get current over display balls
  function getCurrentOverBalls() {
    const currentOverNum = inningsState.completedOvers + 1;
    return deliveries.filter(d => d.over_number === currentOverNum);
  }

  // Get outcome display label
  function getOutcomeLabel(outcome) {
    if (!outcome) return null;
    if (outcome.isWicket) return 'W';
    if (outcome.extraType === EXTRA_TYPES.WIDE) return `WD+${outcome.extraRuns}`;
    if (outcome.extraType === EXTRA_TYPES.NO_BALL) return `NB+${outcome.batterRuns}`;
    if (outcome.extraType === EXTRA_TYPES.BYE) return `B${outcome.extraRuns}`;
    if (outcome.extraType === EXTRA_TYPES.LEG_BYE) return `LB${outcome.extraRuns}`;
    return String(outcome.batterRuns);
  }

  // Ball display helper
  function getBallDisplay(delivery) {
    if (delivery.is_wicket) return 'W';
    if (delivery.extra_type === EXTRA_TYPES.WIDE) return 'WD';
    if (delivery.extra_type === EXTRA_TYPES.NO_BALL) return 'NB';
    const total = delivery.batter_runs + (delivery.extra_runs || 0);
    return String(total);
  }

  function getBallStyle(delivery) {
    if (delivery.is_wicket) return 'bg-[#fef2f2] border-[#ef4444] text-[#b91c1c] font-black';
    if (delivery.extra_type === EXTRA_TYPES.WIDE || delivery.extra_type === EXTRA_TYPES.NO_BALL) {
      return 'bg-[#fffbeb] border-[#fbbf24] text-[#92400e] font-bold';
    }
    if (delivery.batter_runs === 4) return 'bg-[#f0fdf4] border-[#22c55e] text-[#15803d] font-bold';
    if (delivery.batter_runs === 6) return 'bg-[#dcfce7] border-[#16a34a] text-[#14532d] font-bold';
    if (delivery.batter_runs === 0 && !delivery.extra_type) return 'bg-[#f1f5f9] border-[#cbd5e1] text-[#64748b] font-bold';
    return 'bg-white border-[#cbd5e1] text-[#0f172a] font-bold';
  }

  // Batting team name
  function getBattingTeamName() {
    if (!match || !currentInnings) return '';
    if (currentInnings.batting_team_id === match.team_a_id) return match.team_a?.name;
    return match.team_b?.name;
  }

  function getBowlingTeamName() {
    if (!match || !currentInnings) return '';
    if (currentInnings.bowling_team_id === match.team_a_id) return match.team_a?.name;
    return match.team_b?.name;
  }

  // Innings 1 state for match complete modal
  function getInnings1State() {
    const inn1 = allInnings.find(i => i.innings_number === 1);
    if (!inn1) return null;
    // For innings 1, if it's the current innings, use current deliveries
    // Otherwise we'd need to fetch separately - for simplicity, store first innings totals
    return null; // Will be computed in match complete handler
  }

  // Match complete data
  const matchCompleteData = (() => {
    if (!showMatchComplete || !match) return {};
    
    const inn1 = allInnings.find(i => i.innings_number === 1);
    const inn2 = currentInnings;
    const state2 = inningsState;
    
    // Use stored first innings state, or derive from target
    const inn1Score = firstInningsState ? firstInningsState.totalRuns : (inn2?.target ? inn2.target - 1 : 0);
    const inn1Wickets = firstInningsState ? firstInningsState.totalWickets : '—';
    const inn1Overs = firstInningsState ? firstInningsState.oversDisplay : `${OVERS_PER_INNINGS}.0`;
    
    const team1Name = inn1?.batting_team_id === match.team_a_id ? match.team_a?.name : match.team_b?.name;
    const team2Name = inn2?.batting_team_id === match.team_a_id ? match.team_a?.name : match.team_b?.name;
    
    // Calculate result
    let result = '';
    if (state2.totalRuns > inn1Score) {
      const wicketsRemaining = (PLAYERS_PER_TEAM - 1) - state2.totalWickets;
      result = `${team2Name} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
    } else if (inn1Score > state2.totalRuns) {
      result = `${team1Name} won by ${inn1Score - state2.totalRuns} run${(inn1Score - state2.totalRuns) !== 1 ? 's' : ''}`;
    } else {
      result = 'Match Tied';
    }

    return {
      team1Name,
      team1Runs: inn1Score,
      team1Wickets: inn1Wickets,
      team1Overs: inn1Overs,
      team2Name,
      team2Runs: state2.totalRuns,
      team2Wickets: state2.totalWickets,
      team2Overs: state2.oversDisplay,
      result,
    };
  })();

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#f8f9fa] flex items-center justify-center">
        <p className="text-[#64748b] font-medium">Loading match...</p>
      </div>
    );
  }

  if (error && !match) {
    return (
      <div className="min-h-dvh bg-[#f8f9fa] flex items-center justify-center">
        <p className="text-[#dc2626] font-medium">{error}</p>
      </div>
    );
  }

  const currentOverBalls = getCurrentOverBalls();
  const isLastWicket = inningsState.totalWickets >= PLAYERS_PER_TEAM - 2;

  // Scoring outcomes
  const runButtons = [
    { label: '0', type: 'runs', batterRuns: 0, style: 'bg-white border-[#cbd5e1] text-[#0f172a]' },
    { label: '1', type: 'runs', batterRuns: 1, style: 'bg-white border-[#cbd5e1] text-[#0f172a]' },
    { label: '2', type: 'runs', batterRuns: 2, style: 'bg-white border-[#cbd5e1] text-[#0f172a]' },
    { label: '3', type: 'runs', batterRuns: 3, style: 'bg-white border-[#cbd5e1] text-[#0f172a]' },
    { label: '4', type: 'runs', batterRuns: 4, style: 'bg-[#f0fdf4] border-[#86efac] text-[#15803d]' },
    { label: '6', type: 'runs', batterRuns: 6, style: 'bg-[#dcfce7] border-[#22c55e] text-[#14532d]' },
  ];

  const extraButtons = [
    { label: 'WD', type: 'extra', extraType: EXTRA_TYPES.WIDE, extraRuns: 1, batterRuns: 0, style: 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]' },
    { label: 'NB', type: 'extra', extraType: EXTRA_TYPES.NO_BALL, extraRuns: 1, batterRuns: 0, style: 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]' },
    { label: 'BYE', type: 'extra', extraType: EXTRA_TYPES.BYE, extraRuns: 1, batterRuns: 0, style: 'bg-white border-[#cbd5e1] text-[#475569]' },
    { label: 'LB', type: 'extra', extraType: EXTRA_TYPES.LEG_BYE, extraRuns: 1, batterRuns: 0, style: 'bg-white border-[#cbd5e1] text-[#475569]' },
  ];

  return (
    <div className="min-h-dvh bg-[#f8f9fa] flex flex-col">
      {/* Content wrapper - centered on desktop */}
      <div className="w-full max-w-md mx-auto flex flex-col min-h-dvh">
        
        {/* 1. Match Status Bar */}
        <div className="mx-3 mt-3 bg-white border border-[#e2e8f0] rounded-xl px-3.5 py-2 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs text-[#64748b] font-medium">
              Box Cricket • {OVERS_PER_INNINGS} Overs
            </div>
            <div className="text-xs font-bold text-[#0f172a] truncate">
              Innings {currentInnings?.innings_number}: {getBattingTeamName()} vs {getBowlingTeamName()}
            </div>
          </div>
          <div className="flex items-center gap-1 bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse"></span>
            LIVE
          </div>
        </div>

        {/* 2. Score Display */}
        <div className="mx-3 mt-2 bg-white border border-[#e2e8f0] rounded-xl p-3.5 text-center">
          <div className="flex items-baseline justify-center tracking-tight leading-none my-1">
            <span className="text-6xl text-[#0f172a] tabular-nums font-black">{inningsState.totalRuns}</span>
            <span className="text-4xl text-[#64748b] font-bold mx-1">/</span>
            <span className="text-4xl text-[#dc2626] tabular-nums font-bold">{inningsState.totalWickets}</span>
          </div>
          <div className="text-[#475569] font-bold text-sm tracking-wide mt-1">
            {inningsState.oversDisplay} / {OVERS_PER_INNINGS} OVERS
          </div>
          {/* Chase target (second innings) */}
          {currentInnings?.innings_number === 2 && currentInnings?.target && (
            <div className="mt-2 pt-2 border-t border-[#f1f5f9] text-xs text-[#64748b] font-semibold">
              TARGET {currentInnings.target}
              <span className="mx-1">•</span>
              <span className="text-[#0f172a] font-bold">
                NEED {Math.max(0, currentInnings.target - inningsState.totalRuns)}
              </span>
            </div>
          )}
        </div>

        {/* 3. Batsmen */}
        <div className="mx-3 mt-2 bg-white border border-[#e2e8f0] rounded-xl p-2.5 space-y-1.5">
          {/* Striker */}
          <div className="bg-[#f0fdf4] border border-[#86efac] border-l-4 border-l-[#16a34a] rounded-lg p-2.5 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] font-black tracking-wider text-[#15803d] uppercase">▶ STRIKER</span>
              <div className="text-base font-bold text-[#0f172a] truncate mt-0.5">
                {strikerId ? getPlayerName(strikerId) : '—'}
              </div>
            </div>
          </div>
          {/* Non-Striker */}
          <div className="bg-white border border-[#e2e8f0] rounded-lg p-2.5 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold tracking-wider text-[#64748b] uppercase">NON-STRIKER</span>
              <div className="text-base font-bold text-[#1e293b] truncate mt-0.5">
                {nonStrikerId ? getPlayerName(nonStrikerId) : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Bowler */}
        <div className="mx-3 mt-2 bg-white border border-[#e2e8f0] rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-[#64748b] uppercase">BOWLER • OVER {inningsState.completedOvers + 1}</span>
            <div className="text-base font-bold text-[#0f172a] mt-0.5">
              {bowlerId ? getPlayerName(bowlerId) : '—'}
            </div>
          </div>
        </div>

        {/* 5. Current Over */}
        <div className="mx-3 mt-2 bg-white border border-[#e2e8f0] rounded-xl p-3">
          <div className="text-[10px] font-bold tracking-wider text-[#64748b] uppercase mb-2">CURRENT OVER</div>
          <div className="flex items-center gap-2 flex-wrap">
            {currentOverBalls.length === 0 && (
              <span className="text-sm text-[#94a3b8]">—</span>
            )}
            {currentOverBalls.map((d, i) => (
              <div
                key={d.id || i}
                className={`w-9 h-9 rounded-full border text-sm flex items-center justify-center tabular-nums ${getBallStyle(d)}`}
              >
                {getBallDisplay(d)}
              </div>
            ))}
          </div>
        </div>

        {/* 6. Scoring Keypad - Push to bottom */}
        <div className="mx-3 mt-2 mb-3 bg-white border border-[#e2e8f0] rounded-xl p-3 flex flex-col gap-2.5 flex-1 justify-end">
          {/* Selected outcome indicator */}
          {selectedOutcome && (
            <div className="bg-[#eff6ff] border border-[#93c5fd] rounded-lg px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-[#64748b] font-medium">Selected:</span>
              <span className="font-bold text-[#0f172a]">{getOutcomeLabel(selectedOutcome)}</span>
            </div>
          )}

          {/* Run Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {runButtons.map(btn => (
              <button
                key={btn.label}
                onClick={() => handleOutcomeSelect({
                  type: btn.type,
                  batterRuns: btn.batterRuns,
                  extraRuns: 0,
                  extraType: null,
                })}
                className={`h-14 border rounded-lg text-lg font-bold flex items-center justify-center transition-transform active:scale-95 ${btn.style} ${
                  selectedOutcome?.batterRuns === btn.batterRuns && selectedOutcome?.type === 'runs' && !selectedOutcome?.extraType
                    ? 'ring-2 ring-[#0f172a] ring-offset-1'
                    : ''
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Extras */}
          <div className="grid grid-cols-4 gap-1.5">
            {extraButtons.map(btn => (
              <button
                key={btn.label}
                onClick={() => handleOutcomeSelect({
                  type: btn.type,
                  batterRuns: btn.batterRuns,
                  extraRuns: btn.extraRuns,
                  extraType: btn.extraType,
                })}
                className={`h-11 border rounded-lg text-xs font-bold flex items-center justify-center transition-transform active:scale-95 ${btn.style} ${
                  selectedOutcome?.extraType === btn.extraType
                    ? 'ring-2 ring-[#0f172a] ring-offset-1'
                    : ''
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Wicket */}
          <button
            onClick={() => handleOutcomeSelect({ type: 'wicket' })}
            className={`w-full py-3 bg-[#fef2f2] border-2 border-[#ef4444] text-[#dc2626] rounded-lg text-sm font-black flex items-center justify-center gap-1.5 tracking-wide transition-colors active:scale-[0.99] ${
              selectedOutcome?.isWicket ? 'ring-2 ring-[#dc2626] ring-offset-1' : ''
            }`}
          >
            WICKET
          </button>

          {/* Submit Delivery */}
          <button
            onClick={handleSubmitDelivery}
            disabled={!selectedOutcome || submitting}
            className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] ${
              selectedOutcome && !submitting
                ? 'bg-[#16a34a] text-white hover:bg-[#15803d]'
                : 'bg-[#0f172a] text-white opacity-60 cursor-not-allowed'
            }`}
          >
            {submitting ? 'SUBMITTING...' : 'SUBMIT DELIVERY'}
          </button>

          {/* Secondary Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => deliveries.length > 0 && setShowUndoConfirm(true)}
              disabled={deliveries.length === 0}
              className="flex-1 py-2.5 bg-white border border-[#cbd5e1] text-[#475569] text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
            >
              ↩ Undo
            </button>
            <button
              onClick={() => {
                if (currentInnings?.innings_number === 1) {
                  setShowInningsComplete(true);
                }
              }}
              className="flex-1 py-2.5 bg-white border border-[#cbd5e1] text-[#475569] text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
            >
              End Innings
            </button>
          </div>
        </div>

      </div>

      {/* MODALS */}
      <SelectBatsmenModal
        open={showBatsmenModal}
        players={battingPlayers}
        onConfirm={handleBatsmenConfirm}
      />

      <SelectBowlerModal
        open={showBowlerModal}
        players={bowlingPlayers}
        completedBowlerIds={inningsState.completedBowlerIds}
        overNumber={completedOverNumber}
        onConfirm={handleBowlerConfirm}
      />

      <WicketModal
        open={showWicketModal}
        strikerId={strikerId}
        nonStrikerId={nonStrikerId}
        battingPlayers={battingPlayers}
        dismissedPlayerIds={inningsState.dismissedPlayerIds}
        isLastWicket={isLastWicket}
        onConfirm={handleWicketConfirm}
        onCancel={() => {
          setShowWicketModal(false);
          setPendingWicketOutcome(null);
        }}
      />

      <InningsCompleteModal
        open={showInningsComplete}
        teamName={getBattingTeamName()}
        runs={inningsState.totalRuns}
        wickets={inningsState.totalWickets}
        overs={inningsState.oversDisplay}
        onStartSecondInnings={handleStartSecondInnings}
      />

      <MatchCompleteModal
        open={showMatchComplete}
        matchId={matchId}
        {...matchCompleteData}
      />

      <UndoConfirmModal
        open={showUndoConfirm}
        onConfirm={handleUndo}
        onCancel={() => setShowUndoConfirm(false)}
      />
    </div>
  );
}
