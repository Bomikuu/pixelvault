export interface InvestmentPosition {
  contributed: string;
  allocated: string;
  unallocated: string;
  principal_collected: string;
  earnings: string;
  principal_returned: string;
  earnings_paid: string;
  principal_due: string;
  earnings_due: string;
  recorded_loss: string;
  capital_exposure: string;
  platform_fee: string;
  simulated: boolean;
}
export interface InvestmentFund {
  id: string;
  status: string;
  confirmed_at: string;
  position: InvestmentPosition;
  payouts: {
    id: string;
    principal: string;
    earnings: string;
    unused_capital: string;
    status: string;
    created_at: string;
    confirmed_at: string | null;
  }[];
  allocations: {
    id: string;
    loan_reference: string;
    amount: string;
    status: string;
  }[];
}
export interface InvestmentAgreement {
  id: string;
  hash: string;
  terms: {
    amount: number;
    share_bps: number;
    platform_fee: number;
    fee_policy: { bps: number; version: string };
    allocation_policy: string;
    capital_return: string;
  };
  body: string;
  accepted: boolean;
  approvals: { member_id: string; kind: string; created_at: string }[];
  fund: InvestmentFund | null;
  download_url: string;
}
