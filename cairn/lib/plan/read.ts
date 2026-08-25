import { sql } from 'drizzle-orm';
import { textList, uuidList, type Tx } from '@/lib/db/client';

export type MsStatus =
  'on_track' | 'at_risk' | 'slipped' | 'blocked' | 'done' | 'parked' | 'dropped';
export type Agreement = 'proposed' | 'agreed' | 'active';

export interface MilestoneView {
  id: string;
  ref: string;
  trackId: string;
  domainCode: string;
  title: string;
  note: string | null;
  targetDate: string;
  originalTargetDate: string;
  status: MsStatus | null;
  statusReason: string | null;
  agreement: Agreement | null;
  proposedByMemberId: string | null;
  agreedByMemberId: string | null;
  isPrivate: boolean;
  moveCount: number;
  moveHistory: string[];
}

export interface TrackView {
  id: string;
  kind: 'individual' | 'joint';
  ownerMemberId: string | null;
  claimStatus: 'unclaimed' | 'claimed';
  northStar: string | null;
  ownerName: string | null;
}

export interface MemberRow {
  id: string;
  displayName: string;
  role: 'principal' | 'dependent' | 'advisor';
  seatNo: number;
  principalSlot: number | null;
  trackId: string | null;
  claimStatus: 'unclaimed' | 'claimed';
  privateReadOptIn: boolean;
}

export async function members(tx: Tx): Promise<MemberRow[]> {
  const rows = (await tx.execute(sql`
    select m.id, m.display_name, m.role, m.seat_no, m.principal_slot,
           m.private_read_opt_in,
           t.id as track_id, t.claim_status
      from member m
      left join track t on t.owner_member_id = m.id and t.kind = 'individual'
     where m.deleted_at is null
     order by m.seat_no`)) as unknown as Array<{
      id: string; display_name: string; role: MemberRow['role']; seat_no: number;
      principal_slot: number | null; private_read_opt_in: boolean;
      track_id: string | null; claim_status: 'unclaimed' | 'claimed' | null;
    }>;

  return rows.map((r) => ({
    id: r.id,
    displayName: r.display_name,
    role: r.role,
    seatNo: r.seat_no,
    principalSlot: r.principal_slot,
    trackId: r.track_id,
    claimStatus: r.claim_status ?? 'unclaimed',
    privateReadOptIn: r.private_read_opt_in,
  }));
}

export async function tracks(tx: Tx): Promise<TrackView[]> {
  const rows = (await tx.execute(sql`
    select t.id, t.kind, t.owner_member_id, t.claim_status, t.north_star,
           m.display_name as owner_name
      from track t
      left join member m on m.id = t.owner_member_id
     order by t.kind desc, m.seat_no nulls first`)) as unknown as Array<{
      id: string; kind: 'individual' | 'joint'; owner_member_id: string | null;
      claim_status: 'unclaimed' | 'claimed'; north_star: string | null;
      owner_name: string | null;
    }>;

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    ownerMemberId: r.owner_member_id,
    claimStatus: r.claim_status,
    northStar: r.north_star,
    ownerName: r.owner_name,
  }));
}

/**
 * Milestones on one or more tracks, with slippage history attached.
 *
 * Private items on someone else's track never appear here: the ms_read policy
 * removes them before this query sees them, so no caller has to remember.
 */
export async function milestones(tx: Tx, trackIds: string[]): Promise<MilestoneView[]> {
  if (trackIds.length === 0) return [];
  const rows = (await tx.execute(sql`
    select m.id, m.ref, m.track_id, m.domain_code, m.title, m.note,
           m.target_date, m.original_target_date, m.status, m.status_reason,
           m.agreement, m.proposed_by_member_id, m.agreed_by_member_id, m.is_private,
           coalesce(mv.move_count, 0)::int as move_count,
           coalesce(mv.move_history, '[]'::jsonb) as move_history
      from milestone m
      left join lateral (
        select count(*)::int as move_count,
               jsonb_agg(to_date order by moved_at) as move_history
          from milestone_move where milestone_id = m.id
      ) mv on true
      join domain d on d.code = m.domain_code
     where m.track_id = any(${uuidList(trackIds)})
     order by d.sort_order, m.target_date, m.ref`)) as unknown as Array<{
      id: string; ref: string; track_id: string; domain_code: string; title: string;
      note: string | null; target_date: string; original_target_date: string;
      status: MsStatus | null; status_reason: string | null; agreement: Agreement | null;
      proposed_by_member_id: string | null; agreed_by_member_id: string | null;
      is_private: boolean; move_count: number; move_history: string[];
    }>;

  return rows.map((r) => ({
    id: r.id,
    ref: r.ref,
    trackId: r.track_id,
    domainCode: r.domain_code,
    title: r.title,
    note: r.note,
    targetDate: r.target_date,
    originalTargetDate: r.original_target_date,
    status: r.status,
    statusReason: r.status_reason,
    agreement: r.agreement,
    proposedByMemberId: r.proposed_by_member_id,
    agreedByMemberId: r.agreed_by_member_id,
    isPrivate: r.is_private,
    moveCount: r.move_count,
    moveHistory: r.move_history ?? [],
  }));
}

/**
 * How many private items sit in each domain of someone else's track.
 *
 * An integer and nothing else: no rows, no redacted titles, no dates. The
 * function that produces it returns an integer by construction.
 */
export async function privateCounts(
  tx: Tx,
  trackId: string,
  domainCodes: string[],
): Promise<Record<string, number>> {
  if (domainCodes.length === 0) return {};
  const rows = (await tx.execute(sql`
    select d.code, app.private_count(${trackId}::uuid, d.code) as n
      from domain d
     where d.code::text = any(${textList(domainCodes)})`)) as unknown as
    Array<{ code: string; n: number }>;
  return Object.fromEntries(rows.filter((r) => r.n > 0).map((r) => [r.code, r.n]));
}

export interface GoalRow { id: string; domainCode: string; horizon: string; text: string }

export async function goals(tx: Tx, trackId: string): Promise<GoalRow[]> {
  const rows = (await tx.execute(sql`
    select g.id, g.domain_code, g.horizon, g.text
      from goal g
      join domain d on d.code = g.domain_code
     where g.track_id = ${trackId} and g.deleted_at is null
     order by d.sort_order, g.sort_order`)) as unknown as
    Array<{ id: string; domain_code: string; horizon: string; text: string }>;
  return rows.map((r) => ({
    id: r.id, domainCode: r.domain_code, horizon: r.horizon, text: r.text,
  }));
}

export interface AssumptionListRow {
  id: string; ref: string; domainCode: string; statement: string;
  confidence: string; testBy: string; state: string;
}

export async function assumptionsFor(tx: Tx, trackId: string): Promise<AssumptionListRow[]> {
  const rows = (await tx.execute(sql`
    select a.id, a.ref, a.domain_code, a.statement, a.confidence, a.test_by, a.state
      from assumption a
      join domain d on d.code = a.domain_code
     where a.track_id = ${trackId}
     order by d.sort_order, a.test_by`)) as unknown as Array<{
      id: string; ref: string; domain_code: string; statement: string;
      confidence: string; test_by: string; state: string;
    }>;
  return rows.map((r) => ({
    id: r.id, ref: r.ref, domainCode: r.domain_code, statement: r.statement,
    confidence: r.confidence, testBy: r.test_by, state: r.state,
  }));
}

export interface RiskListRow {
  id: string; ref: string; domainCode: string; statement: string;
  likelihood: string; impact: string; mitigation: string | null;
}

export async function risksFor(tx: Tx, trackId: string): Promise<RiskListRow[]> {
  const rows = (await tx.execute(sql`
    select r.id, r.ref, r.domain_code, r.statement, r.likelihood, r.impact, r.mitigation
      from risk r
      join domain d on d.code = r.domain_code
     where r.track_id = ${trackId}
     order by d.sort_order`)) as unknown as Array<{
      id: string; ref: string; domain_code: string; statement: string;
      likelihood: string; impact: string; mitigation: string | null;
    }>;
  return rows.map((r) => ({
    id: r.id, ref: r.ref, domainCode: r.domain_code, statement: r.statement,
    likelihood: r.likelihood, impact: r.impact, mitigation: r.mitigation,
  }));
}

export interface ConstraintListRow {
  id: string; ref: string; statement: string; isHard: boolean; source: string | null;
}

export async function constraintsFor(tx: Tx, trackId: string): Promise<ConstraintListRow[]> {
  const rows = (await tx.execute(sql`
    select id, ref, statement, is_hard, source
      from constraint_row where track_id = ${trackId}
     order by is_hard desc, ref`)) as unknown as Array<{
      id: string; ref: string; statement: string; is_hard: boolean; source: string | null;
    }>;
  return rows.map((r) => ({
    id: r.id, ref: r.ref, statement: r.statement, isHard: r.is_hard, source: r.source,
  }));
}

export interface CollisionRow {
  id: string; ref: string; tension: string; status: string;
  openedAt: string; openDays: number; domains: string[];
  contestedFrom: string | null; contestedTo: string | null;
  nextStep: string | null; derivedFromPrivate: boolean;
}

export async function collisions(tx: Tx): Promise<CollisionRow[]> {
  const rows = (await tx.execute(sql`
    select id, ref, tension, status, opened_at, domains, next_step, derived_from_private,
           contested_from::text as contested_from, contested_to::text as contested_to,
           extract(day from now() - opened_at)::int as open_days
      from collision
     order by status, opened_at`)) as unknown as Array<{
      id: string; ref: string; tension: string; status: string; opened_at: string;
      domains: string[]; next_step: string | null; derived_from_private: boolean;
      contested_from: string | null; contested_to: string | null;
      open_days: number;
    }>;
  return rows.map((r) => ({
    id: r.id, ref: r.ref, tension: r.tension, status: r.status,
    openedAt: r.opened_at, openDays: r.open_days, domains: r.domains ?? [],
    contestedFrom: r.contested_from, contestedTo: r.contested_to,
    nextStep: r.next_step, derivedFromPrivate: r.derived_from_private,
  }));
}

export interface PendingRow {
  id: string; trackId: string; text: string; raisedByMemberId: string;
  raisedAt: string; status: string;
}

export async function pendingFor(tx: Tx, trackId: string): Promise<PendingRow[]> {
  const rows = (await tx.execute(sql`
    select id, track_id, text, raised_by_member_id, raised_at, status
      from pending_item
     where track_id = ${trackId} and status = 'open'
     order by raised_at`)) as unknown as Array<{
      id: string; track_id: string; text: string; raised_by_member_id: string;
      raised_at: string; status: string;
    }>;
  return rows.map((r) => ({
    id: r.id, trackId: r.track_id, text: r.text,
    raisedByMemberId: r.raised_by_member_id, raisedAt: r.raised_at, status: r.status,
  }));
}
