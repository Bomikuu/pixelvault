import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  MapPin,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import {
  BadgeArt,
  AvatarArt,
  AVATAR_OPTIONS,
  Button,
  Checkbox,
  Label,
} from "@pixelvault/ui";
import type {
  Award,
  AwardCollection,
  AwardDefinition,
  Message,
  Profile,
  Thread,
} from "@pixelvault/contracts";
import { apiRequest, post } from "../app/api";
import { useSession } from "../app/session";
import {
  ActionLink,
  ContextIllustration,
  MemberAvatar,
  ApiForm,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Notice,
  PageHeading,
  SelectField,
  TextField,
  IllustratedInfoDialog,
} from "../components";
import { ReputationSettings } from "./ReputationPages";
import { date, label, text } from "../lib/format";
export function MemberProfile() {
  const { handle } = useParams();
  const query = useQuery({
    queryKey: ["profile", handle],
    queryFn: () => apiRequest<Profile>(`/community/profiles/${handle}`),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  return <ProfileView profile={query.data} />;
}
function ProfileView({
  profile,
  own = false,
}: {
  profile: Profile;
  own?: boolean;
}) {
  return (
    <>
      <div className="profile-cover">
        <span className="profile-cover-grid" />
        <span className="profile-cover-text">
          Borrow today.
          <br />
          Build tomorrow.
        </span>
      </div>
      <section className="profile-heading">
        <MemberAvatar
          name={profile.display_name}
          avatarKey={profile.avatar_key}
          reputation={profile.reputation}
          size={80}
        />
        <div>
          <h1>{profile.display_name}</h1>
          <p>
            <MapPin size={15} />
            {profile.area || "Area private"}
            <span>·</span>
            {profile.reputation?.level || profile.community_level || "Newcomer"}
          </p>
        </div>
        {own && (
          <ActionLink to="/profile/edit" variant="outline">
            Edit profile
          </ActionLink>
        )}
      </section>
      {own && (
        <nav className="profile-tools" aria-label="Profile settings">
          <Link to="/profile/appearance">Avatar frames & flair</Link>
          <Link to="/profile/badges">Achievement showcase</Link>
          <Link to="/reviews">My review history</Link>
          <Link to="/settings/notifications">Reminder preferences</Link>
        </nav>
      )}
      <div className="profile-layout">
        <div>
          <section className="surface">
            <h2>A little about me</h2>
            <p className="prose">
              {profile.bio || "This member hasn’t shared a bio yet."}
            </p>
          </section>
          <section className="surface">
            <div className="section-heading">
              <h2>Achievement showcase</h2>
              <IllustratedInfoDialog
                title="Milestones, with meaning."
                description="Every achievement has a specific earning rule. You choose which eligible awards appear publicly. Achievements never guarantee repayment or legal lending authorization."
                scene="community-workshop"
                triggerLabel="About achievements"
              />
              {own && (
                <Link to="/profile/badges">
                  Manage showcase
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
            <BadgeShelf awards={profile.badges} />
            <p className="small-text">
              Achievements recognize specific milestones. They do not guarantee
              repayment or indicate legal lending authorization.
            </p>
          </section>
          <section className="surface">
            <h2>Community reviews</h2>
            {profile.reviews.length ? (
              <div className="review-list">
                {profile.reviews.map((review) => (
                  <article className="review" key={review.id}>
                    <div>
                      <strong>{review.author_display_name}</strong>
                      <small>{date(review.published_at)}</small>
                    </div>
                    <p>{review.body}</p>
                    <div className="review-categories">
                      {Object.entries(review.ratings).map(([key, value]) => (
                        <span key={key}>
                          {label(key)} <strong>{value}/5</strong>
                        </span>
                      ))}
                    </div>
                    {review.response && (
                      <blockquote>{review.response}</blockquote>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">
                No published transaction-based reviews yet.
              </p>
            )}
          </section>
        </div>
        <aside className="profile-aside">
          <ShieldCheck size={24} />
          <h2>People, with boundaries.</h2>
          <p>
            Public profiles never show income documents, exact addresses,
            outstanding debt or private risk records.
          </p>
          <Link to="/help#privacy">
            How your information is protected
            <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
    </>
  );
}
export function BadgeShelf({ awards }: { awards: Award[] }) {
  return (
    <div className="badge-shelf">
      {awards.length ? (
        awards.map((a, index) => (
          <Link key={a.id} className="badge-item" to={`/badges/${a.key}`}>
            <BadgeArt name={a.name} badgeKey={a.key} index={index} size={72} />
            <strong>{a.name}</strong>
            <small>
              {a.earned_at ? date(a.earned_at) : "Criteria available"}
            </small>
          </Link>
        ))
      ) : (
        <div className="badge-empty">
          <BadgeArt name="Your story is still unfolding" size={54} />
          <p>
            Your story is still unfolding.
            <br />
            <span>
              Learning can earn your first milestone, without taking a loan.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
export function OwnProfile() {
  const { session } = useSession();
  const member = session!.member!;
  const query = useQuery({
    queryKey: ["profile", member.id],
    queryFn: () =>
      apiRequest<Profile>(`/community/profiles/${member.handle || member.id}`),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  return <ProfileView profile={query.data} own />;
}
export function EditProfile() {
  const { session, refresh } = useSession();
  const member = session!.member!;
  const [selectedAvatar, setSelectedAvatar] = useState(
    member.avatar_key || "sprout",
  );
  return (
    <>
      <PageHeading
        title="Make your profile yours."
        description="Share a little about yourself. Keep financial documents and exact addresses private."
      />
      <div className="profile-edit-layout">
        <section className="surface">
          <ApiForm
            onSubmit={async (data) => {
              await apiRequest("/auth/profile", {
                method: "PATCH",
                body: JSON.stringify({
                  display_name: text(data, "display_name"),
                  bio: text(data, "bio"),
                  area: text(data, "area"),
                  avatar_key: selectedAvatar,
                }),
              });
              await refresh();
            }}
            submitLabel="Save profile"
            successMessage="Your profile was updated."
          >
            <fieldset className="avatar-picker">
              <legend>Choose your profile character</legend>
              <p id="avatar-help">
                A little personality for your public profile. Your identity
                checks stay private.
              </p>
              <div
                className="avatar-options"
                role="group"
                aria-describedby="avatar-help"
              >
                {AVATAR_OPTIONS.map((option) => (
                  <Button
                    key={option.key}
                    type="button"
                    variant="outline"
                    className={`avatar-choice ${selectedAvatar === option.key ? "is-selected" : ""}`}
                    aria-pressed={selectedAvatar === option.key}
                    aria-label={`Choose ${option.name}`}
                    onClick={() => setSelectedAvatar(option.key)}
                  >
                    <AvatarArt avatarKey={option.key} size={76} />
                    <strong>{option.name}</strong>
                    <span>{option.description}</span>
                    {selectedAvatar === option.key && (
                      <Check
                        className="avatar-selected"
                        size={17}
                        aria-hidden="true"
                      />
                    )}
                  </Button>
                ))}
              </div>
            </fieldset>
            <Field
              name="display_name"
              label="Display name"
              defaultValue={member.display_name}
              required
            />
            <Field
              name="area"
              label="Approximate city or municipality"
              defaultValue={member.area}
            />
            <TextField
              name="bio"
              label="About you"
              defaultValue={member.bio}
              maxLength={400}
              help="Do not share ID numbers, account numbers or private financial details."
            />
          </ApiForm>
          <ReputationSettings />
        </section>
        <aside className="profile-edit-aside">
          <ContextIllustration scene="community-workshop" eager />
          <h2>Every person brings something.</h2>
          <p>
            Your chosen character appears beside your offers, conversations and
            profile. Pick whichever feels like you.
          </p>
          <div className="avatar-preview">
            <MemberAvatar
              name={member.display_name}
              avatarKey={selectedAvatar}
              reputation={member.community_reputation}
              size={64}
            />
            <div>
              <strong>{member.display_name}</strong>
              <span>Preview · save to update your profile</span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
function useAwardCatalog() {
  return useQuery({
    queryKey: ["achievement-catalog"],
    queryFn: () =>
      apiRequest<{ catalog: AwardDefinition[] }>(
        "/community/achievement-catalog",
      ),
  });
}
export function BadgeDetail() {
  const { key } = useParams();
  const query = useAwardCatalog();
  if (query.isPending) return <Loading text="Opening this achievement…" />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const entry = query.data.catalog.find((item) => item.key === key);
  if (!entry)
    return (
      <Empty
        title="Achievement not found"
        action={
          <ActionLink to="/profile/badges" variant="outline">
            View achievements
          </ActionLink>
        }
      >
        This achievement is not in the current collection.
      </Empty>
    );
  return (
    <>
      <Link to="/profile/badges" className="back-link">
        <ArrowLeft size={16} />
        Achievements
      </Link>
      <section className="badge-detail surface">
        <BadgeArt name={entry.name} badgeKey={entry.key} size={176} />
        <h1>{entry.name}</h1>
        <p>{entry.criteria}</p>
        {entry.private && (
          <p className="achievement-private">
            Always private · never shown on your public profile
          </p>
        )}
        <Notice>
          Evidence and rule versions determine eligibility. A badge cannot be
          purchased and never guarantees financial reliability.
        </Notice>
        <ActionLink to="/learn" variant="outline">
          Explore the learning room
        </ActionLink>
      </section>
    </>
  );
}
export function AchievementsPage() {
  const query = useQuery({
    queryKey: ["awards"],
    queryFn: () => apiRequest<AwardCollection>("/community/awards"),
  });
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  if (query.isPending)
    return <Loading text="Opening your achievement collection…" />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const { awards, catalog, community_level } = query.data;
  const eligibleAwards = awards.filter((award) => award.eligible);
  const shareableIds = new Set(
    awards
      .filter(
        (award) =>
          award.eligible &&
          !award.private &&
          catalog.some(
            (definition) => definition.key === award.key && !definition.private,
          ),
      )
      .map((award) => award.id),
  );
  // Eligibility can change while this collection is open. Drop unavailable
  // selections so a hidden checkbox never blocks a corrected showcase save.
  const publicIds = (
    selectedIds ??
    awards.filter((award) => award.public).map((award) => award.id)
  ).filter((id) => shareableIds.has(id));
  return (
    <>
      <PageHeading
        title="A story worth building."
        description="Recognition for learning, clear agreements and meaningful contributions."
        action={
          <IllustratedInfoDialog
            title="Choose what you celebrate."
            description="Earn achievements through recorded learning, approved contributions and specific milestones. You can showcase up to three eligible public awards and wear one as avatar flair. Fresh Start stays private. No award guarantees repayment or lending authorization."
            scene="community-workshop"
            triggerLabel="About awards & avatar flair"
          />
        }
      />
      <section className="achievement-intro surface">
        <div>
          <h2>Small steps. A bigger story.</h2>
          <p>
            Learn something useful. Share what you know. Mark the milestones
            along the way.
          </p>
          <dl className="achievement-summary">
            <div>
              <dt>Community level</dt>
              <dd>{community_level}</dd>
            </div>
            <div>
              <dt>Achievements earned</dt>
              <dd>
                {eligibleAwards.length} of {catalog.length}
              </dd>
            </div>
          </dl>
          <p className="small-text">
            Community levels reflect learning and approved contributions, never
            your loan size or outstanding debt.
          </p>
          <Link to="/learn" className="text-link">
            Visit the learning room <ArrowRight size={15} />
          </Link>
          <Link to="/profile/edit" className="text-link">
            Choose your avatar frame & flair <ArrowRight size={15} />
          </Link>
        </div>
        <ContextIllustration scene="community-workshop" eager />
      </section>
      <section className="surface achievement-collection">
        <div className="section-heading">
          <div>
            <h2>Your achievement collection</h2>
            <p>
              Choose up to three earned achievements for your public profile.
            </p>
          </div>
          <span className="showcase-count" aria-live="polite">
            {publicIds.length} / 3 selected
          </span>
        </div>
        <ApiForm
          onSubmit={() =>
            apiRequest("/community/profile", {
              method: "PATCH",
              body: JSON.stringify({ public_award_ids: publicIds }),
            })
          }
          submitLabel="Save public showcase"
          successMessage="Your public achievement selection was saved."
        >
          <div className="awards-grid">
            {catalog.map((definition, index) => {
              const award = awards.find((item) => item.key === definition.key);
              const earned = !!award?.eligible;
              const isPrivate = definition.private || !!award?.private;
              const selected = !!award && publicIds.includes(award.id);
              return (
                <article
                  className={`achievement ${earned ? "earned" : "locked"}`}
                  key={definition.key}
                >
                  <Link
                    className="achievement-art-link"
                    to={`/badges/${definition.key}`}
                    aria-label={`View ${definition.name} achievement`}
                  >
                    <BadgeArt
                      name={definition.name}
                      badgeKey={definition.key}
                      index={index}
                      size={112}
                      locked={!earned}
                    />
                  </Link>
                  <div className="achievement-copy">
                    <span
                      className={`achievement-state ${earned ? "is-earned" : ""}`}
                    >
                      {earned ? (
                        <>
                          <Check size={13} />
                          Earned
                        </>
                      ) : (
                        "To discover"
                      )}
                      {isPrivate && " · Private"}
                    </span>
                    <Link to={`/badges/${definition.key}`}>
                      <h3>{definition.name}</h3>
                    </Link>
                    <p>{award?.criteria || definition.criteria}</p>
                    {earned && award.earned_at && (
                      <small>Earned {date(award.earned_at)}</small>
                    )}
                    {award && !earned && (
                      <small>
                        Eligibility needs current evidence. Your previous
                        milestone stays in your private history.
                      </small>
                    )}
                    {earned && !isPrivate ? (
                      <div className="check-field">
                        <Checkbox
                          id={definition.key}
                          checked={selected}
                          disabled={!selected && publicIds.length >= 3}
                          onCheckedChange={(checked) =>
                            setSelectedIds(
                              checked
                                ? [...publicIds, award.id]
                                : publicIds.filter((id) => id !== award.id),
                            )
                          }
                        />
                        <Label htmlFor={definition.key}>Show on profile</Label>
                      </div>
                    ) : (
                      <small className="achievement-hint">
                        {isPrivate
                          ? "Always private. Yours to keep."
                          : "Earned through verified activity, never purchased."}
                      </small>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </ApiForm>
        <p className="small-text achievement-footnote">
          Achievements describe specific milestones. They do not guarantee
          repayment or indicate legal lending authorization. You never need to
          take a loan just to participate.
        </p>
      </section>
    </>
  );
}
export function InboxPage() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("thread");
  const threads = useQuery({
    queryKey: ["threads"],
    queryFn: () => apiRequest<{ threads: Thread[] }>("/community/threads"),
  });
  const messages = useInfiniteQuery({
    queryKey: ["messages", selected],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      apiRequest<{ messages: Message[]; next_cursor: string | null }>(
        `/community/threads/${selected}/messages${pageParam ? `?cursor=${pageParam}` : ""}`,
      ),
    getNextPageParam: (last) => last.next_cursor || undefined,
    enabled: !!selected,
  });
  const messageRows = messages.data
    ? [...messages.data.pages].reverse().flatMap((page) => page.messages)
    : [];
  const { session } = useSession();
  return (
    <>
      <PageHeading
        title="Conversations, kept between you."
        description="Private messages stay connected to an application or loan."
      />
      <div className="inbox-layout">
        <section className="thread-list surface">
          {threads.isPending ? (
            <Loading />
          ) : threads.error ? (
            <ErrorNotice error={threads.error} />
          ) : threads.data.threads.length ? (
            threads.data.threads.map((t) => (
              <Button
                key={t.id}
                variant="ghost"
                className={`thread-row ${t.id === selected ? "selected" : ""}`}
                onClick={() => setParams({ thread: t.id })}
              >
                <MemberAvatar
                  name={t.other_display_name}
                  avatarKey={t.other_avatar_key}
                  reputation={t.other_reputation}
                />
                <span>
                  <strong>{t.other_display_name}</strong>
                  <small>
                    {t.loan_id
                      ? "Loan conversation"
                      : "Application conversation"}{" "}
                    · {date(t.latest_at)}
                  </small>
                </span>
                <ChevronRight size={15} />
              </Button>
            ))
          ) : (
            <Empty title="No conversations yet" icon={MessageSquare}>
              Conversations begin around a private application or loan.
            </Empty>
          )}
        </section>
        <section className="conversation surface">
          {!selected ? (
            <Empty title="A little room to talk." icon={MessageSquare}>
              Choose a conversation to read your shared messages.
            </Empty>
          ) : (
            <>
              <h2>
                {threads.data?.threads.find((t) => t.id === selected)
                  ?.other_display_name || "Private conversation"}
              </h2>
              {messages.isPending ? (
                <Loading />
              ) : messages.error ? (
                <ErrorNotice error={messages.error} />
              ) : (
                <div className="message-list">
                  {messages.hasNextPage && (
                    <Button
                      variant="ghost"
                      onClick={() => messages.fetchNextPage()}
                      disabled={messages.isFetchingNextPage}
                    >
                      Load older messages
                    </Button>
                  )}
                  {messageRows.length ? (
                    messageRows.map((m) => (
                      <div
                        className={`message ${m.sender_id === session?.member?.id ? "mine" : ""}`}
                        key={m.id}
                      >
                        <p>{m.body}</p>
                        <small>{date(m.created_at)}</small>
                        {m.sender_id !== session?.member?.id && (
                          <Link
                            className="message-report"
                            to={`/reports/new?type=message&id=${m.id}`}
                          >
                            Report concern
                          </Link>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="muted">
                      No messages in this conversation yet.
                    </p>
                  )}
                </div>
              )}
              <ApiForm
                submitLabel="Send message"
                onSubmit={(data) =>
                  post(`/community/threads/${selected}/messages`, {
                    body: text(data, "message"),
                    operation_id: text(data, "operation_id"),
                  })
                }
              >
                <TextField
                  name="message"
                  label="Your message"
                  required
                  help="Keep private details to the necessary minimum. Threats and public debt shaming are prohibited."
                />
              </ApiForm>
            </>
          )}
        </section>
      </div>
    </>
  );
}
export function ReviewForm() {
  const [params] = useSearchParams(),
    loan = params.get("loan");
  return (
    <>
      <PageHeading
        title="Share a fair, specific review."
        description="Only verified transaction parties can review. Reviews wait for eligibility and moderation."
      />
      <section className="surface narrow">
        <ApiForm
          onSubmit={(data) =>
            post("/community/reviews", {
              loan_id: loan || text(data, "loan_id"),
              ratings: Object.fromEntries(
                [
                  "communication",
                  "clarity_of_terms",
                  "reliability",
                  "respectful_conduct",
                ].map((k) => [k, Number(data.get(k))]),
              ),
              body: text(data, "body"),
              operation_id: text(data, "operation_id"),
            })
          }
          submitLabel="Submit for private review"
          successMessage="Your review was submitted. It is not public until publication and moderation conditions are met."
        >
          <Notice>
            Reviews publish after both parties submit or the eligible 14-day
            window ends, and moderation clears the content. Private debt details
            belong in a case.
          </Notice>
          {!loan && <Field name="loan_id" label="Loan reference" required />}
          {[
            "communication",
            "clarity_of_terms",
            "reliability",
            "respectful_conduct",
          ].map((key) => (
            <SelectField
              key={key}
              name={key}
              label={label(key)}
              defaultValue="3"
              options={[1, 2, 3, 4, 5].map((n) => ({
                value: String(n),
                label: `${n} of 5`,
              }))}
            />
          ))}
          <TextField
            name="body"
            label="Your experience"
            required
            help="Describe communication and conduct. Never include IDs, addresses, debt amounts or threats."
          />
        </ApiForm>
      </section>
    </>
  );
}
export function LearningPage() {
  const { session, refresh } = useSession();
  return (
    <>
      <PageHeading
        title="Build confidence before commitment."
        description="A little knowledge is the first achievement. No loan required."
      />
      <div className="learning-layout">
        <div>
          <article className="learning-article surface">
            <ContextIllustration
              scene="shared-plan"
              className="learning-scene"
              eager
            />
            <h2>Read the whole cost.</h2>
            <p>
              A rate is one part of the picture. Compare the principal, interest
              calculation, fees, total repayment and each due date.
              Reducing-balance interest uses the remaining principal, so the
              same percentage may produce a different total under another
              method.
            </p>
            <h2>Plan around real income.</h2>
            <p>
              A payment plan should leave room for essential expenses and
              existing obligations. Weekly, twice-monthly and monthly schedules
              have different dates. Borrowing again to cover a payment can
              compound hardship.
            </p>
            <h2>Keep the agreement and the record.</h2>
            <p>
              Both parties accept the same terms. A payment is confirmed through
              authoritative records. If something changes, open a private
              hardship or dispute case. A badge never guarantees repayment.
            </p>
            <h2>Respect is part of the agreement.</h2>
            <p>
              Do not publish debt claims, reveal private documents, contact
              unrelated people or threaten arrest. Private, accountable support
              is available even when new borrowing is restricted.
            </p>
          </article>
        </div>
        <aside className="surface">
          <h2>Your first chapter</h2>
          <Link className="text-link" to="/learn/contribute">
            Share a useful contribution
            <ArrowRight size={15} />
          </Link>
          {session?.member?.literacy_completed ? (
            <Notice tone="success">
              You have completed the financial-literacy questions.
            </Notice>
          ) : session?.member ? (
            <ApiForm
              submitLabel="Complete learning check"
              onSubmit={async (data) => {
                await post("/literacy/complete", {
                  answers: [
                    Number(text(data, "q1")),
                    Number(text(data, "q2")),
                    Number(text(data, "q3")),
                  ],
                });
                await refresh();
              }}
              successMessage="Learning check submitted. Your achievement eligibility has been updated."
            >
              <SelectField
                name="q1"
                label="What does an identity check guarantee?"
                options={[
                  { value: "choose", label: "Choose an answer" },
                  { value: "0", label: "Repayment is guaranteed" },
                  { value: "1", label: "Identity only, not repayment" },
                ]}
              />
              <SelectField
                name="q2"
                label="What should you review before accepting?"
                options={[
                  { value: "choose", label: "Choose an answer" },
                  { value: "0", label: "Only the advertised rate" },
                  { value: "1", label: "All costs and exact payment dates" },
                ]}
              />
              <SelectField
                name="q3"
                label="What does a lending offer mean?"
                options={[
                  { value: "choose", label: "Choose an answer" },
                  { value: "0", label: "Preapproved credit for me" },
                  {
                    value: "1",
                    label: "A lending intention, not preapproved credit",
                  },
                ]}
              />
            </ApiForm>
          ) : (
            <ActionLink to="/register">Create an account to begin</ActionLink>
          )}
        </aside>
      </div>
    </>
  );
}
