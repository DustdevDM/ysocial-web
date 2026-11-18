import { useCallback, useEffect, useRef, useState } from "react";
import { Slider } from "@base-ui/react/slider";
import { AudioVisualizer, LiveAudioVisualizer } from "react-audio-visualize";
import { LoaderCircle, Pause, Play, Square } from "lucide-react";
import { ApiError, retryRequest } from "@/lib/api";
import { IconButton } from "@/components/ui/icon-button";

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

type Take =
  | { kind: "recording"; seconds: number; recording: MediaRecorder }
  | { kind: "uploading"; seconds: number; recording: MediaRecorder; blob: Blob }
  | {
      kind: "ready";
      url: string | null;
      duration: number;
      recording?: MediaRecorder;
      blob: Blob | null;
      waveform?: number[];
    };

export function VoiceTake({
  state,
  onStop,
  onRequestSource,
  publishedLabel,
  pending = false,
  downloadFailed = false,
}: {
  state: Take;
  onStop?: () => void;
  onRequestSource?: () => void;
  publishedLabel?: string;
  pending?: boolean;
  downloadFailed?: boolean;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [waitingToPlay, setWaitingToPlay] = useState(false);
  const [position, setPosition] = useState(0);
  const [localDuration, setLocalDuration] = useState<number>();
  const [error, setError] = useState("");
  const ready = state.kind === "ready";
  const duration = ready ? (localDuration ?? state.duration) : 0;

  const source = ready ? state.url : null;
  const loadingPlayback = waitingToPlay && !downloadFailed;
  const blob = ready ? state.blob : null;
  const peaks = ready ? state.waveform : undefined;
  const waveformSource = peaks ?? blob;
  const [waveformResult, setWaveformResult] = useState<{
    source: Blob | number[];
    painted: boolean;
  } | null>(null);
  const onWaveformRender = useCallback(
    (painted: boolean) => {
      if (waveformSource)
        setWaveformResult({ source: waveformSource, painted });
    },
    [waveformSource],
  );
  const painted =
    waveformResult?.source === waveformSource ? waveformResult.painted : null;
  const showWaveform = ready && painted === true;
  const hideLiveWaveform = ready && painted !== null;

  function playAudio(player: HTMLAudioElement) {
    void player.play().catch((failure: unknown) => {
      if (failure instanceof DOMException && failure.name === "AbortError")
        return;
      setWaitingToPlay(false);
      setError("Couldn't start playback. Press play to try again.");
    });
  }

  useEffect(() => {
    const player = audio.current;
    if (loadingPlayback && source && player?.paused) playAudio(player);
  }, [loadingPlayback, source]);

  useEffect(() => {
    const player = audio.current;
    if (!playing || !player) return;
    let frame: number;
    let lastUpdate = -Infinity;

    function trackPlayback(now: number) {
      if (
        player &&
        !player.paused &&
        pendingSeek.current === null &&
        now - lastUpdate >= 33
      ) {
        setPosition(player.currentTime);
        lastUpdate = now;
      }
      frame = requestAnimationFrame(trackPlayback);
    }

    frame = requestAnimationFrame(trackPlayback);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  return (
    <div
      role={publishedLabel ? "group" : undefined}
      aria-label={
        publishedLabel ?? (ready ? "Voice message preview" : undefined)
      }
      className="min-w-0 flex-1"
    >
      {ready && (
        <audio
          ref={audio}
          src={source ?? undefined}
          preload={publishedLabel ? "none" : "auto"}
          onDurationChange={(event) => {
            const value = event.currentTarget.duration;
            if (Number.isFinite(value) && value > 0) setLocalDuration(value);
          }}
          onLoadedMetadata={(event) => {
            if (pendingSeek.current === null) return;
            const player = event.currentTarget;
            const requested = pendingSeek.current;
            pendingSeek.current = null;
            player.currentTime = Number.isFinite(player.duration)
              ? Math.min(requested, player.duration)
              : requested;
            setPosition(player.currentTime);
          }}
          onTimeUpdate={(event) => {
            if (pendingSeek.current === null)
              setPosition(event.currentTarget.currentTime);
          }}
          onPlaying={() => {
            setPlaying(true);
            setWaitingToPlay(false);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => {
            if (!source) return;
            setWaitingToPlay(false);
            setError("Couldn't play this audio file.");
          }}
        />
      )}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex shrink-0 items-center">
          {state.kind === "recording" ? (
            <IconButton
              label="Stop recording"
              type="button"
              size="icon-sm"
              variant="destructive"
              disabled={state.seconds < 2}
              className="rounded-full border-destructive/15"
              onClick={onStop}
            >
              <Square className="size-3.5 fill-current" aria-hidden="true" />
            </IconButton>
          ) : state.kind === "uploading" ? (
            <div className="flex size-8 items-center justify-center rounded-full bg-foreground/10 text-muted-foreground pointer-coarse:size-9">
              <LoaderCircle
                className="size-4 motion-safe:animate-spin"
                aria-hidden="true"
              />
            </div>
          ) : (
            <IconButton
              label={
                loadingPlayback
                  ? "Cancel loading voice message"
                  : `${playing ? "Pause" : "Play"} voice ${publishedLabel ? "message" : "preview"}`
              }
              type="button"
              variant="secondary"
              size="icon-sm"
              disabled={pending || downloadFailed}
              className="rounded-full bg-foreground/10 text-foreground hover:bg-foreground/15"
              onClick={() => {
                const player = audio.current;
                if (!player) return;
                if (loadingPlayback || !player.paused) {
                  player.pause();
                  setWaitingToPlay(false);
                  return;
                }
                setError("");
                if (source) playAudio(player);
                else {
                  setWaitingToPlay(true);
                  onRequestSource?.();
                }
              }}
            >
              {loadingPlayback ? (
                <LoaderCircle
                  className="size-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : playing ? (
                <Pause className="fill-current" />
              ) : (
                <Play className="fill-current" />
              )}
            </IconButton>
          )}
        </div>
        <div className="relative min-w-0 flex-1">
          <div
            aria-hidden="true"
            className="relative h-8 overflow-hidden [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full"
          >
            {state.recording && (
              <div
                className="absolute inset-0 text-destructive transition-[clip-path,opacity] duration-500 motion-reduce:transition-none"
                style={{
                  clipPath: hideLiveWaveform ? "inset(0 0 0 100%)" : "inset(0)",
                  opacity: hideLiveWaveform ? 0 : 1,
                }}
              >
                <LiveAudioVisualizer
                  mediaRecorder={state.recording}
                  width={240}
                  height={32}
                  barWidth={2}
                  gap={3}
                  fftSize={512}
                  smoothingTimeConstant={0.85}
                  barColor="#f05b64"
                />
              </div>
            )}
            {ready && (!state.recording || painted === false) && (
              <div
                className="absolute inset-x-0 top-1/2 h-0.5 rounded-full bg-muted-foreground/30 transition-opacity duration-500 motion-reduce:transition-none"
                style={{ opacity: showWaveform ? 0 : 1 }}
              >
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{
                    width: `${duration ? Math.min(100, (position / duration) * 100) : 0}%`,
                  }}
                />
              </div>
            )}
            <div
              data-waveform={showWaveform ? "visible" : "hidden"}
              className="absolute inset-0 transition-[clip-path,opacity,scale] duration-500 ease-out motion-reduce:transition-none"
              style={{
                clipPath: showWaveform ? "inset(0)" : "inset(0 100% 0 0)",
                opacity: showWaveform ? 1 : 0,
                scale: showWaveform ? "1" : "1 0.75",
              }}
            >
              {waveformSource && (
                <AudioVisualizer
                  blob={blob ?? undefined}
                  peaks={peaks}
                  duration={duration}
                  onWaveformRender={onWaveformRender}
                  width={240}
                  height={32}
                  barWidth={2}
                  gap={3}
                  barColor="#22c55e99"
                  barPlayedColor="#22c55e"
                  currentTime={position}
                />
              )}
            </div>
          </div>
          {ready && (
            <Slider.Root
              className="absolute inset-0"
              min={0}
              max={duration || 1}
              step={0.01}
              value={Math.min(position, duration || 1)}
              disabled={pending || downloadFailed || !duration}
              thumbAlignment="center"
              onValueChange={(value) => {
                const player = audio.current;
                if (
                  player &&
                  player.readyState >= HTMLMediaElement.HAVE_METADATA
                ) {
                  player.currentTime = value;
                } else {
                  pendingSeek.current = value;
                  onRequestSource?.();
                }
                setPosition(value);
              }}
            >
              <Slider.Control className="relative flex h-full w-full cursor-pointer touch-none items-center rounded-sm focus-within:ring-2 focus-within:ring-ring/50">
                <Slider.Track className="relative h-full w-full" />
                <Slider.Thumb
                  aria-label={
                    publishedLabel ? "Seek voice message" : "Seek voice preview"
                  }
                  getAriaValueText={(value) => formatTime(Number(value))}
                  className="size-px opacity-0"
                />
              </Slider.Control>
            </Slider.Root>
          )}
        </div>
        <div className="w-18 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
          <span role="status" className="sr-only">
            {loadingPlayback
              ? "Loading voice message"
              : ready
                ? publishedLabel
                  ? ""
                  : "Voice message ready"
                : state.kind === "uploading"
                  ? "Processing"
                  : "Recording"}
          </span>
          {ready ? (
            <span>
              {formatTime(position)} / {formatTime(duration)}
            </span>
          ) : (
            <span role="timer">{formatTime(state.seconds)}</span>
          )}
        </div>
      </div>
      {(error || downloadFailed) && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error || "This voice message is unavailable."}
        </p>
      )}
    </div>
  );
}

async function readVoiceClip(response: Response) {
  const clip = await response.blob();
  if (clip.size && clip.type.startsWith("audio/")) return clip;

  // The voice API serves AAC in an MP4 container. Some proxies serve those
  // same bytes as generic binary; verify the file signature before relabeling.
  const boxType = await clip.slice(4, 8).text();
  if (boxType === "ftyp") return clip.slice(0, clip.size, "audio/mp4");
  throw new ApiError(502, "unexpected_response");
}

export function PublishedVoicePlayer({
  url,
  durationMs,
  peaks,
  pending,
}: {
  url: string;
  durationMs: number;
  peaks?: number[];
  pending: boolean;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const requestSource = useRef<(() => void) | null>(null);
  const [waveform, setWaveform] = useState<{
    url: string;
    blob: Blob;
    objectUrl: string;
  } | null>(null);

  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  useEffect(() => {
    const element = surface.current;
    if (!element || pending) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;

    async function loadWaveform() {
      try {
        const blob = await retryRequest(
          async () => {
            const timeout = AbortSignal.timeout(15_000);
            const signal = AbortSignal.any([controller.signal, timeout]);
            try {
              const response = await fetch(url, { signal });
              if (!response.ok)
                throw new ApiError(response.status, "voice_audio_unavailable");
              return await readVoiceClip(response);
            } catch (error) {
              controller.signal.throwIfAborted();
              if (timeout.aborted) throw new ApiError(408, "request_timeout");
              if (error instanceof TypeError)
                throw new ApiError(0, "network_unavailable");
              throw error;
            }
          },
          {
            context: "load voice message",
            signal: controller.signal,
            maxDelayMs: 3000,
          },
        );
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setFailedUrl(null);
        setWaveform({ url, blob, objectUrl });
      } catch {
        if (!controller.signal.aborted) setFailedUrl(url);
      }
    }

    let started = false;
    function start() {
      if (started || controller.signal.aborted) return;
      started = true;
      observer?.disconnect();
      void loadWaveform();
    }

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              if (entry?.isIntersecting) start();
            },
            { rootMargin: "120px" },
          );
    requestSource.current = start;
    if (observer) observer.observe(element);
    else start();
    return () => {
      requestSource.current = null;
      observer?.disconnect();
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, pending]);

  return (
    <div
      ref={surface}
      className="mt-2 min-w-0 rounded-xl bg-muted px-2 py-1"
      onClick={(event) => event.stopPropagation()}
    >
      <VoiceTake
        key={url}
        pending={pending}
        downloadFailed={failedUrl === url}
        onRequestSource={() => requestSource.current?.()}
        publishedLabel={`Voice message, ${Math.ceil(durationMs / 1000)} seconds`}
        state={{
          kind: "ready",
          url: waveform?.url === url ? waveform.objectUrl : null,
          duration: durationMs / 1000,
          waveform: peaks,
          blob: waveform?.url === url ? waveform.blob : null,
        }}
      />
    </div>
  );
}
