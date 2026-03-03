"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type PermissionState = "idle" | "requesting" | "granted" | "denied";

export default function SetupPage() {
  const router = useRouter();
  const [cameraState, setCameraState] = useState<PermissionState>("idle");
  const [micState, setMicState] = useState<PermissionState>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Redirect if no session
  useEffect(() => {
    const studentId = sessionStorage.getItem("hotseat_student_id");
    if (!studentId) {
      router.push("/");
    }
  }, [router]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  const requestPermissions = async () => {
    setCameraState("requesting");
    setMicState("requesting");

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      setStream(mediaStream);
      setCameraState("granted");
      setMicState("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Permission error:", err);
      setCameraState("denied");
      setMicState("denied");
    }
  };

  const handleContinue = () => {
    // Don't stop stream yet — it will carry through to practice
    // Store stream availability flag
    sessionStorage.setItem("hotseat_permissions_granted", "true");
    router.push("/practice");
  };

  const allGranted = cameraState === "granted" && micState === "granted";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-slate-400 text-sm font-medium tracking-widest uppercase">HotSeat</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Device Setup</h1>
        <p className="text-slate-400 max-w-lg">
          Before beginning, we need to verify your camera and microphone are working.
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        {/* Camera Preview */}
        <div className="bg-[#111827] border border-slate-700 rounded-xl overflow-hidden">
          <div className="aspect-video bg-[#0d1420] relative flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${stream ? "opacity-100" : "opacity-0"}`}
            />
            {!stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                <svg className="w-16 h-16 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                  />
                </svg>
                <p className="text-sm">Camera preview will appear here</p>
              </div>
            )}
          </div>

          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-6">
                <StatusIndicator label="Camera" state={cameraState} />
                <StatusIndicator label="Microphone" state={micState} />
              </div>
              {!stream && (
                <button
                  onClick={requestPermissions}
                  disabled={cameraState === "requesting"}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition text-sm"
                >
                  {cameraState === "requesting" ? "Requesting..." : "Grant Permissions"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-[#111827] border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Assessment Instructions</h2>
          <ul className="space-y-3 text-slate-300 text-sm">
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold mt-0.5">1.</span>
              <span>You will complete a short <strong className="text-white">practice question</strong> (ungraded) to test your setup.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold mt-0.5">2.</span>
              <span>The real assessment has <strong className="text-white">5 questions</strong>, each with a <strong className="text-white">60-second timer</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold mt-0.5">3.</span>
              <span>Answer each question verbally. The timer will auto-advance. <strong className="text-white">You cannot go back.</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold mt-0.5">4.</span>
              <span>Speak clearly into your microphone. Responses are transcribed automatically.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold mt-0.5">5.</span>
              <span>Do <strong className="text-white">not</strong> switch browser tabs during the assessment. Tab switches are logged.</span>
            </li>
          </ul>
        </div>

        {/* Denied state */}
        {(cameraState === "denied" || micState === "denied") && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
            <strong>Permission denied.</strong> Please allow camera and microphone access in your browser settings and refresh this page.
          </div>
        )}

        {/* Continue button */}
        {allGranted && (
          <button
            onClick={handleContinue}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-lg tracking-wide"
          >
            Continue to Practice Question →
          </button>
        )}
      </div>
    </main>
  );
}

function StatusIndicator({ label, state }: { label: string; state: PermissionState }) {
  const config = {
    idle: { color: "bg-slate-600", text: "text-slate-400", label: "Not checked" },
    requesting: { color: "bg-yellow-400", text: "text-yellow-400", label: "Checking..." },
    granted: { color: "bg-emerald-400", text: "text-emerald-400", label: "Ready" },
    denied: { color: "bg-red-500", text: "text-red-400", label: "Denied" },
  }[state];

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${config.color}`}></div>
      <span className={`text-sm ${config.text}`}>
        {label}: {config.label}
      </span>
    </div>
  );
}
