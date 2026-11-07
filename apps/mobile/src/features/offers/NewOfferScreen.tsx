import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Action, Field, Form, Note, Page, Picker } from "../../components/ui";
import { operationId, post } from "../../app/api";
import { toCentavos } from "./OfferScreen";
export function NewOfferScreen() {
  const key = useRef(operationId()),
    navigate = useNavigate(),
    [frequency, setFrequency] = useState("monthly");
  return (
    <Page
      title="A clear offer starts here."
      description="Create a private draft before publishing. Eligibility and capacity are checked by the server."
      back
    >
      <Note>
        Current lender registration, identity and contact verification are
        required. Declared capacity is not money held by PixelVault.
      </Note>
      <Action to="/verification" variant="outline" className="w-full">
        Review lender eligibility
      </Action>
      <Form
        submit="Create draft offer"
        onSubmit={async (form) => {
          const amount = toCentavos(String(form.get("principal") || "")),
            rate = String(form.get("rate") || "");
          if (!/^\d+(?:\.\d{1,2})?$/.test(rate) || Number(rate) > 1000)
            throw new Error("Enter an annual rate from 0 to 1000 percent.");
          const [whole, fraction = ""] = rate.split(".");
          const result = await post<{ id: string }>("/offers", {
            title: String(form.get("title") || ""),
            area: String(form.get("area") || ""),
            declared_amount: toCentavos(String(form.get("capacity") || "")),
            principal: amount,
            min_amount: toCentavos(String(form.get("minimum") || "")),
            max_amount: amount,
            annual_rate_bps:
              Number(whole) * 100 + Number(fraction.padEnd(2, "0")),
            frequency,
            installment_count: Number(form.get("installments")),
            effective_date: String(form.get("effective_date") || ""),
            policy_version: "demo-v1",
            operation_id: key.current,
          });
          key.current = operationId();
          navigate(`/offers/${result.id}`);
        }}
      >
        <Field name="title" label="Offer title" maxLength={140} required />
        <Field name="area" label="City" maxLength={80} required />
        <Field
          name="capacity"
          label="Total declared capacity (₱)"
          inputMode="decimal"
          required
        />
        <Field
          name="principal"
          label="Maximum loan and original example (₱)"
          inputMode="decimal"
          required
        />
        <Field
          name="minimum"
          label="Minimum request (₱)"
          defaultValue="100.00"
          inputMode="decimal"
          required
        />
        <Field
          name="rate"
          label="Annual interest (%)"
          inputMode="decimal"
          required
        />
        <Picker
          label="Payment frequency"
          value={frequency}
          onChange={setFrequency}
          options={["weekly", "twice_monthly", "monthly", "maturity"].map(
            (value) => ({ value, label: value.replaceAll("_", " ") }),
          )}
        />
        <Field
          name="installments"
          label="Number of payments"
          type="number"
          min={1}
          max={120}
          defaultValue={3}
          required
        />
        <Field
          name="effective_date"
          label="Original effective date"
          type="date"
          required
        />
      </Form>
    </Page>
  );
}
