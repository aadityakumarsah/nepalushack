"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { createFeedback } from "@/lib/actions/general.action";
import { personas } from "@/constants/personas";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(
  persona: { systemPrompt: string; name: string },
  questions: string[]
): string {
  const formattedQuestions = questions
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");

  return `${persona.systemPrompt}

You are conducting a real job interview. Your task is to ask the following questions and evaluate the candidate:

${formattedQuestions}

Interview Guidelines:
- Ask questions one at a time in order
- React naturally to responses and ask a brief follow-up if the answer needs more depth
- Keep each response concise — this is a voice interview, not a written one
- Do NOT use markdown, bullet points, asterisks, or special characters in your responses
- Speak naturally as if in a real conversation
- When you have covered all questions and given a closing remark, append exactly [INTERVIEW_COMPLETE] at the very end of your final message
- Start by greeting the candidate warmly and asking the first question`;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  personaId,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");

  const messagesRef = useRef<SavedMessage[]>([]);
  const doneRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const persona = personas.find((p) => p.id === personaId) ?? personas[0];

  // Load browser TTS voices
  useEffect(() => {
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const english = all.filter((v) => v.lang.startsWith("en"));
      const list = english.length ? english : all.slice(0, 15);
      setAvailableVoices(list);
      if (list.length && !selectedVoiceName) {
        setSelectedVoiceName(list[0].name);
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }
  }, [messages]);

  // Handle FINISHED state
  useEffect(() => {
    if (callStatus !== CallStatus.FINISHED) return;

    const run = async () => {
      if (type === "interview") {
        const { success, feedbackId: id } = await createFeedback({
          interviewId: interviewId!,
          userId: userId!,
          transcript: messagesRef.current,
          feedbackId,
        });
        if (success && id) {
          router.push(`/interview/${interviewId}/feedback`);
        } else {
          router.push("/");
        }
      } else {
        router.push("/");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus]);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = availableVoices.find((v) => v.name === selectedVoiceName);
        if (voice) utterance.voice = voice;
        utterance.rate = 0.92;
        utterance.pitch = 1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [availableVoices, selectedVoiceName]
  );

  const callGemini = async (history: SavedMessage[]): Promise<string> => {
    const res = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: history,
        systemPrompt: buildSystemPrompt(persona, questions ?? []),
      }),
    });
    const data = await res.json();
    return (data.text as string) ?? "";
  };

  const startListening = useCallback(() => {
    if (doneRef.current) return;

    const SR =
      window.SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SR) {
      alert(
        "Speech recognition is not supported in this browser. Please use Chrome or Edge."
      );
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.trim();
      if (!transcript) {
        startListening();
        return;
      }

      const userMsg: SavedMessage = { role: "user", content: transcript };
      const newHistory = [...messagesRef.current, userMsg];
      setMessages(newHistory);

      const aiRaw = await callGemini(newHistory);
      const isComplete = aiRaw.includes("[INTERVIEW_COMPLETE]");
      const cleanText = aiRaw.replace("[INTERVIEW_COMPLETE]", "").trim();

      const aiMsg: SavedMessage = { role: "assistant", content: cleanText };
      setMessages((prev) => [...prev, aiMsg]);

      await speak(cleanText);

      if (isComplete || doneRef.current) {
        doneRef.current = true;
        setCallStatus(CallStatus.FINISHED);
      } else {
        setTimeout(() => startListening(), 300);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Recognition error:", event.error);
      setIsListening(false);
      if (!doneRef.current) {
        setTimeout(() => startListening(), 1000);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak, questions, persona]);

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);
    doneRef.current = false;

    const aiRaw = await callGemini([]);
    const cleanText = aiRaw.replace("[INTERVIEW_COMPLETE]", "").trim();
    const opening: SavedMessage = { role: "assistant", content: cleanText };
    setMessages([opening]);
    setCallStatus(CallStatus.ACTIVE);

    await speak(cleanText);
    startListening();
  };

  const handleDisconnect = () => {
    doneRef.current = true;
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
    setCallStatus(CallStatus.FINISHED);
  };

  return (
    <>
      {/* Voice selector — shown only before interview starts */}
      {callStatus === CallStatus.INACTIVE && availableVoices.length > 0 && (
        <div className="flex flex-col gap-2 mb-4 max-w-xs">
          <label className="text-sm text-light-100">AI Voice</label>
          <select
            value={selectedVoiceName}
            onChange={(e) => setSelectedVoiceName(e.target.value)}
            className="bg-dark-200 text-white border border-dark-300 rounded-lg px-3 py-2 text-sm"
          >
            {availableVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="AI Interviewer"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>{persona.name}</h3>
          <p className="text-sm text-light-400">{persona.role}</p>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="User"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {/* Transcript */}
      {(isListening || messages.length > 0) && (
        <div className="transcript-border">
          <div className="transcript">
            {isListening ? (
              <p className="animate-pulse text-primary-200 text-sm">
                Listening…
              </p>
            ) : (
              <p
                key={lastMessage}
                className={cn(
                  "transition-opacity duration-500 opacity-0",
                  "animate-fadeIn opacity-100"
                )}
              >
                {lastMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="w-full flex justify-center gap-4">
        {callStatus !== CallStatus.ACTIVE ? (
          <button
            className="relative btn-call"
            onClick={handleCall}
            disabled={callStatus === CallStatus.CONNECTING}
          >
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== CallStatus.CONNECTING && "hidden"
              )}
            />
            <span className="relative">
              {callStatus === CallStatus.INACTIVE ||
              callStatus === CallStatus.FINISHED
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <div className="flex gap-4 items-center">
            {!isListening && !isSpeaking && (
              <button
                className="btn-call text-sm px-6 py-3"
                onClick={startListening}
              >
                🎤 Speak
              </button>
            )}
            <button className="btn-disconnect" onClick={handleDisconnect}>
              End
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Agent;
