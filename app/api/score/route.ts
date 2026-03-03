import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ScoreResult {
  score: "correct" | "partial" | "incorrect" | "no_response";
  content_area: string;
  struggle: string | null;
  notes: string;
}

export async function POST(req: NextRequest) {
  try {
    const { question, contentArea, transcription } = await req.json();

    if (!question || !contentArea) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Handle empty/no response
    if (!transcription || transcription.trim().length < 5) {
      const result: ScoreResult = {
        score: "no_response",
        content_area: contentArea,
        struggle: "Student did not provide a verbal response",
        notes: "No response detected or response too brief to evaluate.",
      };
      return NextResponse.json(result);
    }

    const prompt = `You are scoring a student's verbal response to an assessment question.

Question: ${question}
Content Area: ${contentArea}
Student Response (transcribed): ${transcription}

Score this response:
- correct: Student demonstrated clear understanding
- partial: Student showed some understanding but missed key elements
- incorrect: Response was wrong or insufficient

Also identify: what specific concept is the student struggling with (if partial or incorrect)?

Return ONLY valid JSON with no other text:
{"score": "correct|partial|incorrect", "content_area": "${contentArea}", "struggle": "description of struggle" or null, "notes": "brief explanation of scoring"}`;

    const message = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response");
    }

    const result: ScoreResult = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scoring error:", error);
    return NextResponse.json(
      { error: "Scoring failed", details: String(error) },
      { status: 500 }
    );
  }
}
