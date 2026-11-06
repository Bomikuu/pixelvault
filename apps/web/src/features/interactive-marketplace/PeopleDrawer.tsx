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
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { MemberAvatar } from "../../components";
import { money } from "../../lib/format";
import type { Snapshot, Participant } from "./types";
export function PeopleDrawer({
  open,
  onOpenChange,
  snapshot,
  onPerson,
  onOffer,
  onMore,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  snapshot: Snapshot | null;
  onPerson: (p: Participant) => void;
  onOffer: (id: string) => void;
  onMore: () => void;
}) {
  const [q, setQ] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-[minmax(0,1fr)]! [&>*]:min-w-0 max-h-[calc(100dvh-2rem)]! max-w-xl! overflow-y-auto!">
        <DialogTitle>People & offers</DialogTitle>
        <DialogDescription>
          Everyone listed as joined is actually in this room. Offer availability
          is declared by each individual lender.
        </DialogDescription>
        <Input
          aria-label="Find a person or offer"
          placeholder="Search a name or offer"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Tabs defaultValue="offers">
          <TabsList className="w-full">
            <TabsTrigger value="offers" className="flex-1">
              Offers ({snapshot?.offers.length || 0})
            </TabsTrigger>
            <TabsTrigger value="people" className="flex-1">
              People ({snapshot?.participants.length || 0})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="people">
            <div className="divide-y divide-border">
              {snapshot?.participants
                .filter((p) =>
                  `${p.person.display_name} ${p.bubble?.text || ""}`
                    .toLowerCase()
                    .includes(q.toLowerCase()),
                )
                .map((p) => (
                  <Button
                    key={p.participant_id}
                    variant="ghost"
                    className="h-auto! min-h-20! w-full justify-start! rounded-none! px-0! py-3! text-left!"
                    onClick={() => onPerson(p)}
                  >
                    <MemberAvatar
                      name={p.person.display_name}
                      avatarKey={p.person.avatar_key}
                      photoUrl={p.person.photo_url}
                      reputation={p.person.reputation}
                    />
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm">
                        {p.person.display_name}
                      </strong>
                      <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
                        {p.bubble?.text || "Joined this room"}
                      </span>
                    </span>
                    <MessageCircle className="size-4 text-primary" />
                  </Button>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="offers">
            <div className="divide-y divide-border">
              {snapshot?.offers
                .filter((o) =>
                  `${o.title} ${o.lender.display_name}`
                    .toLowerCase()
                    .includes(q.toLowerCase()),
                )
                .map((o) => (
                  <Button
                    key={o.id}
                    variant="ghost"
                    className="h-auto! w-full justify-start! rounded-none! px-0! py-4! text-left! whitespace-normal!"
                    onClick={() => onOffer(o.id)}
                  >
                    <MemberAvatar
                      name={o.lender.display_name}
                      avatarKey={o.lender.avatar_key}
                      photoUrl={o.lender.photo_url}
                      reputation={o.lender.reputation}
                    />
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm">{o.title}</strong>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {o.lender.display_name} ·{" "}
                        {money(o.declared_available_amount)}
                      </span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {(o.terms.annual_rate_bps / 100).toFixed(2)}% annual
                        interest
                      </span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-primary" />
                  </Button>
                ))}
              {!snapshot?.offers.length && (
                <p className="py-6 text-sm text-muted-foreground">
                  No current offers in this room. You can still meet people or
                  choose another city.
                </p>
              )}
            </div>
            {snapshot?.offers_next_cursor && (
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={onMore}
              >
                Explore the complete city list
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
