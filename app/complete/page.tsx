"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface QuestionResult {
  questionId: number;
  question: string;
  contentArea: string;
  transcription: string;
  score: string;
  struggle: string | null;
  notes: string;
}

const scoreColor = {
  correct: "text-emerald-400",
  partial: "text-yellow-400",
  incorrect: "text-red-400",
  no_response: "text-slate-400",
};

const scoreBg = {
  correct: "bg-emerald-950/60 border-emerald-800",
  partial: "bg-yellow-950/60 border-yellow-800",
  incorrect: "bg-red-950/60 border-red-800",
  no_response: "bg-slate-800/60 border-slate-600",
};

const scoreLabel = {
  correct: "✓ Correct",
  partial: "~ Partial",
  incorrect: "✗ Incorrect",
  no_response: "— No Response",
};

export default function CompletePage() {
  const router = useRouter();
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [tabSwitches, setTabSwitches] = useState(0);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    const savedResults = sessionStorage.getItem("hotseat_results");
    const sid = sessionStorage.getItem("hotseat_student_id") || "";
    const cid = sessionStorage.getItem("hotseat_course_id") || "";
    const started = sessionStorage.getItem("hotseat_started_at") || "";
    const tabs = parseInt(sessionStorage.getItem("hotseat_tab_switches") || "0");

    if (!savedResults || !sid) {
      router.push("/");
      return;
    }

    try {
      setResults(JSON.parse(savedResults));
    } catch {
      router.push("/");
    }

    setStudentId(sid);
    setCourseId(cid);
    setStartedAt(started);
    setTabSwitches(tabs);
  }, [router]);

  const getScoreStats = () => {
    const counts = { correct: 0, partial: 0, incorrect: 0, no_response: 0 };
    results.forEach((r) => {
      const key = r.score as keyof typeof counts;
      if (key in counts) counts[key]++;
    });
    return counts;
  };

  const handleDownloadPDF = async () => {
    setPdfGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const completedAt = new Date().toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "short",
      });
      const startTime = startedAt
        ? new Date(startedAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
        : "Unknown";

      // ── Header ──────────────────────────────────────────────────────────
      doc.setFillColor(10, 14, 20);
      doc.rect(0, 0, pageWidth, 45, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("HotSeat Assessment Report", margin, y + 10);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 200, 220);
      doc.text("Verbal Formative Assessment — Auto-generated", margin, y + 20);

      y = 55;

      // ── Session Info ─────────────────────────────────────────────────────
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Student ID:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(studentId, margin + 28, y);

      doc.setFont("helvetica", "bold");
      doc.text("Course ID:", margin + 85, y);
      doc.setFont("helvetica", "normal");
      doc.text(courseId, margin + 110, y);
      y += 7;

      doc.setFont("helvetica", "bold");
      doc.text("Started:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(startTime, margin + 28, y);
      y += 7;

      doc.setFont("helvetica", "bold");
      doc.text("Completed:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(completedAt, margin + 28, y);
      y += 7;

      if (tabSwitches > 0) {
        doc.setTextColor(180, 80, 20);
        doc.setFont("helvetica", "bold");
        doc.text(`⚠  Tab Switch Alert: ${tabSwitches} tab switch(es) detected during assessment.`, margin, y);
        y += 7;
        doc.setTextColor(30, 30, 30);
      }

      y += 5;

      // ── Score Summary ──────────────────────────────────────────────────
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Score Summary", margin, y);
      y += 8;

      const stats = getScoreStats();
      const total = results.length;

      doc.setFontSize(10);
      const summaryItems = [
        { label: "Correct", value: stats.correct, color: [16, 185, 129] },
        { label: "Partial", value: stats.partial, color: [245, 158, 11] },
        { label: "Incorrect", value: stats.incorrect, color: [239, 68, 68] },
        { label: "No Response", value: stats.no_response, color: [100, 116, 139] },
      ];

      const boxW = contentWidth / 4 - 3;
      summaryItems.forEach((item, i) => {
        const x = margin + i * (boxW + 4);
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.roundedRect(x, y, boxW, 20, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(String(item.value), x + boxW / 2, y + 11, { align: "center" });
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(item.label, x + boxW / 2, y + 17, { align: "center" });
      });

      y += 28;

      // ── Content Area Breakdown ─────────────────────────────────────────
      const contentAreas: Record<string, { correct: number; partial: number; incorrect: number; no_response: number }> = {};
      results.forEach((r) => {
        if (!contentAreas[r.contentArea]) {
          contentAreas[r.contentArea] = { correct: 0, partial: 0, incorrect: 0, no_response: 0 };
        }
        const key = r.score as keyof typeof contentAreas[string];
        if (key in contentAreas[r.contentArea]) {
          contentAreas[r.contentArea][key]++;
        }
      });

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Content Area Breakdown", margin, y);
      y += 8;

      doc.setFontSize(9);
      Object.entries(contentAreas).forEach(([area, scores]) => {
        const struggles = results.filter(
          (r) => r.contentArea === area && r.struggle
        );

        doc.setFillColor(240, 245, 255);
        doc.roundedRect(margin, y, contentWidth, struggles.length > 0 ? 18 : 12, 1, 1, "F");

        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(area, margin + 3, y + 7);

        const scoreText = `C:${scores.correct}  P:${scores.partial}  I:${scores.incorrect}`;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(scoreText, pageWidth - margin - 3, y + 7, { align: "right" });

        if (struggles.length > 0) {
          doc.setTextColor(160, 60, 20);
          doc.setFontSize(8);
          const struggleText = struggles
            .map((r) => r.struggle)
            .filter(Boolean)
            .join("; ");
          const wrapped = doc.splitTextToSize(`Struggles: ${struggleText}`, contentWidth - 6);
          doc.text(wrapped[0], margin + 3, y + 14);
          doc.setFontSize(9);
        }

        y += struggles.length > 0 ? 22 : 16;
      });

      y += 4;

      // ── Per-Question Results ──────────────────────────────────────────
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Question-by-Question Results", margin, y);
      y += 8;

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (y > 240) {
          doc.addPage();
          y = margin;
        }

        // Question header
        doc.setFillColor(20, 30, 50);
        doc.rect(margin, y, contentWidth, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`Q${i + 1}: ${r.contentArea}`, margin + 3, y + 5.5);

        const scoreTextLabel = r.score.charAt(0).toUpperCase() + r.score.slice(1).replace("_", " ");
        doc.text(scoreTextLabel, pageWidth - margin - 3, y + 5.5, { align: "right" });
        y += 11;

        // Question text
        doc.setTextColor(30, 30, 30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        const qLines = doc.splitTextToSize(r.question, contentWidth - 6);
        doc.text(qLines, margin + 3, y);
        y += qLines.length * 5 + 3;

        // Transcription
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 100);
        doc.text("Student Response:", margin + 3, y);
        y += 5;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        const transcriptionText = r.transcription || "(No response recorded)";
        const tLines = doc.splitTextToSize(transcriptionText, contentWidth - 6);
        doc.text(tLines, margin + 3, y);
        y += tLines.length * 4.5 + 3;

        // Notes
        if (r.notes) {
          doc.setFont("helvetica", "italic");
          doc.setTextColor(80, 80, 80);
          const noteLines = doc.splitTextToSize(`Evaluator Notes: ${r.notes}`, contentWidth - 6);
          doc.text(noteLines, margin + 3, y);
          y += noteLines.length * 4.5 + 3;
        }

        // Struggle
        if (r.struggle) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(180, 60, 20);
          const sLines = doc.splitTextToSize(`Concept Gap: ${r.struggle}`, contentWidth - 6);
          doc.text(sLines, margin + 3, y);
          y += sLines.length * 4.5;
        }

        y += 6;
      }

      // ── Footer ─────────────────────────────────────────────────────────
      const footerY = doc.internal.pageSize.getHeight() - 20;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 120);
      doc.text(
        "Note: Verbal responses auto-transcribed via Whisper AI. Recommend instructor review before finalizing grades.",
        pageWidth / 2,
        footerY + 6,
        { align: "center" }
      );
      doc.text(
        `Generated by HotSeat  •  ${total} questions  •  ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        footerY + 11,
        { align: "center" }
      );

      // Save
      const filename = `HotSeat_${studentId}_${courseId}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const stats = getScoreStats();

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-slate-400 text-sm font-medium tracking-widest uppercase">HotSeat</span>
        </div>
        <div className="w-16 h-16 rounded-full bg-emerald-900/60 border border-emerald-700 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Assessment Complete</h1>
        <p className="text-slate-400">
          Student <span className="text-white font-semibold">{studentId}</span> ·{" "}
          Course <span className="text-white font-semibold">{courseId}</span>
        </p>
      </div>

      <div className="w-full max-w-3xl space-y-6">
        {/* Tab switch warning */}
        {tabSwitches > 0 && (
          <div className="bg-yellow-950/40 border border-yellow-700 rounded-xl p-4 text-yellow-400 text-sm">
            <strong>⚠ Academic Integrity Notice:</strong> {tabSwitches} browser tab switch(es) were detected during the assessment. This has been logged in the report.
          </div>
        )}

        {/* Score cards */}
        <div className="grid grid-cols-4 gap-4">
          {(
            [
              { key: "correct", label: "Correct", color: "border-emerald-700 bg-emerald-950/40 text-emerald-400" },
              { key: "partial", label: "Partial", color: "border-yellow-700 bg-yellow-950/40 text-yellow-400" },
              { key: "incorrect", label: "Incorrect", color: "border-red-700 bg-red-950/40 text-red-400" },
              { key: "no_response", label: "No Response", color: "border-slate-600 bg-slate-800/40 text-slate-400" },
            ] as const
          ).map(({ key, label, color }) => (
            <div key={key} className={`border rounded-xl p-4 text-center ${color}`}>
              <div className="text-3xl font-bold">{stats[key]}</div>
              <div className="text-xs mt-1 opacity-80">{label}</div>
            </div>
          ))}
        </div>

        {/* Per-question results */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Question Results</h2>
          {results.map((r, i) => {
            const scoreKey = r.score as keyof typeof scoreColor;
            return (
              <div
                key={i}
                className={`border rounded-xl p-5 ${scoreBg[scoreKey] || "bg-slate-800 border-slate-600"}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                      Q{i + 1} · {r.contentArea}
                    </div>
                    <p className="text-white font-medium">{r.question}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-bold ${scoreColor[scoreKey] || "text-slate-400"}`}>
                    {scoreLabel[scoreKey] || r.score}
                  </span>
                </div>

                {r.transcription && r.transcription !== "[Processing error]" && (
                  <div className="bg-black/30 rounded-lg p-3 mb-3">
                    <div className="text-xs text-slate-500 mb-1">Transcription</div>
                    <p className="text-slate-300 text-sm italic">"{r.transcription}"</p>
                  </div>
                )}

                {r.notes && (
                  <p className="text-slate-400 text-sm">{r.notes}</p>
                )}

                {r.struggle && (
                  <p className="text-yellow-400 text-sm mt-2">
                    <span className="font-medium">Concept gap:</span> {r.struggle}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Download button */}
        <button
          onClick={handleDownloadPDF}
          disabled={pdfGenerating || results.length === 0}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition text-lg flex items-center justify-center gap-3"
        >
          {pdfGenerating ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating PDF...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Instructor Report (PDF)
            </>
          )}
        </button>

        <p className="text-center text-slate-500 text-xs">
          This report is for instructor use. Verbal responses were auto-transcribed. Instructor review recommended before finalizing grades.
        </p>
      </div>
    </main>
  );
}
