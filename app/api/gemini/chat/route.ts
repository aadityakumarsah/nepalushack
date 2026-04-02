import { generateText } from "ai";
import { google } from "@ai-sdk/google";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const { messages, systemPrompt } = (await request.json()) as {
      messages: Message[];
      systemPrompt: string;
    };

    const { text } = await generateText({
      model: google("gemini-2.0-flash-001"),
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    return Response.json({ text }, { status: 200 });
  } catch (error) {
    console.error("Gemini chat error:", error);
    return Response.json(
      { text: "Sorry, I encountered an error. Please try again." },
      { status: 500 }
    );
  }
}
