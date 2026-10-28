import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@pixelvault/ui";
import type { DataRecord } from "@pixelvault/contracts";
import { apiRequest, post } from "../app/api";
import {
  DefinitionList,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Notice,
  PageHeading,
  SelectField,
} from "../components";
import { label, money } from "../lib/format";
interface Report {
  period: { start: string; end: string; timezone: string; basis: string };
  role: string;
  metrics: Record<string, string | number>;
  definitions: Record<string, string>;
}
export function AnalyticsPage({ admin = false }: { admin?: boolean }) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [start, setStart] = useState(`${today.slice(0, 7)}-01`),
    [end, setEnd] = useState(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(Date.now() + 86_400_000)),
    ),
    [role, setRole] = useState("borrower"),
    [exportError, setExportError] = useState<unknown>();
  const query = useQuery({
    queryKey: ["report", admin, role, start, end],
    queryFn: () =>
      apiRequest<Report>(
        `${admin ? "/admin/reporting" : "/reporting/member"}?role=${role}&start=${start}&end=${end}`,
      ),
  });
  return (
    <>
      <PageHeading
        title={
          admin
            ? "Operations, from the same record."
            : "A clearer view of your activity."
        }
        description="Confirmed facts and future expectations, shown separately."
      />
      <div className="report-controls">
        <div>
          <label htmlFor="report-start">From</label>
          <DateInput id="report-start" value={start} onChange={setStart} />
        </div>
        <div>
          <label htmlFor="report-end">Until (exclusive)</label>
          <DateInput id="report-end" value={end} onChange={setEnd} />
        </div>
        {!admin && (
          <SelectField
            name="report-role"
            label="Perspective"
            defaultValue={role}
            onValueChange={setRole}
            options={[
              { value: "borrower", label: "Borrowing" },
              { value: "lender", label: "Lending" },
            ]}
          />
        )}
        <Button
          variant="outline"
          onClick={async () => {
            try {
              const result = await post<{ download_path: string }>(
                "/reporting/exports",
                {
                  purpose: admin ? "operations_summary" : "member_statement",
                  role,
                  start,
                  end,
                },
              );
              const target = new URL(result.download_path, location.origin);
              if (target.origin === location.origin)
                window.location.assign(target.href);
            } catch (e) {
              setExportError(e);
            }
          }}
        >
          <Download size={16} />
          Export statement
        </Button>
      </div>
      {exportError !== undefined && <ErrorNotice error={exportError} />}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} />
      ) : (
        <section className="surface">
          <h2>{admin ? "Operations summary" : "Your period summary"}</h2>
          <p className="small-text">
            {query.data.period.start} to {query.data.period.end} ·{" "}
            {query.data.period.timezone} · {query.data.period.basis}
          </p>
          <div className="metrics-list">
            {Object.entries(query.data.metrics).map(([key, value]) => (
              <div className="metric-row" key={key}>
                <div>
                  <h3>{label(key)}</h3>
                  <p>
                    {query.data.definitions[key] ||
                      "Server-calculated value for the selected reporting period."}
                  </p>
                </div>
                <strong className="money">
                  {/(count|number|loans|applications)/.test(key) &&
                  !/(amount|principal|interest|balance)/.test(key)
                    ? String(value)
                    : money(value)}
                </strong>
              </div>
            ))}
          </div>
          <Notice>
            Expected interest is not earned income. Payment collection does not
            establish that the lender has received settlement. These figures are
            not a withdrawable wallet balance.
          </Notice>
        </section>
      )}
    </>
  );
}
import { Input } from "@pixelvault/ui";
function DateInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      id={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
