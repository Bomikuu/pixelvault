import { useEffect, useState } from "react";
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@pixelvault/ui";
import {
  MessageCircle,
  Activity,
  Send,
  Clock3,
  Users,
  HandCoins,
  ArrowUpRight,
} from "lucide-react";
import { MemberAvatar } from "../../components";
import { money } from "../../lib/format";
import type { Snapshot, Participant } from "./types";

const postedTime = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Manila",
});

export function RoomChat({
  snapshot,
  enabled,
  onCompose,
  onPerson,
  onOffer,
}: {
  snapshot: Snapshot | null;
  enabled: boolean;
  onCompose: () => void;
  onPerson: (p: Participant) => void;
  onOffer: (id: string) => void;
}) {
  const [now, setNow] = useState(snapshot?.server_time_ms || Date.now());
  useEffect(() => {
    if (!snapshot) return;
    const offset = snapshot.server_time_ms - Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      const current = Date.now() + offset;
      setNow(current);
      const next = snapshot.participants
        .map((p) => p.bubble?.expires_at_ms || 0)
        .filter((time) => time > current)
        .sort((a, b) => a - b)[0];
      if (next) timer = setTimeout(refresh, next - current + 30);
    };
    refresh();
    return () => clearTimeout(timer);
  }, [snapshot]);
  const bubbles = (snapshot?.participants || [])
    .filter((p) => p.bubble && p.bubble.expires_at_ms > now)
    .sort((a, b) => a.bubble!.expires_at_ms - b.bubble!.expires_at_ms);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col gap-3">
        <TabsList className="min-h-11! w-full! shrink-0">
          <TabsTrigger value="chat" className="min-h-10! text-xs!">
            <MessageCircle className="size-3.5" />
            Chat
            {bubbles.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-[10px] tabular-nums text-primary">
                {bubbles.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="min-h-10! text-xs!">
            <Activity className="size-3.5" />
            Activity
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="chat"
          className="min-h-0 overflow-y-auto overscroll-contain"
        >
          <div
            className="space-y-4 py-1"
            role="log"
            aria-label="Current room bubbles"
            aria-live="polite"
            aria-relevant="additions"
          >
            {bubbles.map((p) => (
              <article key={p.bubble!.id} className="flex items-start gap-2.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11! shrink-0 rounded-full! p-0!"
                  aria-label={`View ${p.person.display_name}`}
                  onClick={() => onPerson(p)}
                >
                  <MemberAvatar
                    size={30}
                    name={p.person.display_name}
                    avatarKey={p.person.avatar_key}
                    photoUrl={p.person.photo_url}
                    reputation={p.person.reputation}
                  />
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-xs font-bold">
                      {p.participant_id === snapshot?.self?.participant_id
                        ? "You"
                        : p.person.display_name}
                    </span>
                    <time
                      dateTime={new Date(
                        p.bubble!.expires_at_ms - 60000,
                      ).toISOString()}
                      className="text-[10px] tabular-nums text-muted-foreground"
                    >
                      {postedTime.format(p.bubble!.expires_at_ms - 60000)}
                    </time>
                  </div>
                  <p className="rounded-xl rounded-tl-sm bg-secondary px-3 py-2.5 text-xs leading-relaxed break-words text-secondary-foreground">
                    {p.bubble!.text}
                  </p>
                  {p.bubble!.offer_id && (
                    <Button
                      variant="link"
                      className="mt-1 h-auto! px-0! py-1! text-[11px]!"
                      onClick={() => onOffer(p.bubble!.offer_id!)}
                    >
                      View attached offer
                      <ArrowUpRight className="size-3" />
                    </Button>
                  )}
                </div>
              </article>
            ))}
            {!bubbles.length && (
              <div className="px-3 py-10 text-center">
                <MessageCircle className="mx-auto mb-3 size-7 text-primary" />
                <p className="text-sm font-bold">Start a conversation.</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {snapshot
                    ? "Say hello to the room. Current speech bubbles will appear here."
                    : "Join a city room to meet people and share a bubble."}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent
          value="activity"
          className="min-h-0 overflow-y-auto overscroll-contain"
        >
          <p className="mb-3 text-[11px] text-muted-foreground">
            A live view of this room
          </p>
          <div className="flex items-center gap-2 border-b border-border pb-3 text-xs">
            <Users className="size-4 text-primary" />
            <strong>{snapshot?.participants.length || 0}</strong>
            <span className="text-muted-foreground">people joined</span>
          </div>
          <p className="mt-4 mb-2 flex items-center gap-2 text-xs font-bold">
            <HandCoins className="size-4 text-primary" />
            Current offer boards
          </p>
          {snapshot?.offers.map((o) => (
            <Button
              key={o.id}
              variant="ghost"
              className="h-auto! w-full justify-start! gap-2.5! px-1! py-3! text-left!"
              onClick={() => onOffer(o.id)}
            >
              <MemberAvatar
                size={28}
                name={o.lender.display_name}
                avatarKey={o.lender.avatar_key}
                photoUrl={o.lender.photo_url}
                reputation={o.lender.reputation}
              />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-xs">
                  {o.lender.display_name}
                </strong>
                <span className="mt-1 block text-[11px] font-normal tabular-nums text-muted-foreground">
                  {money(o.declared_available_amount)} available
                </span>
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 text-primary" />
            </Button>
          ))}
          {!snapshot?.offers.length && (
            <p className="py-4 text-xs leading-relaxed text-muted-foreground">
              No current offer boards in this room.
            </p>
          )}
        </TabsContent>
      </Tabs>
      <div className="mt-3 shrink-0 border-t border-border pt-3">
        <p className="mb-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock3 className="size-3" />
          Public bubbles disappear after 60 seconds
        </p>
        <Button
          className="min-h-11! w-full! text-xs!"
          disabled={!enabled}
          onClick={onCompose}
        >
          <Send className="size-3.5" />
          Post bubble
        </Button>
      </div>
    </div>
  );
}
