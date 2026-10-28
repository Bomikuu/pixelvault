import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileCheck2, FileText, Upload, X, LockKeyhole } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Checkbox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@pixelvault/ui";
import { apiRequest } from "../../app/api";
import { ErrorNotice } from "../../components";
import { label } from "../../lib/format";
import type { Meeting } from "./types";

export function RoomDocuments({
  room,
  memberId,
  onReview,
}: {
  room: Meeting;
  memberId?: string;
  onReview: () => void;
}) {
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null),
    [consent, setConsent] = useState(false),
    [category, setCategory] = useState("redacted_evidence"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-xl! font-extrabold!">
          Evidence, shared with care.
        </h2>
        <p className="mt-2! text-sm leading-relaxed! text-muted-foreground">
          Only the two room participants can access explicitly shared files.
          Upload a redacted copy; keep full IDs and income records in
          verification.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          ["Lender identity", room.eligibility.lender_identity],
          ["Other participant identity", room.eligibility.participant_identity],
        ].map(([name, value]) => (
          <div
            key={name}
            className="flex items-center gap-3 rounded-xl bg-muted p-4"
          >
            <ShieldStatus />
            <div>
              <span className="block text-xs text-muted-foreground">
                {name}
              </span>
              <strong className="mt-1 block text-sm">{label(value)}</strong>
            </div>
          </div>
        ))}
      </div>
      <p className="flex items-start gap-2 text-xs leading-relaxed! text-muted-foreground">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" />
        {room.eligibility.note} A clean file scan does not prove document
        authenticity.
      </p>
      <div className="rounded-xl border border-border p-4">
        <p className="mb-3! text-xs leading-relaxed! text-muted-foreground">
          Acknowledge the current statuses for this proposal. This is a review
          acknowledgment, not an authenticity certification.
        </p>
        <Button
          variant="outline"
          disabled={
            busy ||
            room.state === "closed" ||
            room.evidence_reviewed_by.includes(memberId || "")
          }
          onClick={onReview}
        >
          <FileCheck2 size={16} />
          {room.evidence_reviewed_by.includes(memberId || "")
            ? "You reviewed these statuses"
            : "I reviewed the evidence statuses"}
        </Button>
        <p className="mt-3! text-xs text-muted-foreground">
          {room.evidence_reviewed
            ? "Both people reviewed the current evidence."
            : "Both reviews are needed before preparing a contract."}
        </p>
      </div>
      {room.evidence.length ? (
        <ul className="m-0! grid list-none! gap-2 p-0!">
          {room.evidence.map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border p-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-1 size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <strong className="block text-sm [overflow-wrap:anywhere]">
                    {e.name}
                  </strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {e.owner_name} · {label(e.category)}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    File safety: {label(e.file_status)}. Authenticity not
                    verified.
                  </span>
                  {e.file_status === "clean" && (
                    <a
                      className="mt-2 inline-block text-xs font-bold text-primary! hover:underline"
                      href={`/api/v1/meetings/${room.id}/evidence/${e.id}`}
                    >
                      Download shared file
                    </a>
                  )}
                </div>
              </div>
              {e.owner_id === memberId && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Stop sharing ${e.name}`}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await apiRequest(
                        `/meetings/${room.id}/evidence/${e.id}`,
                        { method: "DELETE" },
                      );
                      await client.invalidateQueries({
                        queryKey: ["meeting", room.id],
                      });
                    } catch (problem) {
                      setError(problem);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <X size={16} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No files shared. Your private verification documents remain private.
        </div>
      )}
      <form
        noValidate
        className="grid gap-3 rounded-xl bg-muted p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setError(null);
          if (!file || !consent) {
            setError(new Error("Choose a file and confirm who can see it."));
            return;
          }
          const body = new FormData();
          body.append("file", file);
          body.append("category", category);
          body.append("consent", "share_with_counterparty");
          setBusy(true);
          try {
            await apiRequest(`/meetings/${room.id}/evidence`, {
              method: "POST",
              body,
            });
            setFile(null);
            setConsent(false);
            form.reset();
            await client.invalidateQueries({ queryKey: ["meeting", room.id] });
          } catch (problem) {
            setError(problem);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Label htmlFor="room-file">
          Share a redacted document or transfer receipt
        </Label>
        <Input
          id="room-file"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <p className="text-xs text-muted-foreground">
          PDF, PNG or JPEG · up to 10 MiB · synthetic documents only
        </p>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-label="Evidence category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="redacted_evidence">
              Redacted supporting evidence
            </SelectItem>
            <SelectItem value="transfer_proof">
              Transfer receipt for review
            </SelectItem>
          </SelectContent>
        </Select>
        <Label
          className="flex items-start gap-2 text-xs leading-relaxed!"
          htmlFor="room-share-consent"
        >
          <Checkbox
            id="room-share-consent"
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
          />
          I agree to share this copy with the other room participant. A receipt
          does not confirm settlement.
        </Label>
        <Button
          type="submit"
          variant="outline"
          disabled={busy || room.state === "closed"}
        >
          <Upload size={16} />
          {busy ? "Sharing…" : "Share for review"}
        </Button>
      </form>
      {error && <ErrorNotice error={error} />}
    </section>
  );
}
function ShieldStatus() {
  return <FileCheck2 className="size-5 shrink-0 text-primary" />;
}
