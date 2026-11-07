import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { Button } from "@pixelvault/ui";
import { apiRequest } from "../../app/api";
import { useSession } from "../../app/session";
import { ErrorNotice, MemberAvatar } from "../../components";
import type { Meeting } from "./types";
interface CallData {
  available: boolean;
  relay_configured: boolean;
  ice_servers: RTCIceServer[];
  note: string;
  call: {
    id: string;
    caller_id: string;
    state: "ringing" | "active" | "ended";
    offer: RTCSessionDescriptionInit | null;
    answer: RTCSessionDescriptionInit | null;
  } | null;
}
function waitForIce(peer: RTCPeerConnection) {
  return new Promise<void>((resolve) => {
    if (peer.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const done = () => {
      clearTimeout(timer);
      peer.removeEventListener("icegatheringstatechange", change);
      resolve();
    };
    const change = () => {
      if (peer.iceGatheringState === "complete") done();
    };
    const timer = window.setTimeout(done, 10000);
    peer.addEventListener("icegatheringstatechange", change);
  });
}
export function RoomCall({ room }: { room: Meeting }) {
  const { session } = useSession();
  const memberId = session?.member?.id;
  const other = room.participants.find((person) => person.id !== memberId)!;
  const query = useQuery({
    queryKey: ["room-call", room.id, memberId],
    queryFn: () => apiRequest<CallData>(`/meetings/${room.id}/call`),
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
  });
  const peer = useRef<RTCPeerConnection | null>(null),
    remoteStream = useRef<MediaStream | null>(null),
    stream = useRef<MediaStream | null>(null),
    generation = useRef(0),
    negotiating = useRef(false),
    activeId = useRef<string | null>(null),
    suppressed = useRef<string | null>(null);
  const [local, setLocal] = useState<MediaStream | null>(null),
    [remote, setRemote] = useState<MediaStream | null>(null),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    [connection, setConnection] = useState("Not connected"),
    [muted, setMuted] = useState(false),
    [camera, setCamera] = useState(false);
  const localVideo = useRef<HTMLVideoElement>(null),
    remoteVideo = useRef<HTMLVideoElement>(null);
  const call = query.data?.call;
  const signal = async (
    action: string,
    extra: Record<string, unknown> = {},
  ) => {
    const result = await apiRequest<CallData>(`/meetings/${room.id}/call`, {
      method: "POST",
      body: JSON.stringify({
        action,
        call_id: activeId.current || call?.id,
        ...extra,
      }),
    });
    return result;
  };
  function stop(update = true) {
    generation.current++;
    peer.current?.close();
    peer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    remoteStream.current?.getTracks().forEach((track) => track.stop());
    remoteStream.current = null;
    negotiating.current = false;
    if (update) {
      setLocal(null);
      setRemote(null);
      setCamera(false);
      setMuted(false);
      setConnection("Not connected");
    }
  }
  async function act(action: string) {
    setBusy(true);
    setError(undefined);
    try {
      if (action === "end" || action === "decline") {
        suppressed.current = call?.id || null;
        stop();
      }
      await signal(action);
      await query.refetch();
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (localVideo.current) localVideo.current.srcObject = local;
    if (remoteVideo.current) remoteVideo.current.srcObject = remote;
  }, [local, remote]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        suppressed.current = activeId.current;
        stop();
        if (activeId.current) void signal("end").catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      stop(false);
      if (activeId.current) void signal("end").catch(() => {});
    };
  }, [room.id]);
  useEffect(() => {
    if (!call || call.state === "ended") {
      if (peer.current || stream.current || negotiating.current) stop();
      activeId.current = null;
      return;
    }
    activeId.current = call.id;
    if (call.state === "ringing" || call.id === suppressed.current) return;
    if (
      typeof RTCPeerConnection === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError(
        new Error(
          "This browser cannot start a private call. Keep using text chat.",
        ),
      );
      return;
    }
    const caller = call.caller_id === memberId;
    if (negotiating.current) return;
    if (peer.current) {
      if (caller && call.answer && !peer.current.currentRemoteDescription) {
        const current = peer.current;
        negotiating.current = true;
        void current
          .setRemoteDescription(call.answer)
          .catch((problem) => setError(problem))
          .finally(() => {
            negotiating.current = false;
          });
      }
      return;
    }
    if (!caller && !call.offer) return;
    negotiating.current = true;
    const epoch = ++generation.current;
    void (async () => {
      let media: MediaStream | undefined;
      try {
        setConnection("Requesting microphone…");
        media = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        if (epoch !== generation.current) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        setLocal(media);
        const current = new RTCPeerConnection({
          iceServers: query.data?.ice_servers || [],
        });
        peer.current = current;
        current.ontrack = (event) => {
          if (epoch !== generation.current) return;
          const incoming = remoteStream.current || new MediaStream();
          remoteStream.current = incoming;
          incoming.addTrack(event.track);
          setRemote(new MediaStream(incoming.getTracks()));
        };
        current.onconnectionstatechange = () => {
          if (epoch !== generation.current) return;
          setConnection(
            current.connectionState === "connected"
              ? "Connected"
              : current.connectionState === "failed"
                ? "Connection failed · end and retry"
                : current.connectionState === "disconnected"
                  ? "Connection interrupted"
                  : current.connectionState === "closed"
                    ? "Call ended"
                    : "Connecting…",
          );
          if (current.connectionState === "failed") {
            setError(
              new Error(
                "The private connection could not be established. A configured TURN relay may be needed across networks. Text chat stays available.",
              ),
            );
            suppressed.current = activeId.current;
            stop();
            void signal("end").catch(() => {});
          }
        };
        if (caller) {
          current.addTransceiver("audio", { direction: "sendrecv" });
          current.addTransceiver("video", { direction: "sendrecv" });
        } else await current.setRemoteDescription(call.offer!);
        const audio = current
          .getTransceivers()
          .find((item) => item.receiver.track.kind === "audio");
        await audio?.sender.replaceTrack(media.getAudioTracks()[0]);
        await current.setLocalDescription(
          caller ? await current.createOffer() : await current.createAnswer(),
        );
        setConnection("Connecting privately…");
        await waitForIce(current);
        if (epoch !== generation.current || !current.localDescription) return;
        await signal("description", {
          description: {
            type: current.localDescription.type,
            sdp: current.localDescription.sdp,
          },
        });
        await query.refetch();
      } catch (problem) {
        if (epoch === generation.current) {
          setError(
            problem instanceof DOMException &&
              problem.name === "NotAllowedError"
              ? new Error(
                  "Microphone permission was declined. You can keep using text chat.",
                )
              : problem,
          );
          suppressed.current = call.id;
          stop();
          void signal("end").catch(() => {});
        } else media?.getTracks().forEach((track) => track.stop());
      } finally {
        if (epoch === generation.current) negotiating.current = false;
      }
    })();
  }, [query.data, memberId]);
  useEffect(() => {
    if (!call || call.state === "ended" || call.id === suppressed.current)
      return;
    const timer = window.setInterval(() => {
      if (!document.hidden)
        void signal("heartbeat").catch((problem) => {
          setError(problem);
        });
    }, 7000);
    return () => clearInterval(timer);
  }, [call?.id, call?.state]);
  async function toggleCamera() {
    if (!peer.current || !stream.current) return;
    setBusy(true);
    setError(undefined);
    const epoch = generation.current;
    let addedTrack: MediaStreamTrack | undefined;
    try {
      const sender = peer.current
        .getTransceivers()
        .find((item) => item.receiver.track.kind === "video")?.sender;
      if (!sender)
        throw new Error(
          "Camera sharing is unavailable in this call. End it and start another, or keep using audio.",
        );
      if (camera) {
        for (const track of stream.current.getVideoTracks()) {
          stream.current.removeTrack(track);
          track.stop();
        }
        await sender?.replaceTrack(null);
        setCamera(false);
        setLocal(new MediaStream(stream.current.getTracks()));
      } else {
        const media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (epoch !== generation.current) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        const track = media.getVideoTracks()[0];
        addedTrack = track;
        stream.current.addTrack(track);
        await sender?.replaceTrack(track);
        setCamera(true);
        setLocal(new MediaStream(stream.current.getTracks()));
      }
    } catch (problem) {
      if (addedTrack) {
        stream.current?.removeTrack(addedTrack);
        addedTrack.stop();
        setCamera(false);
        setLocal(
          stream.current ? new MediaStream(stream.current.getTracks()) : null,
        );
      }
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  const active = call?.state === "active" && call.id !== suppressed.current;
  const incoming = call?.state === "ringing" && call.caller_id !== memberId;
  return (
    <section
      className="mb-4 shrink-0 rounded-[14px] border border-border bg-card p-4"
      aria-label="Private meeting call"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <Phone className="size-4 text-primary" />
            Private audio & video
          </h2>
          <p className="mt-1 text-xs text-muted-foreground" role="status">
            {query.isPending
              ? "Checking call availability…"
              : incoming
                ? `${other.display_name} is inviting you to an audio call.`
                : call?.state === "ringing"
                  ? "Waiting for the other person to join…"
                  : active
                    ? connection
                    : "Both people decide when to join. Camera starts off."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {query.data?.available &&
            !active &&
            (!call || call.state === "ended") && (
              <Button
                variant="outline"
                disabled={busy || !room.both_here}
                onClick={() => void act("invite")}
              >
                <Phone size={16} />
                Start audio call
              </Button>
            )}
          {incoming && (
            <>
              <Button disabled={busy} onClick={() => void act("accept")}>
                <Mic size={16} />
                Join with microphone
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void act("decline")}
              >
                Decline
              </Button>
            </>
          )}
          {call && call.state !== "ended" && !incoming && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void act("end")}
            >
              <PhoneOff size={16} />
              {active ? "End call" : "Cancel call"}
            </Button>
          )}
          {active && (
            <>
              <Button
                variant="outline"
                aria-pressed={muted}
                disabled={!local}
                onClick={() => {
                  stream.current?.getAudioTracks().forEach((track) => {
                    track.enabled = muted;
                  });
                  setMuted(!muted);
                }}
              >
                {muted ? <MicOff size={16} /> : <Mic size={16} />}{" "}
                {muted ? "Unmute" : "Mute"}
              </Button>
              <Button
                variant="outline"
                aria-pressed={camera}
                disabled={busy || !local}
                onClick={() => void toggleCamera()}
              >
                {camera ? <VideoOff size={16} /> : <Video size={16} />}{" "}
                {camera ? "Turn camera off" : "Turn camera on"}
              </Button>
            </>
          )}
        </div>
      </div>
      {active && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
            <video
              ref={localVideo}
              autoPlay
              playsInline
              muted
              className={`size-full object-cover ${camera ? "" : "hidden"}`}
              aria-label="Your camera preview"
            />
            {!camera && (
              <div className="flex size-full flex-col items-center justify-center gap-2">
                <Mic className="size-6 text-primary" />
                <span className="text-sm">Your camera is off</span>
              </div>
            )}
            <span className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-1 text-xs">
              You
            </span>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
            <video
              ref={remoteVideo}
              autoPlay
              playsInline
              className="size-full object-cover"
              aria-label={`${other.display_name}’s call video`}
            />
            {!remote && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <MemberAvatar
                  name={other.display_name}
                  avatarKey={other.avatar_key}
                  photoUrl={other.photo_url}
                />
                <span className="text-sm">
                  Waiting for the private connection…
                </span>
              </div>
            )}
            <Button
              variant="secondary"
              className="absolute bottom-2 right-2 text-xs"
              onClick={() =>
                void remoteVideo.current
                  ?.play()
                  .catch(() =>
                    setError(
                      new Error(
                        "Use your browser’s media controls to allow call audio.",
                      ),
                    ),
                  )
              }
            >
              <Volume2 size={14} />
              Play audio
            </Button>
          </div>
        </div>
      )}
      {!query.data?.relay_configured && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Direct connections are available in test mode. Reliable calls across
          networks need an operator-configured relay.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {query.data?.note ||
          "Text chat stays available if calls are unavailable."}
      </p>
      {!query.data?.available && !query.isPending && (
        <p className="mt-2 text-sm text-muted-foreground">
          The operator has not enabled calls.
        </p>
      )}
      {(error || query.error) && (
        <div className="mt-3">
          <ErrorNotice
            error={error || query.error}
            retry={() => void query.refetch()}
          />
        </div>
      )}
    </section>
  );
}
