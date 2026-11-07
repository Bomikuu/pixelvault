import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AvatarArt,
  AVATAR_OPTIONS,
  BadgeArt,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Label,
} from "@pixelvault/ui";
import {
  Camera,
  ChevronRight,
  Settings,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  UserRound,
} from "lucide-react";
import type {
  Award,
  AwardCollection,
  Profile,
  ReputationWorkspace,
} from "@pixelvault/contracts";
import {
  Action,
  DisclosureBlock,
  ErrorState,
  Field,
  Form,
  Heading,
  Loading,
  Note,
  Page,
  PersonAvatar,
  Picker,
  TextField,
  asset,
  date,
} from "../../components/ui";
import { api } from "../../app/api";
import { useMemberQuery, useSession } from "../../app/session";
import { LogoutButton } from "../../app/MobileShell";
export function ProfileScreen({ own = false }: { own?: boolean }) {
  const { handle = "" } = useParams();
  const { session, refresh } = useSession();
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: [
      "mobile-profile",
      session?.member?.id || "guest",
      own ? "own" : handle,
    ],
    queryFn: ({ signal }) =>
      api<Profile>(
        own
          ? "/community/profile"
          : `/community/profiles/${encodeURIComponent(handle)}`,
        { signal },
      ),
    enabled: !own || !!session?.member,
  });
  const awards = useMemberQuery<AwardCollection>(
    ["awards"],
    "/community/awards",
    { enabled: own },
  );
  const [editor, setEditor] = useState(false),
    [badge, setBadge] = useState<Award | null>(null),
    [allBadges, setAllBadges] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function changed() {
    await refresh();
    await query.refetch();
    await cache.invalidateQueries({
      queryKey: ["member", session?.member?.id],
    });
  }
  if (query.isPending) return <Loading />;
  if (query.error || !query.data)
    return (
      <Page title="Profile unavailable" back>
        <ErrorState error={query.error} retry={() => query.refetch()} />
      </Page>
    );
  const profile = query.data;
  const earned = own
    ? (awards.data?.awards || []).filter((row) => row.eligible && !row.private)
    : profile.badges;
  const xp = profile.xp_progress,
    setup = profile.setup_completeness;
  return (
    <div>
      <div className="relative h-40 overflow-clip bg-secondary">
        <img
          src={asset("illustrations/profile-community-cover-960.webp")}
          alt=""
          width={1536}
          height={1024}
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute top-3 right-4">
          {own && (
            <Action to="/settings" variant="outline">
              <Settings className="size-4" />
              <span className="sr-only">Profile settings</span>
            </Action>
          )}
        </div>
      </div>
      <main className="relative space-y-6 px-5 pb-8">
        <div className="-mt-12 flex items-end justify-between gap-4">
          <div className="rounded-full border-4 border-background bg-card">
            <PersonAvatar person={profile} size={96} />
          </div>
          {own && (
            <Button
              variant="outline"
              onClick={() => setEditor(true)}
              className="mb-1 min-h-11"
            >
              <Camera className="size-4" />
              Edit picture
            </Button>
          )}
        </div>
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {profile.display_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            @{profile.handle} in {profile.area}
          </p>
          {profile.activity && (
            <p className="mt-2 text-xs text-muted-foreground">
              {profile.activity.label}
            </p>
          )}
          {profile.bio && (
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">
              {profile.bio}
            </p>
          )}
        </header>
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label="Earned achievements"
        >
          {earned.slice(0, 3).map((award) => (
            <Button
              key={award.id}
              variant="ghost"
              size="icon"
              className="size-14! rounded-full! bg-muted/60! p-2!"
              onClick={() => setBadge(award)}
              aria-label={`${award.name}: view achievement`}
            >
              <BadgeArt badgeKey={award.key} name={award.name} size={40} />
            </Button>
          ))}
          {earned.length > 3 && (
            <Button
              variant="outline"
              size="icon"
              className="size-12! rounded-full!"
              onClick={() => setAllBadges(true)}
              aria-label={`View ${earned.length - 3} more achievements`}
            >
              +{earned.length - 3}
            </Button>
          )}
          {!earned.length && (
            <p className="text-sm text-muted-foreground">
              A new chapter. No public badges selected yet.
            </p>
          )}
        </div>
        {xp && (
          <section>
            <div className="mb-2 flex justify-between gap-3 text-sm">
              <h2 className="font-bold">{xp.current_level} level</h2>
              <span className="text-muted-foreground">
                {profile.reputation?.show_points !== false
                  ? `${profile.reputation?.points ?? "—"} XP`
                  : "XP is private"}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Community level progress"
              aria-valuenow={xp.progress_percent ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 overflow-clip rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${xp.progress_percent ?? 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {xp.next_level
                ? `${xp.points_to_next ?? "—"} XP to ${xp.next_level}.`
                : "Your current community level."}{" "}
              Community experience is separate from loan eligibility.
            </p>
          </section>
        )}
        {profile.recommendation_summary && (
          <div className="flex flex-wrap items-center gap-4 border-y border-border py-4 text-sm">
            <span className="flex items-center gap-2">
              <ThumbsUp className="size-4 text-primary" />
              <strong>{profile.recommendation_summary.up}</strong>recommend
            </span>
            <span className="flex items-center gap-2">
              <ThumbsDown className="size-4 text-muted-foreground" />
              <strong>{profile.recommendation_summary.down}</strong>do not
              recommend
            </span>
            <p className="w-full text-xs text-muted-foreground">
              Published transaction-based reviews. Ratings are not repayment
              guarantees.
            </p>
          </div>
        )}
        {own && setup && (
          <section>
            <Heading
              action={
                <Action to="/settings" variant="ghost">
                  Continue
                </Action>
              }
            >
              Profile setup
            </Heading>
            <div
              role="progressbar"
              aria-label="Profile setup"
              aria-valuenow={setup.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 overflow-clip rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${setup.percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {setup.completed} of {setup.total} steps completed. Separate from
              community XP.
            </p>
          </section>
        )}
        <section>
          <Heading>Community reviews</Heading>
          {profile.reviews.length ? (
            profile.reviews.map((review) => (
              <article
                key={review.id}
                className="mb-5 border-b border-border pb-5"
              >
                <p className="text-sm font-bold">
                  {review.author_display_name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {date(review.published_at)}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                  {review.body}
                </p>
                {review.response && (
                  <p className="mt-3 rounded-xl bg-muted p-3 text-sm">
                    {review.response}
                  </p>
                )}
              </article>
            ))
          ) : (
            <Note>
              No published reviews yet. Reviews are available only for eligible
              shared loan history.
            </Note>
          )}
        </section>
        {own && (
          <div className="space-y-3">
            <Action to="/settings" variant="outline" className="w-full">
              <Settings />
              Edit profile and privacy
            </Action>
            <Action to="/contacts" variant="outline" className="w-full">
              <UserRound />
              Private contacts and recovery
            </Action>
            <Action to="/verification" variant="outline" className="w-full">
              <ShieldCheck />
              Verification center
            </Action>
            <LogoutButton />
          </div>
        )}
      </main>
      <Dialog open={editor} onOpenChange={setEditor}>
        <DialogContent>
          <DialogTitle>A picture that feels like you.</DialogTitle>
          <DialogDescription>
            Choose an illustrated avatar or a nonanimated JPEG, PNG or WebP
            photo up to 3 MiB. This is separate from your private identity
            evidence.
          </DialogDescription>
          {error !== null && <ErrorState error={error} />}
          <div className="grid grid-cols-3 min-[380px]:grid-cols-4 gap-2">
            {AVATAR_OPTIONS.map((option) => (
              <Button
                key={option.key}
                variant={
                  profile.avatar_key === option.key ? "secondary" : "ghost"
                }
                className="h-auto! min-h-20 flex-col! rounded-xl p-2! text-[11px]"
                disabled={busy}
                aria-label={`Choose ${option.name} avatar`}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    await api("/auth/profile", {
                      method: "PATCH",
                      body: JSON.stringify({
                        avatar_key: option.key,
                        photo_mode: "avatar",
                      }),
                    });
                    await changed();
                    setEditor(false);
                  } catch (e) {
                    setError(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <AvatarArt avatarKey={option.key} size={44} />
                {option.name}
              </Button>
            ))}
          </div>
          <Form
            submit="Upload my photo"
            onSubmit={async (data) => {
              const file = data.get("photo");
              if (!(file instanceof File) || !file.size)
                throw new Error("Choose a photo first.");
              if (file.size > 3 * 1024 * 1024)
                throw new Error("Choose a photo of at most 3 MiB.");
              await api("/auth/profile/photo", { method: "POST", body: data });
              await changed();
              setEditor(false);
            }}
          >
            <Field
              label="Profile photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!badge}
        onOpenChange={(open) => {
          if (!open) setBadge(null);
        }}
      >
        <DialogContent>
          {badge && (
            <>
              <div className="mx-auto">
                <BadgeArt badgeKey={badge.key} name={badge.name} size={88} />
              </div>
              <DialogTitle>{badge.name}</DialogTitle>
              <DialogDescription>
                {badge.criteria ||
                  "An achievement earned through recorded community activity."}
              </DialogDescription>
              <p className="text-xs text-muted-foreground">
                Earned {date(badge.earned_at)}. Recognition is separate from
                eligibility.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={allBadges} onOpenChange={setAllBadges}>
        <DialogContent>
          <DialogTitle>A shelf of milestones.</DialogTitle>
          <DialogDescription>
            Tap an achievement to read its criteria.
          </DialogDescription>
          <div className="grid grid-cols-3 gap-3">
            {earned.map((award) => (
              <Button
                key={award.id}
                variant="ghost"
                className="h-auto! min-h-24 flex-col! text-xs"
                onClick={() => {
                  setAllBadges(false);
                  setBadge(award);
                }}
              >
                <BadgeArt badgeKey={award.key} name={award.name} size={48} />
                {award.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function ProfileSettings() {
  const { session, refresh } = useSession();
  const profile = useMemberQuery<Profile>(
    ["own-profile"],
    "/community/profile",
  );
  const reputation = useMemberQuery<ReputationWorkspace>(
    ["reputation"],
    "/community/reputation",
  );
  const [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  if (profile.isPending || reputation.isPending) return <Loading />;
  if (profile.error || !profile.data)
    return (
      <Page title="Profile settings" back>
        <ErrorState error={profile.error} />
      </Page>
    );
  const data = profile.data;
  async function preference(name: string, value: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api("/community/profile", {
        method: "PATCH",
        body: JSON.stringify({ [name]: value }),
      });
      await reputation.refetch();
      await refresh();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title="Make it yours."
      description="Your public profile and what you choose to share."
      back
    >
      <Form
        submit="Save profile"
        success="Profile updated."
        onSubmit={async (form) => {
          await api("/community/profile", {
            method: "PATCH",
            body: JSON.stringify({
              display_name: String(form.get("display_name") || ""),
              bio: String(form.get("bio") || ""),
              area: String(form.get("area") || data.area),
            }),
          });
          await profile.refetch();
          await refresh();
        }}
      >
        <Field
          label="Display name"
          name="display_name"
          defaultValue={data.display_name}
          maxLength={100}
          required
        />
        <Field
          label="City"
          name="area"
          defaultValue={data.area}
          list="mobile-cities"
          required
        />
        <datalist id="mobile-cities">
          <option value="Quezon City" />
          <option value="Manila" />
          <option value="Makati" />
          <option value="Pasig" />
        </datalist>
        <TextField
          label="A little about you"
          name="bio"
          defaultValue={data.bio}
          maxLength={400}
        />
      </Form>
      <section>
        <Heading>Public sharing</Heading>
        {error !== null && <ErrorState error={error} />}
        {reputation.error && <ErrorState error={reputation.error} />}
        {reputation.data &&
          [
            [
              "show_activity",
              "Share a coarse activity status",
              "Online now or active today; never your exact last-seen timestamp.",
            ],
            [
              "show_reputation",
              "Show community XP",
              "Experience points are not a credit or affordability score.",
            ],
            [
              "leaderboard_opt_in",
              "Join the community leaderboard",
              "Participation is optional.",
            ],
            [
              "show_lending_totals",
              "Share lifetime lending totals",
              "Aggregate confirmed lending only; borrower identities stay private.",
            ],
          ].map(([key, name, help]) => (
            <div
              key={key}
              className="flex items-start gap-3 border-b border-border py-4"
            >
              <Checkbox
                id={`preference-${key}`}
                className="mt-1 size-5"
                disabled={busy}
                checked={Boolean(
                  reputation.data!.settings[
                    key as keyof typeof reputation.data.settings
                  ],
                )}
                onCheckedChange={(value) =>
                  void preference(key, value === true)
                }
              />
              <div>
                <Label
                  htmlFor={`preference-${key}`}
                  className="min-h-6 text-sm font-bold"
                >
                  {name}
                </Label>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {help}
                </p>
              </div>
            </div>
          ))}
      </section>
      <Action to="/contacts" variant="outline" className="w-full">
        Private contact details
        <ChevronRight />
      </Action>
      <Action to="/co-borrowers" variant="outline" className="w-full">
        Co-borrower invitations
        <ChevronRight />
      </Action>
      <Action to="/learn" variant="outline" className="w-full">
        Financial literacy
        <ChevronRight />
      </Action>
      <Action to="/help" variant="outline" className="w-full">
        Private help and support
      </Action>
      <WearSettings />
      <LogoutButton />
    </Page>
  );
}

function WearSettings() {
  const { refresh } = useSession();
  const profile = useMemberQuery<Profile>(
    ["own-profile"],
    "/community/profile",
  );
  const awards = useMemberQuery<AwardCollection>(
    ["awards"],
    "/community/awards",
  );
  const reputation = useMemberQuery<ReputationWorkspace>(
    ["reputation"],
    "/community/reputation",
  );
  const [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  async function save(data: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await api("/community/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      await Promise.all([
        profile.refetch(),
        awards.refetch(),
        reputation.refetch(),
        refresh(),
      ]);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (!reputation.data || !awards.data) return null;
  const current = reputation.data.settings;
  const eligible = awards.data.awards.filter((a) => a.eligible && !a.private);
  const selected = awards.data.awards.filter((a) => a.public).map((a) => a.id);
  return (
    <section className="space-y-4">
      <Heading>Wear your milestones</Heading>
      <Note>
        Cosmetic frames, flair and shelf badges are optional. They do not change
        loan eligibility.
      </Note>
      {error !== null && <ErrorState error={error} />}
      <Picker
        label="Avatar frame"
        value={current.avatar_frame}
        disabled={busy}
        onChange={(value) => void save({ avatar_frame: value })}
        options={reputation.data.frames
          .filter((f) => f.unlocked)
          .map((f) => ({ value: f.key, label: f.name }))}
      />
      <Picker
        label="One badge beside your avatar"
        value={current.avatar_flair_id || "none"}
        disabled={busy}
        onChange={(value) =>
          void save({ avatar_flair_id: value === "none" ? null : value })
        }
        options={[
          { value: "none", label: "No worn badge" },
          ...eligible.map((a) => ({ value: a.id, label: a.name })),
        ]}
      />
      <p className="text-sm font-semibold">Public badge shelf (up to three)</p>
      <div className="space-y-2">
        {eligible.map((award) => (
          <Button
            key={award.id}
            variant={selected.includes(award.id) ? "secondary" : "outline"}
            disabled={
              busy || (!selected.includes(award.id) && selected.length >= 3)
            }
            aria-pressed={selected.includes(award.id)}
            className="min-h-14 w-full justify-start! text-sm"
            onClick={() =>
              void save({
                public_award_ids: selected.includes(award.id)
                  ? selected.filter((id) => id !== award.id)
                  : [...selected, award.id],
              })
            }
          >
            <BadgeArt badgeKey={award.key} name={award.name} size={32} />
            {award.name}
          </Button>
        ))}
      </div>
    </section>
  );
}
