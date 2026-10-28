import { useEffect, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  BadgeArt,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@pixelvault/ui";
import {
  Heart,
  MessageSquare,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  ApiForm,
  ErrorNotice,
  Field,
  Loading,
  Notice,
  PersonName,
  SelectField,
  TextField,
} from "../../components";
import { apiRequest, post } from "../../app/api";
import { useSession } from "../../app/session";
import { date, text } from "../../lib/format";
import type { ModerationComment, OfferEngagement } from "./types";
import "./engagement.css";
export function OfferSocial({ offerId }: { offerId: string }) {
  const { session } = useSession();
  const member = session?.member;
  const client = useQueryClient();
  const [picker, setPicker] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const reactionTrigger = useRef<HTMLButtonElement>(null);
  const restoreReactionFocus = useRef(false);
  useEffect(() => {
    if (!pending && !picker && restoreReactionFocus.current) {
      restoreReactionFocus.current = false;
      reactionTrigger.current?.focus();
    }
  }, [pending, picker]);
  const query = useInfiniteQuery({
    queryKey: ["offer-engagement", offerId],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      apiRequest<OfferEngagement>(
        `/engagement/offers/${offerId}${pageParam ? `?cursor=${pageParam}` : ""}`,
      ),
    getNextPageParam: (last) => last.comments_next_cursor || undefined,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["offer-engagement", offerId] });
  async function mutate(path: string, body?: unknown, method = "PUT") {
    setPending(true);
    setError(null);
    try {
      await apiRequest(path, {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      await Promise.all([
        refresh(),
        client.invalidateQueries({ queryKey: ["offers"] }),
        client.invalidateQueries({ queryKey: ["offer-likes", offerId] }),
      ]);
      setPicker(false);
      if (path.endsWith("/reaction")) restoreReactionFocus.current = true;
    } catch (problem) {
      setError(problem);
    } finally {
      setPending(false);
    }
  }
  if (query.isPending)
    return <Loading text="Opening the offer conversation…" />;
  if (query.error)
    return (
      <ErrorNotice error={query.error} retry={() => void query.refetch()} />
    );
  const social = query.data.pages[0];
  const comments = query.data.pages.flatMap((page) => page.comments);
  return (
    <Popover
      open={picker}
      onOpenChange={(open) => {
        setPicker(open);
        if (open) setError(null);
      }}
    >
      <section
        className="surface offer-conversation"
        aria-labelledby="offer-conversation-title"
      >
        <div className="offer-section-heading">
          <MessageSquare size={21} />
          <div>
            <h2 id="offer-conversation-title">
              A little clarity starts a conversation.
            </h2>
            <p>
              Ask about the offer. Keep your application, contact details and
              financial history private.
            </p>
          </div>
        </div>
        <div className="offer-social-actions">
          <Button
            variant={social.likes.liked ? "secondary" : "outline"}
            disabled={!member || pending}
            aria-pressed={social.likes.liked}
            aria-label={`${social.likes.liked ? "Unlike" : "Like"} offer (${social.likes.count} ${social.likes.count === 1 ? "like" : "likes"})`}
            onClick={() =>
              void mutate(`/engagement/offers/${offerId}/like`, {
                liked: !social.likes.liked,
              })
            }
          >
            <Heart
              size={17}
              fill={social.likes.liked ? "currentColor" : "none"}
            />
            {social.likes.liked ? "Liked" : "Like"}
            <span>{social.likes.count}</span>
          </Button>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={!member || pending}
              ref={reactionTrigger}
            >
              <Plus size={17} />
              React with an achievement
            </Button>
          </PopoverTrigger>
        </div>
        {social.reactions.length > 0 && (
          <ul
            className="offer-reaction-summary"
            aria-label="Achievement reactions"
          >
            {social.reactions.map((reaction) => (
              <li key={reaction.key}>
                <BadgeArt
                  name={reaction.name}
                  badgeKey={reaction.key}
                  size={34}
                />
                <span>{reaction.name}</span>
                <strong>{reaction.count}</strong>
              </li>
            ))}
          </ul>
        )}
        <PopoverContent
          className="offer-reaction-picker"
          align="start"
          aria-labelledby="offer-reaction-title"
          aria-describedby="offer-reaction-description"
        >
          <h3 id="offer-reaction-title">Your shareable achievements</h3>
          <p id="offer-reaction-description">
            Choose one earned achievement. It becomes a public reaction, never
            an endorsement of repayment.
          </p>
          {social.reaction_choices.length ? (
            <div>
              {social.reaction_choices.map((award) => (
                <Button
                  key={award.id}
                  variant={
                    social.my_reaction?.id === award.id
                      ? "secondary"
                      : "outline"
                  }
                  aria-pressed={social.my_reaction?.id === award.id}
                  aria-label={`React with ${award.name}`}
                  disabled={pending}
                  onClick={() =>
                    void mutate(`/engagement/offers/${offerId}/reaction`, {
                      award_id: award.id,
                    })
                  }
                >
                  <BadgeArt name={award.name} badgeKey={award.key} size={44} />
                  <span>{award.name}</span>
                </Button>
              ))}
            </div>
          ) : (
            <p>
              No eligible shareable achievements yet.{" "}
              <Link to="/learn">Explore the learning room.</Link>
            </p>
          )}
          {social.my_reaction && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                void mutate(`/engagement/offers/${offerId}/reaction`, {
                  award_id: null,
                })
              }
            >
              <X size={15} />
              Remove my reaction
            </Button>
          )}
          {error !== null && <ErrorNotice error={error} />}
        </PopoverContent>
        {error !== null && !picker && <ErrorNotice error={error} />}
        <p className="offer-social-note">
          Likes and reactions are community expression. They do not add XP,
          verify a lender or guarantee repayment.
        </p>
        <h3 className="sr-only">Offer discussion</h3>
        {member ? (
          <ApiForm
            submitLabel="Submit comment for moderation"
            successMessage="Your comment is awaiting moderation. Only you can see it until approval."
            onSubmit={async (data) => {
              await post(`/engagement/offers/${offerId}/comments`, {
                body: text(data, "comment"),
                operation_id: text(data, "operation_id"),
              });
              await refresh();
            }}
          >
            <TextField
              name="comment"
              label="Your question or comment"
              required
              maxLength={1200}
              help="Do not include phone numbers, email, ID details, personal debt claims or threats. Every comment needs moderation."
            />
          </ApiForm>
        ) : (
          <Notice>
            <Link to="/sign-in">Sign in</Link> to like, react or join the
            discussion.
          </Notice>
        )}
        {comments.length ? (
          <div className="offer-comment-list">
            {comments.map((comment) => (
              <article key={comment.id}>
                <div>
                  <PersonName person={comment.author} />
                  <time dateTime={comment.created_at}>
                    {date(comment.created_at)}
                  </time>
                </div>
                <p>{comment.body}</p>
                {comment.status !== "approved" && (
                  <small className="offer-comment-private">
                    Only you can see this comment ·{" "}
                    {comment.status === "held"
                      ? "Held for privacy review"
                      : comment.status === "rejected"
                        ? "Not approved"
                        : "Awaiting moderation"}
                  </small>
                )}
                <div className="offer-comment-actions">
                  {comment.can_delete ? (
                    <Button
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        void mutate(
                          `/engagement/comments/${comment.id}`,
                          undefined,
                          "DELETE",
                        )
                      }
                    >
                      <Trash2 size={13} />
                      Delete my comment
                    </Button>
                  ) : (
                    member && (
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setReporting(
                            reporting === comment.id ? null : comment.id,
                          )
                        }
                      >
                        Report concern
                      </Button>
                    )
                  )}
                </div>
                {reporting === comment.id && (
                  <ApiForm
                    submitLabel="Send private report"
                    successMessage="Your report was sent privately to moderation."
                    onSubmit={(data) =>
                      post(`/engagement/comments/${comment.id}/report`, {
                        reason: text(data, "reason"),
                      })
                    }
                  >
                    <TextField
                      name="reason"
                      label="What should a moderator review?"
                      required
                      maxLength={1000}
                    />
                  </ApiForm>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">
            No published comments yet. A thoughtful question is a good place to
            start.
          </p>
        )}
        {query.hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            Load older discussion
          </Button>
        )}
        {member?.is_staff &&
          ["moderator", "admin"].includes(member.staff_role) && (
            <OfferCommentModeration offerId={offerId} />
          )}
      </section>
    </Popover>
  );
}
function OfferCommentModeration({ offerId }: { offerId: string }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["offer-comment-moderation", offerId],
    queryFn: () =>
      apiRequest<{ comments: ModerationComment[] }>(
        `/admin/offer-comments?offer_id=${offerId}`,
      ),
    enabled: open,
  });
  return (
    <div className="offer-comment-moderation">
      <Button
        variant="outline"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ShieldCheck size={16} />
        Moderator review
      </Button>
      {open && (
        <>
          {query.isPending ? (
            <Loading />
          ) : query.error ? (
            <>
              <ErrorNotice error={query.error} />
              <Link to="/admin/queues">
                Confirm staff identity in administration
              </Link>
            </>
          ) : query.data.comments.length ? (
            query.data.comments.map((comment) => (
              <article key={`${comment.id}-${comment.version}`}>
                <PersonName person={comment.author} />
                <p>{comment.body}</p>
                <p className="small-text">
                  Status: {comment.status} · version {comment.version}
                </p>
                {comment.reports.map((report) => (
                  <p key={report.id}>Private report: {report.reason}</p>
                ))}
                <ApiForm
                  submitLabel="Record moderation decision"
                  onSubmit={(data) =>
                    post(`/admin/offer-comments/${comment.id}/review`, {
                      expected_version: comment.version,
                      decision: text(data, "decision"),
                      reason: text(data, "reason"),
                    })
                  }
                >
                  <SelectField
                    name="decision"
                    label="Decision"
                    options={[
                      {
                        value: "approved",
                        label: "Approve for public display",
                      },
                      { value: "held", label: "Hold privately" },
                      { value: "rejected", label: "Reject" },
                    ]}
                  />
                  <Field
                    name="reason"
                    label="Private moderation reason"
                    required
                  />
                </ApiForm>
              </article>
            ))
          ) : (
            <p>No comments need review.</p>
          )}
        </>
      )}
    </div>
  );
}
