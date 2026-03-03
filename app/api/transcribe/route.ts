import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Convert File to a format OpenAI can handle
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Derive file extension from mime type so Whisper parses it correctly
    const mimeType = audioFile.type || "audio/webm";
    const extMap: Record<string, string> = {
      "audio/webm": "webm",
      "video/webm": "webm",
      "audio/mp4": "mp4",
      "video/mp4": "mp4",
      "audio/ogg": "ogg",
      "audio/wav": "wav",
    };
    const ext = extMap[mimeType.split(";")[0]] || "webm";
    const file = new File([buffer], `audio.${ext}`, { type: mimeType });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed", details: String(error) },
      { status: 500 }
    );
  }
}
