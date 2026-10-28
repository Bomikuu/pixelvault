import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Check,
  LockKeyhole,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Button, Checkbox, Label } from "@pixelvault/ui";
import type {
  AwardCollection,
  LeaderboardPage,
  ReputationWorkspace,
} from "@pixelvault/contracts";
import { ApiError, apiRequest } from "../app/api";
import { useSession } from "../app/session";
import {
  ActionLink,
  ApiForm,
  ContextIllustration,
  Empty,
  ErrorNotice,
  IllustratedInfoDialog,
  Loading,
  MemberAvatar,
  Notice,
  PageHeading,
  SelectField,
} from "../components";

function ReputationExplanation() {
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

export function ReputationPage() {
  return (
    <>
      <PageHeading
        title="Your community XP & avatar extras."
        description="Choose unlocked frames, wear an earned achievement and control your public participation."
      />
      <section className="surface appearance-workspace">
        <ReputationSettings />
      </section>
    </>
  );
}

export function ReputationSettings() {
  const { session, refresh } = useSession();
  const query = useQuery({
    queryKey: ["community-reputation"],
    queryFn: () => apiRequest<ReputationWorkspace>("/community/reputation"),
  });
  const awards = useQuery({
    queryKey: ["awards"],
    queryFn: () => apiRequest<AwardCollection>("/community/awards"),
  });
  const [frameChoice, setFrameChoice] = useState<string>();
  const [flairChoice, setFlairChoice] = useState<string>();
  const [showChoice, setShowChoice] = useState<boolean>();
  const [boardChoice, setBoardChoice] = useState<boolean>();
  if (query.isPending)
    return <Loading text="Loading your community experience…" />;
  if (query.error) return <ErrorNotice error={query.error} />;
  if (!query.data.reputation || !query.data.settings || !query.data.frames)
    return (
      <Notice>
        Community experience settings are unavailable. Your profile details can
        still be saved above.
      </Notice>
    );
  const data = query.data;
  const frame = frameChoice ?? data.settings.avatar_frame;
  const flair = flairChoice ?? data.settings.avatar_flair_id ?? "none";
  const show = showChoice ?? data.settings.show_reputation;
  const board = boardChoice ?? data.settings.leaderboard_opt_in;
  const eligible = (awards.data?.awards || []).filter(
    (award) => award.eligible && !award.private,
  );
  const member = session?.member;
  return (
    <section
      className="reputation-settings"
      aria-labelledby="reputation-settings-title"
    >
      <div className="section-heading">
        <h2 id="reputation-settings-title">Community XP & avatar extras.</h2>
        <ReputationExplanation />
      </div>
      <div className="experience-record">
        <Sparkles size={22} aria-hidden="true" />
        <div>
          <strong>{data.reputation.level}</strong>
          <p>{data.reputation.points.toLocaleString("en-PH")} community XP</p>
        </div>
        <span>
          {data.progress.next_level
            ? `${data.progress.points_to_next.toLocaleString("en-PH")} XP to ${data.progress.next_level}`
            : "Highest current community level"}
        </span>
      </div>
      <p className="small-text">
        {data.rules.literacy_points} XP for the learning check.{" "}
        {data.rules.contribution_points} XP per distinct approved educational
        contribution, up to {data.rules.contribution_cap}. Financial activity
        never earns community XP.
      </p>
      <dl className="xp-source-breakdown">
        <div>
          <dt>Learning check</dt>
          <dd>{data.breakdown.literacy_points} XP</dd>
        </div>
        <div>
          <dt>
            {data.breakdown.approved_contributions} approved contributions
          </dt>
          <dd>{data.breakdown.contribution_points} XP</dd>
        </div>
      </dl>
      <ApiForm
        submitLabel="Save avatar extras & privacy"
        successMessage="Your avatar extras and community preferences were saved."
        onSubmit={async () => {
          await apiRequest("/community/profile", {
            method: "PATCH",
            body: JSON.stringify({
              avatar_frame: frame,
              avatar_flair_id: flair === "none" ? null : flair,
              show_reputation: show,
              leaderboard_opt_in: board,
            }),
          });
          await refresh();
        }}
      >
        <fieldset className="frame-picker">
          <legend>Choose an avatar frame</legend>
          <div className="frame-options">
            {data.frames.map((option) => (
              <Button
                key={option.key}
                type="button"
                variant="outline"
                className={
                  frame === option.key
                    ? "frame-choice is-selected"
                    : "frame-choice"
                }
                disabled={!option.unlocked}
                aria-pressed={frame === option.key}
                aria-label={`Choose ${option.name} frame${option.unlocked ? "" : `, requires ${option.required_points} XP`}`}
                onClick={() => setFrameChoice(option.key)}
              >
                <MemberAvatar
                  name={member?.display_name || "Your avatar"}
                  avatarKey={member?.avatar_key}
                  reputation={{
                    ...data.reputation,
                    frame: option.key,
                    show_points: false,
                    flair: null,
                  }}
                  size={48}
                />
                <strong>{option.name}</strong>
                <span>
                  {option.unlocked ? (
                    <>
                      <Check size={13} /> Unlocked
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={13} /> {option.required_points} XP
                    </>
                  )}
                </span>
              </Button>
            ))}
          </div>
        </fieldset>
        {awards.error ? (
          <ErrorNotice
            error={awards.error}
            retry={() => {
              void awards.refetch();
            }}
          />
        ) : (
          <SelectField
            name="avatar_flair"
            label="Wear an earned achievement"
            defaultValue={flair}
            options={[
              { value: "none", label: "No achievement flair" },
              ...eligible.map((award) => ({
                value: award.id,
                label: award.name,
              })),
            ]}
            onValueChange={setFlairChoice}
            help="Only your currently eligible, public-capable achievements can be worn. Private milestones stay private."
          />
        )}
        <div className="reputation-preferences">
          <div className="check-field">
            <Checkbox
              id="show-community-xp"
              checked={show}
              onCheckedChange={(checked) => setShowChoice(checked === true)}
            />
            <Label htmlFor="show-community-xp">
              Show my community XP on public profiles
            </Label>
          </div>
          <div className="check-field">
            <Checkbox
              id="join-community-board"
              checked={board}
              onCheckedChange={(checked) => setBoardChoice(checked === true)}
            />
            <Label htmlFor="join-community-board">
              Include me in the optional community board
            </Label>
          </div>
          <p className="small-text">
            The board only lists members who opt in and show their XP. Hide XP
            or opt out to leave the public rankings.
          </p>
        </div>
      </ApiForm>
    </section>
  );
}

export function Leaderboard() {
  const client = useQueryClient();
  const { session } = useSession();
  const query = useInfiniteQuery({
    queryKey: ["community-leaderboard"],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      apiRequest<LeaderboardPage>(
        `/community/leaderboard?limit=25${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    getNextPageParam: (page) => page.next_cursor || undefined,
  });
  const rows = query.data?.pages.flatMap((page) => page.entries) || [];
  const first = query.data?.pages[0];
  return (
    <>
      <PageHeading
        title="Community leaderboard."
        description="An optional community board for learning and educational contributions."
        action={<ReputationExplanation />}
      />
      <header className="community-board-intro">
        <div>
          <Trophy size={30} aria-hidden="true" />
          <h2>Community experience, earned by helping.</h2>
          <p>
            Learn something useful. Share something useful. Every point comes
            from recorded learning and approved contributions.
          </p>
          <ActionLink
            to={session?.member ? "/profile/edit" : "/sign-in"}
            variant="outline"
          >
            <Users size={17} />
            {session?.member
              ? "Manage my participation"
              : "Sign in to participate"}
          </ActionLink>
        </div>
        <ContextIllustration scene="community-workshop" eager />
      </header>
      {query.isPending ? (
        <Loading text="Loading the community board…" />
      ) : query.error ? (
        <ErrorNotice
          error={
            query.error instanceof ApiError && query.error.status === 409
              ? new Error(
                  "The community board changed. Refresh to see the current rankings.",
                )
              : query.error
          }
          retry={() => {
            void client.resetQueries({
              queryKey: ["community-leaderboard"],
              exact: true,
            });
          }}
        />
      ) : (
        <section
          className="surface community-board"
          aria-labelledby="community-board-title"
        >
          <div className="section-heading">
            <h2 id="community-board-title">The community board</h2>
            <span className="small-text">Opt-in members only</span>
          </div>
          <p className="small-text">
            {first?.notice ||
              "Community XP is not a credit score, lending authorization or repayment guarantee."}
          </p>
          {rows.length ? (
            <ol className="leaderboard-list" role="list">
              {rows.map((entry) => (
                <li key={entry.handle}>
                  <span
                    className="leaderboard-rank"
                    aria-label={`Rank ${entry.rank}`}
                  >
                    {entry.rank}
                  </span>
                  <MemberAvatar
                    name={entry.display_name}
                    avatarKey={entry.avatar_key}
                    reputation={entry.reputation}
                    size={48}
                  />
                  <div>
                    <Link to={`/members/${entry.handle}`}>
                      {entry.display_name}
                    </Link>
                    <span>{entry.reputation.level}</span>
                  </div>
                  <strong>
                    {entry.reputation.points.toLocaleString("en-PH")}{" "}
                    <span>XP</span>
                  </strong>
                </li>
              ))}
            </ol>
          ) : (
            <Empty title="There’s room for a first contributor." icon={Users}>
              No members are visible on this board yet. You can learn and
              contribute without joining the rankings.
            </Empty>
          )}
          {query.hasNextPage && (
            <Button
              variant="outline"
              disabled={query.isFetchingNextPage}
              onClick={() => {
                void query.fetchNextPage();
              }}
            >
              Load more members <ArrowRight size={16} />
            </Button>
          )}
          <Link className="text-link" to="/learn">
            <BookOpen size={16} />
            Visit the learning room <ArrowRight size={16} />
          </Link>
        </section>
      )}
    </>
  );
}
