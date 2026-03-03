"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PRACTICE_QUESTION } from "@/lib/questions";

type RecordingState = "idle" | "recording" | "done";

export default function PracticePage() {
  const router = useRouter();
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [timeLeft, setTimeLeft] = useState(60);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [streamLoading, setStreamLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const permissionsGranted = sessionStorage.getItem("hotseat_permissions_granted");
    if (!permissionsGranted) {
      router.push("/setup");
      return;
    }

    // Re-acquire camera stream for this page
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        setStream(s);
        setStreamLoading(false);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => router.push("/setup"));
  }, [router]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordingState("done");
  }, []);

  const startRecording = useCallback(() => {
    if (!stream) return;

    const chunks: BlobPart[] = [];
    let mr: MediaRecorder;
    try {
      // Let the browser choose the codec — don't force audio-only mimeType
      // on a video+audio stream, which Chrome rejects
      mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mr.onstop = () => {
        setRecordingState("done");
      };
      mediaRecorderRef.current = mr;
      mr.start(1000);
    } catch (err) {
      console.error("MediaRecorder failed:", err);
      setRecordingError(`Recording error: ${String(err)}. Try Chrome and allow mic/camera access.`);
      return;
    }
    setRecordingError(null);
    setRecordingState("recording");
    setTimeLeft(60);

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stream, stopRecording]);

  const handleContinue = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    router.push("/assessment");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-slate-400 text-sm font-medium tracking-widest uppercase">HotSeat</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-950/60 border border-yellow-700 rounded-full text-yellow-400 text-xs font-medium mb-4">
          PRACTICE — Not Graded
        </div>
        <h1 className="text-3xl font-bold text-white">Microphone & Camera Test</h1>
        <p className="text-slate-400 mt-2">This practice question is ungraded. Use it to test your setup.</p>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        {/* Video preview */}
        <div className="bg-[#111827] border border-slate-700 rounded-xl overflow-hidden">
          <div className="aspect-video bg-[#0d1420] relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Recording indicator */}
            {recordingState === "recording" && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 recording-dot"></div>
                <span className="text-white text-xs font-medium">RECORDING</span>
              </div>
            )}
            {/* Timer */}
            {recordingState === "recording" && (
              <div className={`absolute top-4 right-4 bg-black/70 px-4 py-2 rounded-full ${timeLeft <= 10 ? "timer-urgent text-red-400" : "text-white"} font-mono text-lg font-bold`}>
                {String(timeLeft).padStart(2, "0")}s
              </div>
            )}
          </div>
        </div>

        {/* Question card */}
        <div className="bg-[#111827] border border-slate-700 rounded-xl p-6">
          <div className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Practice Question</div>
          <p className="text-white text-xl leading-relaxed">{PRACTICE_QUESTION.text}</p>
        </div>

        {/* Error */}
        {recordingError && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
            ⚠ {recordingError}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-4">
          {recordingState === "idle" && (
            <button
              onClick={startRecording}
              disabled={!stream || streamLoading}
              className="flex-1 py-4 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              {streamLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Initializing camera...
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-full bg-white"></div>
                  Start Speaking
                </>
              )}
            </button>
          )}

          {recordingState === "recording" && (
            <button
              onClick={stopRecording}
              className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition"
            >
              Stop Recording
            </button>
          )}

          {recordingState === "done" && (
            <button
              onClick={handleContinue}
              className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-lg"
            >
              Begin Real Assessment →
            </button>
          )}
        </div>

        {recordingState === "done" && (
          <p className="text-center text-emerald-400 text-sm">
            ✓ Practice complete. Click above to start the real assessment. Once you begin, you cannot stop or go back.
          </p>
        )}
      </div>
    </main>
  );
}
