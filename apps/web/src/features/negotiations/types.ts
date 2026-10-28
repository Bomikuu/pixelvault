import type {
  Person,
  Agreement,
  Terms,
  Disclosure,
} from "@pixelvault/contracts";
export interface MeetingSummary {
  id: string;
  kind: "investment" | "borrowing";
  state: string;
  revision: number;
  event_sequence: number;
  offer: { id: string; title: string };
  lender: Person;
  participant: Person;
  scheduled_at: string | null;
  amount: number;
  created_at: string;
}
export interface Meeting extends MeetingSummary {
  agenda: "funding" | "earnings" | "documents";
  schedule_version: number;
  proposal: {
    amount: number;
    share_bps?: number;
    basis?: string;
    risk_model?: string;
    fee_policy?: null;
    terms?: Terms;
    disclosure?: Disclosure;
  };
  proposal_version: number;
  proposal_hash: string;
  visibility: "anonymous" | "named";
  evidence_hash: string;
  evidence_reviewed: boolean;
  evidence_reviewed_by: string[];
  both_here: boolean;
  both_approved: boolean;
  approved_by: string[];
  participants: (Person & {
    role: string;
    schedule_accepted: boolean;
    checked_in: boolean;
    here: boolean;
  })[];
  messages: { id: string; body: string; sender: Person; created_at: string }[];
  events: {
    id: string;
    kind: string;
    actor: string;
    sequence: number;
    created_at: string;
  }[];
  earlier_messages_available: boolean;
  evidence: {
    id: string;
    owner_id: string;
    owner_name: string;
    name: string;
    category: string;
    file_status: string;
    authenticity: string;
    created_at: string;
  }[];
  eligibility: {
    lender_identity: string;
    participant_identity: string;
    note: string;
  };
  agreement:
    | (Omit<Agreement, "acceptances"> & {
        version: number;
        acceptances: { member_id: string; hash: string; accepted_at: string }[];
      })
    | null;
  application_id: string | null;
  loan_id: string | null;
  funding: { status: string; confirmed_amount: number; blockers: string[] };
  calls: { available: boolean; reason: string };
  server_time: string;
}
