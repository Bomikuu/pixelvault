import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSession } from "../../app/session";
import { ErrorNotice, Loading } from "../../components";
import { AgreementRoom } from "./AgreementRoom";
import { MeetingLobby } from "./MeetingLobby";
import { useMeeting } from "./useMeeting";

export function MeetingGateway() {
  const { id } = useParams();
  const { session } = useSession();
  const [entry, setEntry] = useState<{ id: string; schedule: number } | null>(
    null,
  );
  const query = useMeeting(id, entry?.id === id);
  useEffect(() => {
    if (
      entry &&
      query.data &&
      (entry.id !== id || entry.schedule !== query.data.schedule_version)
    )
      setEntry(null);
  }, [id, query.data?.schedule_version, entry]);
  if (query.isPending)
    return <Loading text="Opening your private waiting room…" />;
  if (query.error || !query.data)
    return (
      <ErrorNotice
        error={query.error || new Error("Meeting unavailable")}
        retry={() => void query.refetch()}
      />
    );
  const room = query.data;
  if (!room.participants.some((person) => person.id === session?.member?.id))
    return (
      <ErrorNotice error={new Error("This private meeting is unavailable.")} />
    );
  if (entry?.id === id && entry.schedule === room.schedule_version)
    return (
      <AgreementRoom
        query={query}
        onLeave={() => {
          void query
            .act({ action: "leave" })
            .then(() => setEntry(null))
            .catch(() => {});
        }}
      />
    );
  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <MeetingLobby
        query={query}
        memberId={session!.member!.id}
        enter={async () => {
          try {
            const result =
              room.state === "negotiating"
                ? await query.act({ action: "check_in" })
                : room;
            setEntry({ id: result.id, schedule: result.schedule_version });
          } catch {
            /* The shared query presents the authoritative rejection. */
          }
        }}
      />
    </div>
  );
}
