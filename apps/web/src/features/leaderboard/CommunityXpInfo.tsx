import { IllustratedInfoDialog } from "../../components";

export function ReputationExplanation() {
  return (
    <IllustratedInfoDialog
      title="Experience comes from contribution."
      description="Community experience recognizes learning and approved educational contributions. Loan size, outstanding debt, borrowing frequency and payment hardship never add or remove community XP."
      scene="community-workshop"
      triggerLabel="How community XP works"
    >
      <p>
        Your optional frame and eligible award flair make your avatar yours.
        Public rankings require your explicit opt-in, and you can leave at any
        time. An XP level is not a credit score or repayment guarantee.
      </p>
    </IllustratedInfoDialog>
  );
}
