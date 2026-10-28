import type { Award, Disclosure, Person, Terms } from "@pixelvault/contracts";
export interface OfferComment {
  id: string;
  author: Person;
  body: string;
  status: string;
  created_at: string;
  can_delete: boolean;
}
export interface OfferEngagement {
  offer_id: string;
  likes: { count: number; liked: boolean };
  reactions: { key: string; name: string; count: number }[];
  my_reaction: Award | null;
  reaction_choices: Award[];
  comments: OfferComment[];
  comments_next_cursor: string | null;
}
export interface OfferPreview {
  terms: Terms;
  disclosure: Disclosure;
  simulation_only: boolean;
  application_uses_original_terms: boolean;
  original_terms: { frequency: string; installment_count: number };
  limits: {
    min_amount: number;
    max_amount: number;
    max_installments: number;
    frequencies: string[];
  };
  notice: string;
}
export interface ModerationComment extends OfferComment {
  version: number;
  offer_id: string;
  reports: { id: string; reason: string }[];
}
