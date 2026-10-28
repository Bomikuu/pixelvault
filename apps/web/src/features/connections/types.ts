import type { Person } from "@pixelvault/contracts";

export interface ContactDetails {
  email: string;
  mobile_number: string;
  email_verified: boolean;
  mobile_verified: boolean;
  verification: {
    status: string;
    current: boolean;
    provenance: string | null;
    expires_at: string | null;
  };
  delivery_available: boolean;
  notice: string;
}
export interface CoBorrowerInvitation {
  id: string;
  display_name: string;
  email: string;
  mobile_number: string;
  facebook_url: string;
  relationship: string;
  status: string;
  version: number;
  direction: "outgoing" | "incoming";
  inviter: Person;
  member: Person | null;
  ready_for_application: boolean;
  consented_at: string | null;
  expires_at: string;
  notice: string;
  invitation_path?: string;
}
export interface InvitationCollection {
  invitations: CoBorrowerInvitation[];
}
