import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { MessageCircle, ArrowLeft, Send } from "lucide-react";
import type { Person } from "@pixelvault/contracts";
import {
  Action,
  Button,
  Empty,
  ErrorState,
  Form,
  Heading,
  Loading,
  Page,
  PersonAvatar,
  TextField,
  dateTime,
} from "../../components/ui";
import { api, operationId, post } from "../../app/api";
import { useMemberQuery, useSession } from "../../app/session";
interface Thread {
  id: string;
  meeting_id: string | null;
  other_display_name: string;
  other_handle: string;
  other_avatar_key: string;
  other_photo_url: string | null;
  unread_count: number;
  latest_at: string | null;
}
interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}
export function InboxScreen() {
  const threads = useMemberQuery<{ threads: Thread[] }>(
    ["threads"],
    "/community/threads",
    { interval: 15000 },
  );
  return (
    <Page
      title="Your conversations."
      description="Private questions, shared plans and meeting messages."
      action={
        <Action to="/meetings" variant="outline">
          Rooms
        </Action>
      }
    >
      {threads.isPending ? (
        <Loading />
      ) : threads.error ? (
        <ErrorState error={threads.error} retry={() => threads.refetch()} />
      ) : threads.data?.threads.length ? (
        <div className="divide-y divide-border">
          {threads.data.threads.map((thread) => (
            <Action
              key={thread.id}
              to={`/inbox/${thread.id}`}
              variant="ghost"
              className="h-auto! min-h-22 w-full justify-start! gap-3 rounded-none px-0! text-left"
            >
              <PersonAvatar
                person={{
                  display_name: thread.other_display_name,
                  avatar_key: thread.other_avatar_key,
                  photo_url: thread.other_photo_url,
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {thread.other_display_name}
                </p>
                <p className="mt-1 text-xs font-normal text-muted-foreground">
                  {thread.latest_at
                    ? dateTime(thread.latest_at)
                    : "Start a conversation"}
                </p>
              </div>
              {thread.unread_count > 0 && (
                <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
                  {thread.unread_count}
                </span>
              )}
            </Action>
          ))}
        </div>
      ) : (
        <Empty
          title="A conversation starts with a plan."
          action={<Action to="/explore">Explore offers</Action>}
        >
          Your private messages will appear here.
        </Empty>
      )}
    </Page>
  );
}
export function ThreadScreen() {
  const { threadId = "" } = useParams(),
    { session } = useSession();
  const key = useRef(operationId()),
    [older, setOlder] = useState<Message[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [paging, setPaging] = useState(false);
  const threads = useMemberQuery<{ threads: Thread[] }>(
    ["threads"],
    "/community/threads",
  );
  const thread = threads.data?.threads.find((row) => row.id === threadId);
  const query = useMemberQuery<{
    messages: Message[];
    next_cursor: string | null;
  }>(["messages", threadId], `/community/threads/${threadId}/messages`, {
    interval: 5000,
  });
  useEffect(() => {
    setOlder([]);
    setCursor(null);
  }, [threadId]);
  useEffect(() => {
    const latest = query.data?.messages.at(-1);
    if (!latest || document.hidden) return;
    void post(`/hub/threads/${threadId}/read`, {
      through: latest.created_at,
    }).catch(() => {});
  }, [threadId, query.data?.messages.at(-1)?.id]);
  const nextPage = cursor === null ? query.data?.next_cursor : cursor || null;
  const messages = [
    ...new Map(
      [...older, ...(query.data?.messages || [])].map((row) => [row.id, row]),
    ).values(),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <main className="mx-auto flex h-dvh max-w-xl flex-col bg-background pt-[env(safe-area-inset-top)]">
      <header className="flex shrink-0 items-center gap-3 border-b border-border p-3">
        <Action to="/inbox" variant="ghost">
          <ArrowLeft />
          <span className="sr-only">Back to inbox</span>
        </Action>
        {thread && (
          <PersonAvatar
            person={{
              display_name: thread.other_display_name,
              avatar_key: thread.other_avatar_key,
              photo_url: thread.other_photo_url,
            }}
          />
        )}
        <h1 className="min-w-0 flex-1 truncate font-bold">
          {thread?.other_display_name || "Private conversation"}
        </h1>
        {thread?.meeting_id && (
          <Action to={`/meetings/${thread.meeting_id}`} variant="outline">
            Room
          </Action>
        )}
      </header>
      <section
        aria-label="Messages"
        className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5"
      >
        {query.error ? (
          <ErrorState error={query.error} retry={() => query.refetch()} />
        ) : query.isPending ? (
          <Loading />
        ) : null}
        {nextPage && (
          <Button
            variant="outline"
            disabled={paging}
            className="w-full"
            onClick={async () => {
              setPaging(true);
              try {
                const page = await api<{
                  messages: Message[];
                  next_cursor: string | null;
                }>(
                  `/community/threads/${threadId}/messages?cursor=${encodeURIComponent(nextPage!)}`,
                );
                setOlder((rows) => [...page.messages, ...rows]);
                setCursor(page.next_cursor || "");
              } finally {
                setPaging(false);
              }
            }}
          >
            Earlier messages
          </Button>
        )}
        {messages.length === 0 && !query.isPending && (
          <Empty title="Make the first introduction." scene="shared-plan">
            Keep IDs, income documents and account numbers out of chat. Share
            evidence through the room’s protected upload.
          </Empty>
        )}
        {messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-[90%] rounded-2xl p-3.5 ${message.sender_id === session?.member?.id ? "ml-auto rounded-br-sm bg-primary text-primary-foreground" : "mr-auto rounded-bl-sm border border-border bg-card"}`}
          >
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.body}
            </p>
            <time className="mt-2 block text-[10px] opacity-75">
              {dateTime(message.created_at)}
            </time>
          </article>
        ))}
      </section>
      <footer className="shrink-0 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Form
          submit="Send message"
          resetOnSuccess
          onSubmit={async (form) => {
            await post(`/community/threads/${threadId}/messages`, {
              body: String(form.get("body") || ""),
              operation_id: key.current,
            });
            key.current = operationId();
            await query.refetch();
          }}
        >
          <TextField
            label="Message"
            name="body"
            maxLength={4000}
            required
            placeholder="Write a private message…"
          />
        </Form>
      </footer>
    </main>
  );
}
