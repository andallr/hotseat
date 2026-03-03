"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState("");

  const handleBegin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!studentId.trim() || !courseId.trim()) {
      setError("Both fields are required.");
      return;
    }

    // Store in sessionStorage for use across pages
    sessionStorage.setItem("hotseat_student_id", studentId.trim());
    sessionStorage.setItem("hotseat_course_id", courseId.trim());
    sessionStorage.setItem("hotseat_started_at", new Date().toISOString());

    router.push("/setup");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <h1 className="text-4xl font-bold tracking-tight text-white">HotSeat</h1>
        </div>
        <p className="text-slate-400 text-lg max-w-md">
          Verbal Formative Assessment. Answer with your voice. No AI assistance.
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-md bg-[#111827] border border-slate-700 rounded-xl p-8 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-6">Begin Your Assessment</h2>

        <form onSubmit={handleBegin} className="space-y-5">
          <div>
            <label htmlFor="studentId" className="block text-sm font-medium text-slate-300 mb-2">
              Student ID
            </label>
            <input
              id="studentId"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. S-12345"
              className="w-full px-4 py-3 bg-[#1f2937] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="courseId" className="block text-sm font-medium text-slate-300 mb-2">
              Course ID
            </label>
            <input
              id="courseId"
              type="text"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="e.g. MED-101"
              className="w-full px-4 py-3 bg-[#1f2937] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#111827]"
          >
            Begin Assessment →
          </button>
        </form>
      </div>

      {/* Info Footer */}
      <div className="mt-8 max-w-md text-center text-slate-500 text-sm">
        <p>
          This assessment requires camera and microphone access. Ensure you are in a quiet location before proceeding.
        </p>
      </div>
    </main>
  );
}
