import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type ComponentProps,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  AvatarArt,
  BadgeArt,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  initials,
} from "@pixelvault/ui";
import type { Person } from "@pixelvault/contracts";
import { ApiError } from "../app/api";
export { money, date, dateTime, label, Button, Badge } from "@pixelvault/ui";
export const asset = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
export function Action({
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
    <Button
      asChild
      variant={variant}
      className={`min-h-11 rounded-xl ${className}`}
    >
      <Link to={to}>{children}</Link>
    </Button>
  );
}
export function IconButton({
  label,
  className = "",
  children,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      className={`size-11 shrink-0 rounded-xl ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}
export function Page({
  title,
  description,
  children,
  back = false,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  back?: boolean;
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <main className="space-y-6 px-5 pb-8 pt-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {back && (
            <Button
              variant="ghost"
              className="mb-3 -ml-3 min-h-11 gap-2"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft />
              Back
            </Button>
          )}
          <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action}
      </header>
      {children}
    </main>
  );
}
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-5 ${className}`}
    >
      {children}
    </section>
  );
}
export function Heading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}
export function Note({
  children,
  danger = false,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      role={danger ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm leading-relaxed ${danger ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border bg-muted/50 text-muted-foreground"}`}
    >
      {danger ? (
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      ) : (
        <Info className="mt-0.5 size-4 shrink-0" />
      )}
      <div>{children}</div>
    </div>
  );
}
export function Loading() {
  return (
    <div
      role="status"
      className="flex min-h-40 items-center justify-center gap-3 px-5 text-sm text-muted-foreground"
    >
      <Loader2 className="size-5 motion-safe:animate-spin" />
      Loading current information…
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => unknown;
}) {
  return (
    <div className="space-y-3">
      <Note danger>
        {error instanceof Error
          ? error.message
          : "This information is unavailable. Please try again."}
      </Note>
      {retry && (
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => void retry()}
        >
          <RefreshCw />
          Try again
        </Button>
      )}
    </div>
  );
}
export function Illustration({
  scene,
  className = "",
}: {
  scene: string;
  className?: string;
}) {
  return (
    <img
      src={asset(`illustrations/${scene}-480.webp`)}
      srcSet={`${asset(`illustrations/${scene}-480.webp`)} 480w, ${asset(`illustrations/${scene}-960.webp`)} 960w`}
      sizes="(max-width: 600px) 100vw, 520px"
      width={1536}
      height={1024}
      alt=""
      loading="lazy"
      decoding="async"
      className={`h-auto w-full object-contain ${className}`}
    />
  );
}
export function Empty({
  title,
  children,
  scene = "finding-your-way",
  action,
}: {
  title: string;
  children?: ReactNode;
  scene?: string;
  action?: ReactNode;
}) {
  return (
    <section className="py-6 text-center">
      <Illustration scene={scene} className="mx-auto mb-5 max-w-60" />
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </section>
  );
}
export function PersonAvatar({
  person,
  size = 44,
}: {
  person: Pick<
    Person,
    "display_name" | "avatar_key" | "photo_url" | "reputation"
  >;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const photo = /^\/api\/v1\/community\/photos\/[0-9a-f-]+$/i.test(
    person.photo_url || "",
  )
    ? person.photo_url
    : null;
  const reputation = person.reputation;
  const frames: Record<string, string> = {
    plain: "border-border",
    blue: "border-primary",
    leaf: "border-success",
    gold: "border-podium-first-ink",
    orbit: "border-primary border-dashed",
  };
  useEffect(() => setFailed(false), [photo]);
  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <Avatar
        className={`shrink-0 border-2 bg-secondary ${frames[reputation?.frame || "plain"] || frames.plain}`}
        style={{ width: size, height: size }}
      >
        {photo && !failed ? (
          <img
            src={photo}
            alt={person.display_name}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : person.avatar_key ? (
          <AvatarArt
            avatarKey={person.avatar_key}
            size={size}
            label={`${person.display_name}'s avatar`}
          />
        ) : (
          <AvatarFallback>{initials(person.display_name)}</AvatarFallback>
        )}
      </Avatar>
      {reputation?.show_points && size >= 40 && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-background bg-foreground px-1 py-0.5 text-[9px] leading-none font-bold text-background tabular-nums">
          {reputation.points} XP
        </span>
      )}
      {reputation?.flair && (
        <span
          className="absolute -top-1 -right-1 rounded-full border border-background bg-card p-0.5"
          title={reputation.flair.name}
        >
          <BadgeArt
            badgeKey={reputation.flair.key}
            name={reputation.flair.name}
            size={Math.max(16, Math.round(size / 4))}
          />
        </span>
      )}
    </span>
  );
}
export function PersonLine({
  person,
  subtitle,
  to,
}: {
  person: Omit<Person, "id"> & { id?: string };
  subtitle?: string;
  to?: string;
}) {
  const body = (
    <>
      <PersonAvatar person={person} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{person.display_name}</p>
        {subtitle && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {to && <ChevronRight className="size-4 text-muted-foreground" />}
    </>
  );
  return to ? (
    <Link
      to={to}
      className="flex min-h-14 items-center gap-3 rounded-xl p-1 transition-colors hover:bg-muted focus-visible:outline-2"
    >
      {body}
    </Link>
  ) : (
    <div className="flex min-h-14 items-center gap-3">{body}</div>
  );
}
export function Field({
  label,
  name,
  ...props
}: ComponentProps<typeof Input> & { label: string; name: string }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
      </Label>
      <Input
        {...props}
        name={name}
        id={id}
        className={`h-12 rounded-xl bg-card text-base! ${props.className || ""}`}
      />
    </div>
  );
}
export function TextField({
  label,
  name,
  ...props
}: ComponentProps<typeof Textarea> & { label: string; name: string }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        {...props}
        name={name}
        id={id}
        className="min-h-28 rounded-xl text-base!"
      />
    </div>
  );
}
export function Picker({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="h-12! w-full rounded-xl text-base!">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function Form({
  children,
  submit,
  onSubmit,
  success,
  disabled = false,
  resetOnSuccess = false,
}: {
  children: ReactNode;
  submit: string;
  onSubmit: (data: FormData) => Promise<unknown>;
  success?: string;
  disabled?: boolean;
  resetOnSuccess?: boolean;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null),
    [done, setDone] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const errorId = useId();
  const lock = useRef(false),
    errorRef = useRef<HTMLDivElement>(null);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || disabled || !navigator.onLine) return;
    lock.current = true;
    setPending(true);
    setError(null);
    setDone(false);
    const form = event.currentTarget;
    try {
      await onSubmit(new FormData(form));
      setDone(true);
      if (resetOnSuccess) form.reset();
    } catch (e) {
      setError(e);
      requestAnimationFrame(() => {
        const fields = e instanceof ApiError ? e.fields : {};
        const first = Object.keys(fields).find((key) =>
          form.elements.namedItem(key),
        );
        const control = first ? form.elements.namedItem(first) : null;
        if (control instanceof HTMLElement) {
          control.setAttribute("aria-invalid", "true");
          control.setAttribute("aria-describedby", errorId);
          control.focus();
        } else errorRef.current?.focus();
      });
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={send}
      className="space-y-5"
      aria-describedby={error !== null ? errorId : undefined}
    >
      {children}
      {error !== null && (
        <div ref={errorRef} id={errorId} tabIndex={-1}>
          <ErrorState error={error} />
          {error instanceof ApiError &&
            Object.entries(error.fields)
              .filter(
                ([k, v]) =>
                  !["detail", "message", "code", "error"].includes(k) &&
                  (Array.isArray(v) || typeof v === "string"),
              )
              .map(([k, v]) => (
                <p key={k} className="mt-2 text-sm text-destructive">
                  {k.replaceAll("_", " ")}:{" "}
                  {Array.isArray(v) ? v.join(" ") : String(v)}
                </p>
              ))}
        </div>
      )}
      {done && success && (
        <Note>
          <span className="flex items-center gap-2">
            <Check className="size-4" />
            {success}
          </span>
        </Note>
      )}
      <Button
        type="submit"
        disabled={pending || disabled || !online}
        className="min-h-12 w-full rounded-xl text-base font-bold"
      >
        {pending ? <Loader2 className="motion-safe:animate-spin" /> : null}
        {pending ? "Saving…" : submit}
        {!pending && <ArrowRight />}
      </Button>
    </form>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <Badge
      variant="outline"
      className="rounded-md border-border text-xs font-medium"
    >
      {value.replaceAll("_", " ")}
    </Badge>
  );
}
export function DisclosureBlock({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-t border-border py-3">
      <h2>
        <Button
          variant="ghost"
          className="min-h-12 w-full justify-between! px-0! text-base font-bold"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
        >
          <span className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            {title}
          </span>
          <ChevronRight
            className={`size-4 transition-transform motion-reduce:transition-none ${open ? "rotate-90" : ""}`}
          />
        </Button>
      </h2>
      <div id={id} hidden={!open} className="space-y-3 pb-3 pt-2">
        {children}
      </div>
    </section>
  );
}
