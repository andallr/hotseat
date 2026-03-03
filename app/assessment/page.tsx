"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ASSESSMENT_QUESTIONS } from "@/lib/questions";

type Phase =
  | "waiting"       // Before first question starts
  | "recording"     // Active question + timer
  | "processing"    // Transcribing + scoring
  | "transitioning" // Brief pause between questions
  | "done";         // All questions complete

interface QuestionResult {
  questionId: number;
  question: string;
  contentArea: string;
  transcription: string;
  score: string;
  struggle: string | null;
  notes: string;
}

export default function AssessmentPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("waiting");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [processingStatus, setProcessingStatus] = useState("");
  const [tabSwitches, setTabSwitches] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tabSwitchesRef = useRef(0);
  const processingRef = useRef(false);

  // Redirect check
  useEffect(() => {
    const permissionsGranted = sessionStorage.getItem("hotseat_permissions_granted");
    if (!permissionsGranted) {
      router.push("/setup");
    }
  }, [router]);

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && phase === "recording") {
        tabSwitchesRef.current += 1;
        setTabSwitches(tabSwitchesRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [phase]);

  // Acquire camera
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => router.push("/setup"));

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const baseType = audioBlob.type.split(";")[0].toLowerCase();
    const ext = baseType.includes("mp4") ? "mp4" : "webm";
    const formData = new FormData();
    formData.append("audio", audioBlob, `audio.${ext}`);

    const resp = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Transcription failed");
    }

    const data = await resp.json();
    return data.text || "";
  };

  const scoreAnswer = async (
    question: string,
    contentArea: string,
    transcription: string
  ) => {
    const resp = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, contentArea, transcription }),
    });

    if (!resp.ok) {
      throw new Error("Scoring failed");
    }

    return resp.json();
  };

  const processRecording = useCallback(
    async (audioBlob: Blob, qIndex: number) => {
      if (processingRef.current) return;
      processingRef.current = true;

      const q = ASSESSMENT_QUESTIONS[qIndex];
      setPhase("processing");
      setProcessingStatus("Transcribing your response...");

      let transcription = "";
      let scoreData = {
        score: "no_response",
        content_area: q.contentArea,
        struggle: "Processing error",
        notes: "Unable to process response.",
      };

      try {
        transcription = await transcribeAudio(audioBlob);
        setProcessingStatus("Scoring your response...");
        scoreData = await scoreAnswer(q.text, q.contentArea, transcription);
      } catch (err) {
        console.error("Processing error:", err);
        setProcessingStatus("Error processing response. Moving on...");
        transcription = "[Processing error]";
      }

      const result: QuestionResult = {
        questionId: q.id,
        question: q.text,
        contentArea: q.contentArea,
        transcription,
        score: scoreData.score,
        struggle: scoreData.struggle,
        notes: scoreData.notes,
      };

      setResults((prev) => {
        const updated = [...prev, result];
        return updated;
      });

      processingRef.current = false;

      const nextIndex = qIndex + 1;
      if (nextIndex >= ASSESSMENT_QUESTIONS.length) {
        // Store results and redirect
        const allResults = [...results, result];
        sessionStorage.setItem("hotseat_results", JSON.stringify(allResults));
        sessionStorage.setItem("hotseat_tab_switches", String(tabSwitchesRef.current));
        setPhase("done");

        // Small delay then redirect
        setTimeout(() => {
          // Save to sessionStorage and go to complete
          const currentResults = allResults;
          sessionStorage.setItem("hotseat_results", JSON.stringify(currentResults));
          router.push("/complete");
        }, 1500);
      } else {
        setPhase("transitioning");
        setTimeout(() => {
          setQuestionIndex(nextIndex);
          startQuestion(nextIndex);
        }, 2000);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results, router]
  );

  const startQuestion = useCallback(
    (qIndex: number) => {
      if (!stream) return;

      chunksRef.current = [];
      setTimeLeft(60);
      setPhase("recording");

      let mr: MediaRecorder;
      try {
        mr = new MediaRecorder(stream);
      } catch (err) {
        console.error("MediaRecorder init failed:", err);
        return;
      }
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mr.mimeType || "video/webm" });
        processRecording(audioBlob, qIndex);
      };

      try {
        mr.start(1000);
      } catch (err) {
        console.error("MediaRecorder.start() failed:", err);
        setPhase("waiting");
        return;
      }

      // Timer
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            if (mr.state !== "inactive") {
              mr.stop();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stream, processRecording]
  );

  const handleBeginAssessment = () => {
    startQuestion(0);
  };

  const currentQuestion = ASSESSMENT_QUESTIONS[questionIndex];
  const progress = ((questionIndex) / ASSESSMENT_QUESTIONS.length) * 100;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="w-full max-w-3xl mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-slate-400 text-sm font-medium tracking-widest uppercase">HotSeat</span>
          </div>
          {phase === "recording" && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <div className="w-2 h-2 rounded-full bg-red-500 recording-dot"></div>
              LIVE ASSESSMENT
            </div>
          )}
          {tabSwitches > 0 && (
            <div className="text-yellow-400 text-xs bg-yellow-950/50 border border-yellow-800 px-2 py-1 rounded">
              ⚠ Tab switches: {tabSwitches}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Question {questionIndex + 1} of {ASSESSMENT_QUESTIONS.length}</span>
          <span>{phase === "recording" ? "Recording" : phase === "processing" ? "Processing" : ""}</span>
        </div>
      </div>

      <div className="w-full max-w-3xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Camera feed */}
          <div className="md:col-span-2">
            <div className="bg-[#111827] border border-slate-700 rounded-xl overflow-hidden">
              <div className="aspect-[4/3] bg-[#0d1420] relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {phase === "recording" && (
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 px-2 py-1 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-red-500 recording-dot"></div>
                    <span className="text-white text-xs font-medium">REC</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Question + Timer */}
          <div className="md:col-span-3 flex flex-col gap-4">
            {/* Timer */}
            {phase === "recording" && (
              <div className={`text-center ${timeLeft <= 10 ? "timer-urgent" : ""}`}>
                <div className={`text-7xl font-mono font-bold ${timeLeft <= 10 ? "text-red-400" : "text-white"}`}>
                  {String(timeLeft).padStart(2, "0")}
                </div>
                <div className={`text-sm mt-1 ${timeLeft <= 10 ? "text-red-400" : "text-slate-400"}`}>
                  seconds remaining
                </div>
                {/* Timer progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${timeLeft <= 10 ? "bg-red-500" : "bg-blue-500"}`}
                    style={{ width: `${(timeLeft / 60) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Question card */}
            <div className="bg-[#111827] border border-slate-700 rounded-xl p-6 flex-1">
              <div className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-2">
                {currentQuestion?.contentArea}
              </div>
              <p className="text-white text-xl leading-relaxed font-medium">
                {currentQuestion?.text}
              </p>
            </div>

            {/* Status / Actions */}
            {phase === "waiting" && (
              <button
                onClick={handleBeginAssessment}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition text-lg"
              >
                🎙 Begin Assessment — No Stopping
              </button>
            )}

            {phase === "processing" && (
              <div className="bg-[#111827] border border-slate-700 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-3 text-blue-400">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium">{processingStatus}</span>
                </div>
              </div>
            )}

            {phase === "transitioning" && (
              <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-4 text-center text-emerald-400 text-sm">
                ✓ Response recorded. Preparing next question...
              </div>
            )}

            {phase === "done" && (
              <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-4 text-center text-emerald-400">
                ✓ Assessment complete. Generating your report...
              </div>
            )}
          </div>
        </div>

        {/* Instructions footer */}
        {phase === "recording" && (
          <p className="text-center text-slate-500 text-sm">
            Speak clearly. The timer will automatically advance to the next question when it reaches zero.
          </p>
        )}
        {phase === "waiting" && (
          <p className="text-center text-yellow-400/80 text-sm">
            ⚠ Once you click Begin, the assessment starts immediately. You cannot pause or go back.
          </p>
        )}
      </div>
    </main>
  );
}
