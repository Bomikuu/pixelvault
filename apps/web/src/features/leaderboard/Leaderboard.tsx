import { Link } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowLeftRight,
  BookOpen,
  Check,
  Crown,
  FileCheck2,
  GraduationCap,
  Medal,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@pixelvault/ui";
import type { LeaderboardPage } from "@pixelvault/contracts";
import { ApiError, apiRequest } from "../../app/api";
import { useSession } from "../../app/session";
import {
  ActionLink,
  Empty,
  ErrorNotice,
  Loading,
  MemberAvatar,
} from "../../components";
import { ReputationExplanation } from "./CommunityXpInfo";
import { XpCount } from "./XpCount";
import "./leaderboard.css";

type Entry = LeaderboardPage["entries"][number];
const number = (value: number) => value.toLocaleString("en-PH");

function MemberName({ entry }: { entry: Entry }) {
  return (
    <div className="board-member-name">
      <Link to={`/members/${entry.handle}`}>{entry.display_name}</Link>
      <span>{entry.reputation.level}</span>
    </div>
  );
}

function LearningStatus({ entry }: { entry: Entry }) {
  if (!entry.activity) return <span>Unavailable</span>;
  return entry.activity.learning_completed ? (
    <span className="board-learning-complete">
      <Check size={14} aria-hidden="true" /> Complete
    </span>
  ) : (
    <span>Not yet completed</span>
  );
}

function Podium({ entries }: { entries: Entry[] }) {
  return (
    <ol className="board-podium" aria-label="Top three contributors">
      {entries.map((entry, index) => (
        <li
          key={entry.handle}
          className={`podium-member podium-place-${index + 1} podium-rank-${Math.min(entry.rank, 3)}`}
        >
          <div className="podium-member-main">
            <span className="podium-rank" aria-label={`Rank ${entry.rank}`}>
              <Medal size={34} aria-hidden="true" />
              <b aria-hidden="true">{entry.rank}</b>
            </span>
            <MemberAvatar
              name={entry.display_name}
              avatarKey={entry.avatar_key}
              photoUrl={entry.photo_url}
              reputation={entry.reputation}
              size={60}
            />
            <MemberName entry={entry} />
            {entry.rank === 1 && (
              <Crown className="podium-crown" size={38} aria-hidden="true" />
            )}
          </div>
          <div className="podium-score">
            <span>Community reputation</span>
            <XpCount value={entry.reputation.points} />
          </div>
          <dl className="podium-breakdown">
            <div>
              <dt>
                <GraduationCap size={17} aria-hidden="true" /> Learning check
              </dt>
              <dd>
                <LearningStatus entry={entry} />
              </dd>
            </div>
            <div>
              <dt>
                <FileCheck2 size={17} aria-hidden="true" /> XP contributions
              </dt>
              <dd>
                {entry.activity
                  ? number(entry.activity.approved_contributions)
                  : "Unavailable"}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ol>
  );
}

function Summary({
  summary,
}: {
  summary: NonNullable<LeaderboardPage["summary"]>;
}) {
  const metrics = [
    {
      label: "Participating members",
      value: summary.participants,
      icon: Users,
    },
    {
      label: "XP contributions",
      value: summary.approved_contributions,
      icon: FileCheck2,
    },
    {
      label: "Learning checks completed",
      value: summary.learning_completed,
      icon: GraduationCap,
    },
    { label: "Community XP earned", value: summary.total_xp, icon: Sparkles },
  ];
  return (
    <dl className="board-summary" aria-label="Opt-in community totals">
      {metrics.map(({ label, value, icon: Icon }) => (
        <div key={label}>
          <dt>
            <Icon size={23} aria-hidden="true" />
            <span>{label}</span>
          </dt>
          <dd>{number(value)}</dd>
        </div>
      ))}
    </dl>
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
  const remaining = rows.slice(3);
  return (
    <div className="leaderboard-workspace">
      <header className="board-hero">
        <div className="board-hero-copy">
          <h1>
            Community
            <br />
            <span>leaderboard.</span>
          </h1>
          <p className="board-hero-lead">Learn, share, and help others.</p>
          <p>
            Build your community reputation through learning and approved
            contributions. Every useful step counts.
          </p>
          <div className="board-hero-actions">
            <ReputationExplanation />
            <ActionLink
              to={session?.member ? "/profile/appearance" : "/sign-in"}
              variant="outline"
            >
              <Users size={17} aria-hidden="true" />
              {session?.member
                ? "Manage my participation"
                : "Sign in to participate"}
              <ArrowRight size={16} aria-hidden="true" />
            </ActionLink>
          </div>
        </div>
        <img
          className="board-hero-art"
          src="/illustrations/community-podium.png"
          width="1774"
          height="887"
          alt=""
          fetchPriority="high"
        />
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
        <>
          {first?.summary && <Summary summary={first.summary} />}
          <section
            className="surface board-rankings"
            aria-labelledby="community-board-title"
          >
            <div className="board-section-heading">
              <div>
                <Trophy size={26} aria-hidden="true" />
                <div>
                  <h2 id="community-board-title">Top contributors</h2>
                  <p>Good things grow when we help each other.</p>
                </div>
              </div>
              <span className="board-period">All time</span>
            </div>
            <p className="board-scope">
              Opt-in members · Ranked by community XP · Equal scores share a
              rank
            </p>
            {rows.length ? (
              <>
                <Podium entries={rows.slice(0, 3)} />
                {remaining.length > 0 && (
                  <>
                    <p
                      id="board-table-scroll-hint"
                      className="board-table-hint"
                    >
                      <ArrowLeftRight size={16} aria-hidden="true" /> Scroll
                      sideways to compare all columns.
                    </p>
                    <div
                      className="board-table-region"
                      role="region"
                      aria-label="Community contributor comparison"
                      aria-describedby="board-table-scroll-hint"
                      tabIndex={0}
                    >
                      <Table
                        className="board-table"
                        aria-label="More community contributors"
                      >
                        <TableHeader>
                          <TableRow>
                            <TableHead scope="col">Rank</TableHead>
                            <TableHead scope="col">Member</TableHead>
                            <TableHead scope="col">
                              Community reputation
                            </TableHead>
                            <TableHead scope="col">Learning check</TableHead>
                            <TableHead scope="col">XP contributions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {remaining.map((entry) => (
                            <TableRow key={entry.handle}>
                              <TableCell>
                                <span
                                  className="board-row-rank"
                                  aria-label={`Rank ${entry.rank}`}
                                >
                                  {entry.rank}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="board-row-member">
                                  <MemberAvatar
                                    name={entry.display_name}
                                    avatarKey={entry.avatar_key}
                                    photoUrl={entry.photo_url}
                                    reputation={entry.reputation}
                                    size={42}
                                  />
                                  <MemberName entry={entry} />
                                </div>
                              </TableCell>
                              <TableCell>
                                <strong className="board-row-xp">
                                  {number(entry.reputation.points)} XP
                                </strong>
                              </TableCell>
                              <TableCell>
                                <LearningStatus entry={entry} />
                              </TableCell>
                              <TableCell>
                                {entry.activity
                                  ? number(
                                      entry.activity.approved_contributions,
                                    )
                                  : "Unavailable"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
                <p className="board-count">
                  Showing {number(rows.length)}
                  {first?.summary
                    ? ` of ${number(first.summary.participants)}`
                    : ""}{" "}
                  participating{" "}
                  {rows.length === 1 && !first?.summary ? "member" : "members"}.
                </p>
              </>
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
                Load more members <ArrowRight size={16} aria-hidden="true" />
              </Button>
            )}
            <footer className="board-footer">
              <p>
                {first?.notice ||
                  "Community XP is not a credit score, lending authorization or repayment guarantee."}{" "}
                XP contributions are distinct approved educational
                contributions, capped at {first?.rules.contribution_cap ?? 20}{" "}
                per member.
              </p>
              <Link className="text-link" to="/learn">
                <BookOpen size={16} aria-hidden="true" />
                Visit the learning room
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </footer>
          </section>
        </>
      )}
    </div>
  );
}
