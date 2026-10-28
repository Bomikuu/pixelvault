import { useState, useRef, type ReactNode, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  Avatar,
  AvatarFallback,
  AvatarArt,
  AVATAR_OPTIONS,
  Badge,
  Checkbox,
} from "@pixelvault/ui";
import type { DataRecord, Person } from "@pixelvault/contracts";
import { operationId, ApiError } from "./app/api";
import { date, initials, label, money } from "./lib/format";
export function ActionLink({
  to,
  children,
  variant = "default",
  className = "",
}: {
  to: string;
  children: ReactNode;
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
}) {
  return (
    <Button asChild variant={variant} className={className}>
      <Link to={to}>{children}</Link>
    </Button>
  );
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function Empty({
  title,
  children,
  action,
  icon = FileText,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: typeof FileText;
}) {
  const Icon = icon;
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={26} />
      </span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
export function Loading({
  text = "Loading your information…",
}: {
  text?: string;
}) {
  return (
    <div className="loading" role="status">
      <Loader2 size={20} className="spin" />
      <span>{text}</span>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="notice danger" role="alert">
      <TriangleAlert size={18} />
      <div>
        <strong>We couldn’t complete that request</strong>
        <p>{error instanceof Error ? error.message : String(error)}</p>
        {error instanceof ApiError &&
          Object.entries(error.fields)
            .filter(
              ([key, value]) =>
                !["detail", "error", "message", "code"].includes(key) &&
                (typeof value === "string" || Array.isArray(value)),
            )
            .map(([key, value]) => (
              <p key={key}>
                <strong>{label(key)}:</strong>{" "}
                {Array.isArray(value)
                  ? value.map(String).join(" ")
                  : String(value)}
              </p>
            ))}
        {retry && (
          <Button variant="outline" onClick={retry}>
            <RefreshCw size={14} />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warning" | "success";
}) {
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "warning"
        ? TriangleAlert
        : Info;
  return (
    <div
      className={`notice ${tone}`}
      role={tone === "success" ? "status" : undefined}
    >
      <Icon size={18} />
      <div>{children}</div>
    </div>
  );
}
export function Status({ value }: { value: string | undefined | null }) {
  return (
    <Badge
      variant="outline"
      className={`status status-${String(value || "pending").replaceAll(" ", "_")}`}
    >
      {label(value || "pending")}
    </Badge>
  );
}
export function MemberAvatar({
  name,
  avatarKey,
  className = "",
  size = 40,
}: {
  name: string;
  avatarKey?: string;
  className?: string;
  size?: number;
}) {
  const hasPortrait = AVATAR_OPTIONS.some((option) => option.key === avatarKey);
  return (
    <Avatar
      className={`member-avatar ${className}`}
      style={{ width: size, height: size }}
    >
      {hasPortrait ? (
        <AvatarArt
          avatarKey={avatarKey!}
          size={size}
          label={`${name}’s chosen avatar`}
        />
      ) : (
        <AvatarFallback>{initials(name)}</AvatarFallback>
      )}
    </Avatar>
  );
}
export function ContextIllustration({
  scene,
  className = "",
  eager = false,
}: {
  scene: "community-workshop" | "shared-plan";
  className?: string;
  eager?: boolean;
}) {
  return (
    <img
      className={`context-illustration ${className}`}
      src={`/illustrations/${scene}.png`}
      alt=""
      width={1536}
      height={1024}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
export function PersonName({
  person,
  subtitle,
}: {
  person: Person;
  subtitle?: string;
}) {
  return (
    <div className="person">
      <MemberAvatar name={person.display_name} avatarKey={person.avatar_key} />
      <div>
        <Link
          className="person-name"
          to={`/members/${person.handle || person.id}`}
        >
          {person.display_name}
        </Link>
        {subtitle && <small>{subtitle}</small>}
      </div>
    </div>
  );
}
export function Field({
  name,
  label: caption,
  type = "text",
  required = false,
  help,
  defaultValue,
  placeholder,
  min,
  max,
  step,
  accept,
  autoComplete,
  disabled,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  help?: string;
  defaultValue?: string | number;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number | string;
  accept?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <div className="field">
      <Label htmlFor={name}>
        {caption}
        {required && <span aria-hidden="true"> *</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        accept={accept}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-describedby={help ? `${name}-help` : undefined}
      />
      {help && <small id={`${name}-help`}>{help}</small>}
    </div>
  );
}
export function TextField({
  name,
  label: caption,
  help,
  required = false,
  defaultValue,
  placeholder,
  maxLength = 2000,
}: {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div className="field">
      <Label htmlFor={name}>{caption}</Label>
      <Textarea
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={4}
        aria-describedby={help ? `${name}-help` : undefined}
      />
      {help && <small id={`${name}-help`}>{help}</small>}
    </div>
  );
}
export function SelectField({
  name,
  label: caption,
  options,
  defaultValue,
  help,
  onValueChange,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  help?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <div className="field">
      <Label htmlFor={name}>{caption}</Label>
      <Select
        name={name}
        defaultValue={defaultValue || options[0]?.value}
        onValueChange={onValueChange}
      >
        <SelectTrigger id={name}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {help && <small>{help}</small>}
    </div>
  );
}
export function CheckField({
  name,
  children,
  required = false,
  defaultChecked = false,
}: {
  name: string;
  children: ReactNode;
  required?: boolean;
  defaultChecked?: boolean;
}) {
  return (
    <div className="check-field">
      <Checkbox
        id={name}
        name={name}
        required={required}
        defaultChecked={defaultChecked}
      />
      <Label htmlFor={name}>{children}</Label>
    </div>
  );
}
export function ApiForm({
  children,
  onSubmit,
  submitLabel = "Save changes",
  successMessage,
  onSuccess,
  confirm,
}: {
  children: ReactNode;
  onSubmit: (data: FormData) => Promise<unknown>;
  submitLabel?: string;
  successMessage?: string;
  onSuccess?: (data: unknown) => void;
  confirm?: string;
}) {
  const operation = useRef(operationId());
  const [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null),
    [success, setSuccess] = useState(false);
  const query = useQueryClient();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setPending(true);
    try {
      const payload = new FormData(event.currentTarget);
      payload.set("operation_id", operation.current);
      const result = await onSubmit(payload);
      operation.current = operationId();
      setSuccess(true);
      await query.invalidateQueries();
      onSuccess?.(result);
    } catch (e) {
      setError(e);
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="api-form" onSubmit={submit}>
      {children}
      {confirm && <p className="form-confirm">{confirm}</p>}
      {error !== null && <ErrorNotice error={error} />}
      {success && successMessage && (
        <Notice tone="success">{successMessage}</Notice>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 size={16} className="spin" /> : null}
        {pending ? "Submitting…" : submitLabel}
        {!pending && <ArrowRight size={16} />}
      </Button>
    </form>
  );
}
export function DefinitionList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="definition-list">
      {rows.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function RecordRows({
  records,
  empty = "No records yet",
  linkPrefix,
}: {
  records: DataRecord[];
  empty?: string;
  linkPrefix?: string;
}) {
  if (!records.length) return <Empty title={empty} />;
  return (
    <div className="record-list">
      {records.map((record, index) => {
        const heading = String(
          record.title ||
            record.name ||
            record.display_name ||
            record.kind ||
            record.event ||
            record.action ||
            record.id ||
            `Record ${index + 1}`,
        );
        const content = (
          <>
            <div>
              <strong>{label(heading)}</strong>
              <p>
                {[record.body, record.reason, record.description, record.area]
                  .filter(Boolean)
                  .map(String)
                  .join(" · ") ||
                  (record.created_at || record.due_date
                    ? date(String(record.created_at || record.due_date))
                    : "")}
              </p>
            </div>
            <div className="record-end">
              {record.amount !== undefined && (
                <strong className="money">
                  {money(String(record.amount))}
                </strong>
              )}
              {record.status !== undefined && (
                <Status value={String(record.status)} />
              )}
              {linkPrefix && <ChevronRight size={16} />}
            </div>
          </>
        );
        return linkPrefix ? (
          <Link
            className="record-row"
            key={String(record.id || index)}
            to={`${linkPrefix}/${record.id}`}
          >
            {content}
          </Link>
        ) : (
          <div className="record-row" key={String(record.id || index)}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
export function VerifiedNote() {
  return (
    <span className="verified-note">
      <ShieldCheck size={15} />
      Verification describes a check, never a repayment guarantee.
    </span>
  );
}
export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Button asChild variant="outline">
      <a href={href} rel="noopener noreferrer" target="_blank">
        {children}
        <ArrowUpRight size={14} />
      </a>
    </Button>
  );
}
