import { supabase } from './supabase.js';

// ============ TEAMS ============
export async function fetchTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

// ============ PLAYERS ============
export async function fetchPlayersByTeam(teamId) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', teamId)
    .order('name');
  if (error) throw error;
  return data;
}

// ============ MATCHES ============
export async function createMatch(teamAId, teamBId, battingFirstTeamId) {
  const bowlingFirstTeamId = battingFirstTeamId === teamAId ? teamBId : teamAId;

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      team_a_id: teamAId,
      team_b_id: teamBId,
      batting_first_team_id: battingFirstTeamId,
      status: 'live',
      current_innings: 1,
    })
    .select()
    .single();
  if (matchError) throw matchError;

  // Create first innings
  const { data: innings, error: inningsError } = await supabase
    .from('innings')
    .insert({
      match_id: match.id,
      batting_team_id: battingFirstTeamId,
      bowling_team_id: bowlingFirstTeamId,
      innings_number: 1,
      status: 'live',
    })
    .select()
    .single();
  if (inningsError) throw inningsError;

  return { match, innings };
}

export async function fetchMatch(matchId) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      team_a:teams!matches_team_a_id_fkey(*),
      team_b:teams!matches_team_b_id_fkey(*)
    `)
    .eq('id', matchId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateMatchStatus(matchId, status, currentInnings, winnerTeamId) {
  const update = { status };
  if (currentInnings !== undefined) update.current_innings = currentInnings;
  if (winnerTeamId !== undefined) update.winner_team_id = winnerTeamId;

  const { error } = await supabase
    .from('matches')
    .update(update)
    .eq('id', matchId);
  if (error) throw error;
}

export async function deleteMatch(matchId) {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId);
  if (error) throw error;
}

// ============ INNINGS ============
export async function fetchInnings(matchId) {
  const { data, error } = await supabase
    .from('innings')
    .select('*')
    .eq('match_id', matchId)
    .order('innings_number');
  if (error) throw error;
  return data;
}

export async function fetchCurrentInnings(matchId) {
  const { data, error } = await supabase
    .from('innings')
    .select('*')
    .eq('match_id', matchId)
    .eq('status', 'live')
    .single();
  if (error) throw error;
  return data;
}

export async function updateInningsStatus(inningsId, status, target = null) {
  const update = { status };
  if (target !== null) update.target = target;
  if (status === 'completed') update.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from('innings')
    .update(update)
    .eq('id', inningsId);
  if (error) throw error;
}

export async function createSecondInnings(matchId, battingTeamId, bowlingTeamId, target) {
  const { data, error } = await supabase
    .from('innings')
    .insert({
      match_id: matchId,
      batting_team_id: battingTeamId,
      bowling_team_id: bowlingTeamId,
      innings_number: 2,
      status: 'live',
      target: target,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createSuperOverInnings(matchId, battingTeamId, bowlingTeamId, inningsNumber, target = null) {
  const { data, error } = await supabase
    .from('innings')
    .insert({
      match_id: matchId,
      batting_team_id: battingTeamId,
      bowling_team_id: bowlingTeamId,
      innings_number: inningsNumber,
      status: 'live',
      target: target,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ DELIVERIES ============
export async function fetchDeliveries(inningsId) {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('innings_id', inningsId)
    .order('over_number')
    .order('delivery_number');
  if (error) throw error;
  return data;
}

export async function insertDelivery(delivery) {
  const { data, error } = await supabase
    .from('deliveries')
    .insert(delivery)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDelivery(deliveryId) {
  const { error } = await supabase
    .from('deliveries')
    .delete()
    .eq('id', deliveryId);
  if (error) throw error;
}

// ============ ACTIVE MATCH RECOVERY ============
export async function fetchActiveMatch() {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      team_a:teams!matches_team_a_id_fkey(*),
      team_b:teams!matches_team_b_id_fkey(*)
    `)
    .eq('status', 'live')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ============ REALTIME ============
export function subscribeToDeliveries(inningsId, callback) {
  return supabase
    .channel(`deliveries-${inningsId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'deliveries',
      filter: `innings_id=eq.${inningsId}`,
    }, callback)
    .subscribe();
}

// ============ SECURITY ============
export async function verifyScorerPin(pinAttempt) {
  const { data, error } = await supabase.rpc('verify_scorer_pin', {
    pin_attempt: pinAttempt
  });
  if (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
  return !!data;
}
