/** Explicit browser contracts. Server financial values use integer centavos. */
export type Money = number | string;
export interface CommunityReputation {
  points: number;
  level: string;
  frame: string;
  flair: Award | null;
  show_points: boolean;
}
export interface XpProgress {
  current_level: string;
  current_level_points: number | null;
  next_level: string | null;
  next_level_points: number | null;
  points_in_level: number | null;
  points_to_next: number | null;
  progress_percent: number | null;
}
export interface SetupCompleteness {
  completed: number;
  total: number;
  percent: number;
  steps: { key: string; label: string; complete: boolean; href: string }[];
}
export interface ReputationWorkspace {
  reputation: CommunityReputation;
  frames: {
    key: string;
    name: string;
    required_points: number;
    unlocked: boolean;
  }[];
  settings: {
    avatar_frame: string;
    avatar_flair_id: string | null;
    show_reputation: boolean;
    leaderboard_opt_in: boolean;
    show_lending_totals?: boolean;
    show_activity?: boolean;
  };
  rules: {
    literacy_points: number;
    contribution_points: number;
    contribution_cap: number;
  };
  progress: { next_level: string | null; points_to_next: number };
  breakdown: {
    literacy_points: number;
    contribution_points: number;
    approved_contributions: number;
  };
}
export interface LeaderboardPage {
  entries: {
    rank: number;
    position?: number;
    handle: string;
    display_name: string;
    avatar_key?: string;
    photo_url?: string | null;
    reputation: CommunityReputation;
    badges?: Award[];
    lending?: {
      total_lent: string;
      loans_funded: number;
      people_helped: number;
    } | null;
    activity?: {
      learning_completed: boolean;
      approved_contributions: number;
    };
  }[];
  next_cursor: string | null;
  summary?: {
    participants: number;
    learning_completed: number;
    approved_contributions: number;
    total_xp: number;
    lending_sharing_members?: number;
    total_lent?: string;
    loans_funded?: number;
  };
  rules: ReputationWorkspace["rules"];
  notice: string;
}
export interface Member {
  id: string;
  email: string;
  display_name: string;
  avatar_key?: string;
  photo_url?: string | null;
  photo_mode?: "avatar" | "photo";
  has_photo?: boolean;
  stored_photo_url?: string | null;
  mobile_number?: string;
  community_reputation?: CommunityReputation;
  handle?: string;
  area: string;
  bio: string;
  suspended: boolean;
  literacy_completed: boolean;
  staff_role: string;
  is_staff: boolean;
}
export interface Session {
  member: Member | null;
  environment: "test" | "live";
  csrf_token: string;
}
export interface Person {
  id: string;
  display_name: string;
  avatar_key?: string;
  photo_url?: string | null;
  handle?: string;
  area?: string;
  reputation?: CommunityReputation;
}
export interface Installment {
  id?: string;
  sequence?: number;
  due_date: string;
  principal: Money;
  interest: Money;
  total: Money;
  paid?: Money;
  status?: string;
  outstanding?: Money;
}
export interface Terms {
  principal: Money;
  annual_rate_bps: number;
  frequency: string;
  installment_count: number;
  effective_date: string;
  [key: string]: unknown;
}
export interface Disclosure {
  principal?: Money;
  net_disbursement?: Money;
  total_interest?: Money;
  total_repayment?: Money;
  effective_annual_rate?: number;
  commission?: Money;
  schedule?: Installment[];
  [key: string]: unknown;
}
export interface Offer {
  likes?: { count: number; liked: boolean };
  id: string;
  lender: Person;
  title: string;
  area: string;
  declared_amount: Money;
  available_amount: Money;
  annual_rate_bps: number;
  frequency: string;
  installment_count: number;
  min_amount: Money;
  max_amount: Money;
  status: string;
  version?: number;
  terms: Terms;
  disclosure: Disclosure;
  applications?: Application[];
  test_mode?: boolean;
}
export interface Application {
  meeting_id?: string | null;
  id: string;
  offer_id?: string;
  offer?: Offer | string;
  borrower?: Person;
  lender?: Person;
  principal: Money;
  purpose: string;
  summary?: string | Record<string, string>;
  status: string;
  agreement_id?: string;
  created_at?: string;
  version?: number;
  co_borrower?: {
    member: Omit<Person, "id">;
    status: string;
    joint_liability: false;
  } | null;
}
export interface Agreement {
  id: string;
  state: string;
  hash: string;
  terms: Terms;
  disclosure: Disclosure;
  lender: Person;
  borrower: Person;
  acceptances: unknown[];
  test_mode: boolean;
  loan_id?: string;
}
export interface Loan {
  id: string;
  status: string;
  principal_balance: Money;
  principal?: Money;
  accrued_interest: Money;
  projected_interest: Money;
  total_due: Money;
  next_installment_due?: Money;
  payoff_amount?: Money;
  next_due_date: string | null;
  settlement_status: string;
  disbursement_status: string;
  schedule: Installment[];
  terms: Terms;
  agreement_id: string;
  borrower: Person;
  lender: Person;
  test_mode: boolean;
}
export interface AwardDefinition {
  key: string;
  name: string;
  criteria: string;
  private: boolean;
}
export interface AwardCollection {
  awards: Award[];
  catalog: AwardDefinition[];
  community_level: string;
}
export interface Award {
  id: string;
  key: string;
  name: string;
  criteria?: string;
  earned_at?: string;
  public?: boolean;
  eligible?: boolean;
  private?: boolean;
}
export interface Review {
  id: string;
  author_display_name: string;
  author?: Omit<Person, "id">;
  recommendation?: "up" | "down" | null;
  ratings: Record<string, number>;
  body: string;
  published_at: string;
  response?: string;
}
export interface ActivityStatus {
  state: "online" | "recent" | "today" | "week" | "older" | "unknown";
  label: string;
}
export interface Profile {
  activity?: ActivityStatus | null;
  activity_shared?: boolean;
  id: string;
  handle: string;
  display_name: string;
  avatar_key?: string;
  photo_url?: string | null;
  photo_mode?: "avatar" | "photo";
  has_photo?: boolean;
  stored_photo_url?: string | null;
  reputation?: CommunityReputation;
  bio: string;
  area: string;
  community_level: string;
  recommendation_summary?: { up: number; down: number; total: number };
  xp_progress?: XpProgress;
  setup_completeness?: SetupCompleteness;
  badges: Award[];
  reviews: Review[];
}
export interface Thread {
  meeting_id?: string | null;
  id: string;
  loan_id?: string;
  application_id?: string;
  other_display_name: string;
  other_avatar_key?: string;
  other_photo_url?: string | null;
  other_reputation?: CommunityReputation;
  latest_at: string;
}
export interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}
export interface CaseRecord {
  id: string;
  kind: string;
  status: string;
  body: string;
  loan_id?: string;
  created_at: string;
  version: number;
  decisions?: unknown[];
  [key: string]: unknown;
}
export interface Verification {
  id: string;
  kind: string;
  status: string;
  version: number;
  reason?: string;
  created_at?: string;
  [key: string]: unknown;
}
export type DataRecord = Record<string, unknown>;
