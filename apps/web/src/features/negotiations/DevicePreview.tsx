import { useEffect, useRef, useState } from "react";
import { CameraOff, Mic, MicOff, ShieldCheck, Video } from "lucide-react";
import { Button } from "@pixelvault/ui";
import { MemberAvatar } from "../../components";
import type { Person } from "@pixelvault/contracts";

export function DevicePreview({ person }: { person: Person }) {
  const video = useRef<HTMLVideoElement>(null);
  const media = useRef<{
    audio: MediaStream | null;
    video: MediaStream | null;
  }>({ audio: null, video: null });
  const audio = useRef<AudioContext | null>(null);
  const frame = useRef(0);
  const generation = useRef(0);
  const mounted = useRef(true);
  const pendingRef = useRef(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [mic, setMic] = useState(false);
  const [pending, setPending] = useState<"audio" | "video" | null>(null);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  function stop(kind: "audio" | "video") {
    media.current[kind]?.getTracks().forEach((track) => track.stop());
    media.current[kind] = null;
    if (kind === "audio") {
      cancelAnimationFrame(frame.current);
      if (audio.current) void audio.current.close().catch(() => {});
      audio.current = null;
      if (mounted.current) {
        setMic(false);
        setLevel(0);
      }
    } else if (mounted.current) setVideoStream(null);
  }
  function stopAll() {
    generation.current += 1;
    pendingRef.current = false;
    stop("audio");
    stop("video");
    if (mounted.current) setPending(null);
  }
  useEffect(() => {
    mounted.current = true;
    const hide = () => {
      if (document.hidden) {
        stopAll();
        setNote(
          "Preview stopped while this tab was hidden. Start it again when you’re ready.",
        );
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      mounted.current = false;
      stopAll();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.srcObject = videoStream;
    if (videoStream)
      void element.play().catch(() => {
        if (mounted.current && media.current.video === videoStream) {
          setError("The camera preview could not play. Stop it and try again.");
          stop("video");
        }
      });
    return () => {
      element.srcObject = null;
    };
  }, [videoStream]);
  async function toggle(kind: "audio" | "video") {
    if (pendingRef.current) return;
    setError("");
    setNote("");
    if (media.current[kind]) {
      stop(kind);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Device preview is unavailable here. Use HTTPS or localhost in a supported browser, or enter with text chat.",
      );
      return;
    }
    const request = generation.current;
    pendingRef.current = true;
    setPending(kind);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "video"
          ? { video: { facingMode: "user" }, audio: false }
          : {
              audio: { echoCancellation: true, noiseSuppression: true },
              video: false,
            },
      );
      if (!mounted.current || request !== generation.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      media.current[kind] = stream;
      stream.getTracks().forEach((track) =>
        track.addEventListener(
          "ended",
          () => {
            if (mounted.current && media.current[kind] === stream) {
              stop(kind);
              setNote(
                "The device stopped. You can start a new preview or continue with text chat.",
              );
            }
          },
          { once: true },
        ),
      );
      if (kind === "video") setVideoStream(stream);
      else {
        setMic(true);
        const context = new AudioContext();
        audio.current = context;
        await context.resume();
        if (!mounted.current || request !== generation.current) {
          stream.getTracks().forEach((track) => track.stop());
          void context.close().catch(() => {});
          return;
        }
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        const input = context.createMediaStreamSource(stream);
        input.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        let last = 0;
        const measure = (time: number) => {
          if (!mounted.current || media.current.audio !== stream) return;
          if (time - last > 80) {
            analyser.getByteTimeDomainData(data);
            const rms = Math.sqrt(
              data.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) /
                data.length,
            );
            setLevel(Math.min(100, Math.round(rms * 500)));
            last = time;
          }
          frame.current = requestAnimationFrame(measure);
        };
        frame.current = requestAnimationFrame(measure);
      }
    } catch (problem) {
      if (!mounted.current || request !== generation.current) return;
      stop(kind);
      const name = problem instanceof DOMException ? problem.name : "";
      setError(
        name === "NotAllowedError"
          ? "Permission was declined. You can update this site’s device permissions or enter with text chat."
          : name === "NotFoundError"
            ? "No matching device was found. Connect a microphone or camera, or continue with text chat."
            : name === "NotReadableError"
              ? "The device is in use or unavailable. Close other apps using it and try again."
              : "The preview could not start. Try again or continue with text chat.",
      );
    } finally {
      if (mounted.current && request === generation.current) {
        pendingRef.current = false;
        setPending(null);
      }
    }
  }
  return (
    <section aria-labelledby="preview-title" className="space-y-4">
      <div>
        <h2 id="preview-title" className="text-lg font-extrabold">
          Check your setup
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Optional local preview. Nothing is recorded or shared with the other
          person.
        </p>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted">
        {videoStream ? (
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            className="h-full w-full -scale-x-100 object-cover"
            aria-label="Your local camera preview"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <MemberAvatar
              name={person.display_name}
              avatarKey={person.avatar_key}
              photoUrl={person.photo_url}
              reputation={person.reputation}
              size={80}
            />
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <CameraOff size={16} />
              Camera is off
            </span>
          </div>
        )}
        <span className="absolute bottom-3 left-3 rounded-lg bg-background/95 px-2 py-1 text-[10px] text-foreground">
          Only you can see this
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={videoStream ? "secondary" : "outline"}
          disabled={!!pending}
          aria-pressed={!!videoStream}
          aria-label={videoStream ? "Stop camera" : "Preview camera"}
          onClick={() => void toggle("video")}
        >
          <Video size={16} />
          {pending === "video"
            ? "Waiting…"
            : videoStream
              ? "Stop camera"
              : "Camera"}
        </Button>
        <Button
          variant={mic ? "secondary" : "outline"}
          disabled={!!pending}
          aria-pressed={mic}
          aria-label={mic ? "Stop microphone" : "Test microphone"}
          onClick={() => void toggle("audio")}
        >
          {mic ? <Mic size={16} /> : <MicOff size={16} />}
          {pending === "audio" ? "Waiting…" : mic ? "Stop mic" : "Test mic"}
        </Button>
      </div>
      {mic && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>Microphone input</span>
            <span className="text-muted-foreground">
              {level > 5 ? "Input detected" : "Speak to check your level"}
            </span>
          </div>
          <meter
            min={0}
            max={100}
            value={level}
            aria-label="Microphone input level"
            className="h-3 w-full accent-primary"
          />
        </div>
      )}
      {(videoStream || mic || pending) && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            stopAll();
            setNote("Preview stopped. Your devices are off.");
          }}
        >
          Stop all preview devices
        </Button>
      )}
      {error && (
        <p role="alert" className="text-xs leading-relaxed text-destructive">
          {error}
        </p>
      )}
      {note && (
        <p
          role="status"
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {note}
        </p>
      )}
      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck size={15} className="mt-0.5 shrink-0" />
        Entering the room stops this preview. Text chat is available; private
        live audio/video is not configured yet.
      </p>
    </section>
  );
}
