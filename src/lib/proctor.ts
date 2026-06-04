// Proctoring hook: fullscreen lock + (optional) camera + suspicious event logging.
import { useEffect, useRef, useState, useCallback } from "react";

export interface ProctorEvent {
  at: string;
  type:
    | "started"
    | "fullscreen_enter"
    | "fullscreen_exit"
    | "tab_blur"
    | "tab_focus"
    | "visibility_hidden"
    | "visibility_visible"
    | "copy"
    | "paste"
    | "context_menu"
    | "key_meta"
    | "camera_enabled"
    | "camera_denied"
    | "camera_ended"
    | "multiple_faces"
    | "submitted";
  detail?: string;
}

export interface UseProctorOpts {
  enabled: boolean;
  camera: boolean;
}

export function useProctor({ enabled, camera }: UseProctorOpts) {
  const [events, setEvents] = useState<ProctorEvent[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const log = useCallback((type: ProctorEvent["type"], detail?: string) => {
    setEvents((prev) => [...prev, { at: new Date().toISOString(), type, detail }]);
  }, []);

  // request fullscreen + camera + listeners
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const root = document.documentElement;
    const enterFs = async () => {
      try {
        if (!document.fullscreenElement && root.requestFullscreen) {
          await root.requestFullscreen();
          log("fullscreen_enter");
        }
      } catch (e: any) {
        log("fullscreen_exit", "request_failed:" + (e?.message ?? ""));
      }
    };
    enterFs();
    log("started");

    if (camera && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 320, height: 240 }, audio: false })
        .then((stream) => {
          if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setCameraReady(true);
          log("camera_enabled");
          stream.getVideoTracks()[0]?.addEventListener("ended", () => log("camera_ended"));
        })
        .catch((e) => {
          setCameraError(e?.message ?? "Camera denied");
          log("camera_denied", e?.message);
        });
    }

    const onVis = () => {
      if (document.hidden) log("visibility_hidden");
      else log("visibility_visible");
    };
    const onBlur = () => log("tab_blur");
    const onFocus = () => log("tab_focus");
    const onFs = () => {
      if (!document.fullscreenElement) {
        log("fullscreen_exit");
        // re-prompt
        setTimeout(() => { root.requestFullscreen?.().catch(() => {}); }, 100);
      }
    };
    const onCopy = () => log("copy");
    const onPaste = () => log("paste");
    const onCtx = (e: MouseEvent) => { e.preventDefault(); log("context_menu"); };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        if (["c", "v", "x", "p", "u", "s", "Tab"].includes(e.key)) log("key_meta", e.key);
      }
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onCtx);
    document.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("keydown", onKey);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [enabled, camera, log]);

  return { events, log, videoRef, cameraReady, cameraError };
}

export function summarizeEvents(events: ProctorEvent[]) {
  const suspicious = events.filter((e) =>
    [
      "fullscreen_exit",
      "tab_blur",
      "visibility_hidden",
      "copy",
      "paste",
      "context_menu",
      "key_meta",
      "camera_denied",
      "camera_ended",
      "multiple_faces",
    ].includes(e.type),
  );
  return { total: events.length, suspicious: suspicious.length, events };
}
