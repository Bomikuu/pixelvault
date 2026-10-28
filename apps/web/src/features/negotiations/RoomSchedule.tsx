import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button, Input, Label } from "@pixelvault/ui";
import { meetingTime } from "./MeetingList";
import type { Meeting } from "./types";

type Act = (data: Record<string, unknown>) => Promise<Meeting | null>;
export function RoomSchedule({
  room,
  lender,
  busy,
  act,
}: {
  room: Meeting;
  lender: boolean;
  busy: boolean;
  act: Act;
}) {
  const [time, setTime] = useState("");
  return (
    <section className="rounded-[14px] border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm! font-extrabold!">
        <CalendarClock className="size-4 text-primary" />
        Your meeting
      </h2>
      <p className="mt-3! text-xs leading-relaxed! text-muted-foreground">
        {meetingTime(room.scheduled_at)}
      </p>
      {lender ? (
        <form
          noValidate
          className="mt-4 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (time)
              void act({
                action: "schedule",
                scheduled_at: time.trim().replace(" ", "T") + ":00+08:00",
              });
          }}
        >
          <Label htmlFor="meeting-time" className="text-xs">
            Date and time · Manila
          </Label>
          <Input
            className="min-w-0! w-full! text-[11px]!"
            id="meeting-time"
            type="text"
            placeholder="2026-10-28 19:10"
            aria-describedby="meeting-time-format"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <p
            id="meeting-time-format"
            className="text-[10px] text-muted-foreground"
          >
            YYYY-MM-DD HH:MM · 24-hour time
          </p>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={
              busy ||
              !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(time) ||
              room.state === "closed"
            }
          >
            Propose time
          </Button>
        </form>
      ) : (
        <Button
          className="mt-4 w-full!"
          variant="outline"
          size="sm"
          disabled={
            busy ||
            !room.scheduled_at ||
            room.state === "closed" ||
            room.participants.find((p) => p.id === room.participant.id)
              ?.schedule_accepted
          }
          onClick={() => void act({ action: "accept_schedule" })}
        >
          {room.participants.find((p) => p.id === room.participant.id)
            ?.schedule_accepted
            ? "Meeting time accepted"
            : "Accept meeting time"}
        </Button>
      )}
      <p className="mt-3! text-[11px] leading-relaxed! text-muted-foreground">
        Check in within one hour of the accepted time. Rescheduling requires new
        check-ins.
      </p>
    </section>
  );
}
