/** Explicit browser contracts. Server financial values use integer centavos. */
export type Money = number | string;
export interface Member {
  id: string;
  email: string;
  display_name: string;
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
  handle?: string;
  area?: string;
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
export interface Award {
  id: string;
  key: string;
  name: string;
  criteria?: string;
  earned_at?: string;
  public?: boolean;
  eligible?: boolean;
}
export interface Review {
  id: string;
  author_display_name: string;
  ratings: Record<string, number>;
  body: string;
  published_at: string;
  response?: string;
}
export interface Profile {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  area: string;
  community_level: string;
  badges: Award[];
  reviews: Review[];
}
export interface Thread {
  id: string;
  loan_id?: string;
  application_id?: string;
  other_display_name: string;
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
