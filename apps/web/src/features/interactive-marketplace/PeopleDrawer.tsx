import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@pixelvault/ui";
import { ArrowUpRight, Search, Tag, Users, Crown } from "lucide-react";
import { MemberAvatar } from "../../components";
import { money } from "../../lib/format";
import type { Snapshot, Participant } from "./types";

type PeopleProps = {
  snapshot: Snapshot | null;
  onPerson: (p: Participant) => void;
  onOffer: (id: string) => void;
  onMore: () => void;
};

export function PeopleList({
  snapshot,
  onPerson,
  onOffer,
  onMore,
}: PeopleProps) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase(),
    people = (snapshot?.participants || []).filter((p) =>
      `${p.person.display_name} ${p.bubble?.text || ""}`
        .toLowerCase()
        .includes(query),
    ),
    offers = (snapshot?.offers || []).filter((o) =>
      `${o.title} ${o.lender.display_name}`.toLowerCase().includes(query),
    );
  return (
    <Tabs defaultValue="people" className="flex min-h-0 flex-1 flex-col gap-3">
      <TabsList className="min-h-11! w-full! shrink-0">
        <TabsTrigger value="people" className="min-h-10! text-xs!">
          <Users className="size-3.5" />
          People ({snapshot?.participants.length || 0})
        </TabsTrigger>
        <TabsTrigger value="offers" className="min-h-10! text-xs!">
          <Tag className="size-3.5" />
          Offers ({snapshot?.offers.length || 0})
        </TabsTrigger>
      </TabsList>
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
        <Input
          aria-label="Find a person or offer"
          placeholder="Search people or offers…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-h-11! bg-card! pl-9! text-sm! text-foreground! placeholder:text-muted-foreground!"
        />
      </div>
      <TabsContent
        value="people"
        className="min-h-0 overflow-y-auto overscroll-contain"
      >
        <div className="space-y-1">
          {people.map((p) => {
            const self = p.participant_id === snapshot?.self?.participant_id;
            return (
              <Button
                key={p.participant_id}
                variant="ghost"
                className={`h-auto! min-h-16! w-full justify-start! gap-3! rounded-xl! px-2! py-2.5! text-left! hover:bg-accent! ${self ? "bg-secondary!" : ""}`}
                onClick={() => onPerson(p)}
              >
                <MemberAvatar
                  size={32}
                  name={p.person.display_name}
                  avatarKey={p.person.avatar_key}
                  photoUrl={p.person.photo_url}
                  reputation={p.person.reputation}
                />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs">
                    {self ? "You" : p.person.display_name}
                  </strong>
                  <span className="mt-1 flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground">
                    <span className="size-1.5 shrink-0 rounded-full bg-emerald-600" />
                    {self ? p.person.display_name : "In this room"}
                  </span>
                </span>
                {self && (
                  <Crown
                    className="size-4 shrink-0 text-primary"
                    aria-label="Your character"
                  />
                )}
              </Button>
            );
          })}
          {!people.length && (
            <p className="px-2 py-8 text-center text-xs leading-relaxed text-muted-foreground">
              {query
                ? "No people match your search."
                : "Join this room to see who is here."}
            </p>
          )}
        </div>
      </TabsContent>
      <TabsContent
        value="offers"
        className="min-h-0 overflow-y-auto overscroll-contain"
      >
        <div className="divide-y divide-border">
          {offers.map((o) => (
            <Button
              key={o.id}
              variant="ghost"
              className="h-auto! w-full justify-start! gap-3! rounded-lg! px-2! py-3! text-left! whitespace-normal! hover:bg-accent!"
              onClick={() => onOffer(o.id)}
            >
              <MemberAvatar
                size={32}
                name={o.lender.display_name}
                avatarKey={o.lender.avatar_key}
                photoUrl={o.lender.photo_url}
                reputation={o.lender.reputation}
              />
              <span className="min-w-0 flex-1">
                <strong className="block text-xs leading-relaxed">
                  {o.title}
                </strong>
                <span className="mt-1 block truncate text-[11px] font-normal text-muted-foreground">
                  {o.lender.display_name}
                </span>
                <span className="mt-1 block text-xs font-bold tabular-nums">
                  {money(o.declared_available_amount)}
                </span>
                <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
                  {(o.terms.annual_rate_bps / 100).toFixed(2)}% annual interest
                </span>
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 text-primary" />
            </Button>
          ))}
          {!offers.length && (
            <p className="px-2 py-8 text-center text-xs leading-relaxed text-muted-foreground">
              {query
                ? "No offers match your search."
                : "No current offers in this room. Try another city."}
            </p>
          )}
        </div>
        {snapshot?.offers_next_cursor && (
          <Button
            variant="outline"
            className="mt-3 min-h-11! w-full text-xs!"
            onClick={onMore}
          >
            See the complete city list
            <ArrowUpRight className="size-3.5" />
          </Button>
        )}
      </TabsContent>
    </Tabs>
  );
}

export function PeopleDrawer({
  open,
  onOpenChange,
  ...props
}: PeopleProps & { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)]! max-w-md! grid-cols-[minmax(0,1fr)]! overflow-hidden! p-4! [&>*]:min-w-0">
        <DialogTitle className="pr-8 text-lg!">People & offers</DialogTitle>
        <DialogDescription className="text-xs!">
          Current members and available offers in this city room.
        </DialogDescription>
        <div
          className="flex min-h-0 flex-col overflow-hidden"
          style={{ height: "min(30rem, calc(100dvh - 12rem))" }}
        >
          <PeopleList {...props} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
