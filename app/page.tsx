"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionResultLike = {
  [index: number]: SpeechRecognitionAlternativeLike;
  length: number;
  isFinal: boolean;
};

type SpeechRecognitionResultListLike = {
  [index: number]: SpeechRecognitionResultLike;
  length: number;
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
  message?: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Ciao Elvis. Sono Hermes. Premi il microfono e parlami.",
  },
];

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState("");

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      setError("Questo browser non supporta la risposta vocale.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "it-IT";
    utterance.rate = 0.96;
    utterance.pitch = 1;

    const italianVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith("it"));

    if (italianVoice) {
      utterance.voice = italianVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setError("Non sono riuscito a riprodurre la risposta vocale.");
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();

    if (!text || isLoading) {
      return;
    }

    setError("");
    setInput("");
    stopSpeaking();

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversation.map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = (await response.json()) as {
        reply?: string;
        error?: string;
      };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || "Hermes non ha restituito una risposta.");
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
      };

      setMessages((current) => [...current, assistantMessage]);
      speak(data.reply);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Errore durante la comunicazione con Hermes.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function startListening() {
    setError("");

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setError(
        "Il riconoscimento vocale non è disponibile. Apri Hermes con Chrome o Edge.",
      );
      return;
    }

    stopSpeaking();

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "it-IT";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInput("");
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Autorizza l’uso del microfono nelle impostazioni del browser.");
      } else if (event.error !== "aborted") {
        setError(`Errore del microfono: ${event.error}.`);
      }
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? "";
      }

      const finalTranscript = transcript.trim();
      setInput(finalTranscript);

      if (finalTranscript) {
        void sendMessage(finalTranscript);
      }
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setError("Il microfono è già attivo. Riprova tra un momento.");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <main className="shell">
      <section className="app-card" aria-label="Hermes Voice Agent">
        <header className="topbar">
          <div className="brand-mark" aria-hidden="true">
            H
          </div>
          <div>
            <p className="eyebrow">VOICE AGENT</p>
            <h1>Hermes</h1>
          </div>
          <div className="status" aria-live="polite">
            <span className={isLoading ? "status-dot busy" : "status-dot"} />
            {isLoading ? "Sta pensando" : "Online"}
          </div>
        </header>

        <div className="conversation" aria-live="polite">
          {messages.map((message) => (
            <article
              className={`message ${message.role}`}
              key={message.id}
            >
              <span className="message-label">
                {message.role === "assistant" ? "Hermes" : "Tu"}
              </span>
              <p>{message.content}</p>
            </article>
          ))}

          {isLoading && (
            <article className="message assistant loading-message">
              <span className="message-label">Hermes</span>
              <div className="typing" aria-label="Hermes sta pensando">
                <span />
                <span />
                <span />
              </div>
            </article>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}

        <div className="voice-panel">
          <button
            className={`microphone ${isListening ? "listening" : ""}`}
            type="button"
            onClick={startListening}
            disabled={isLoading}
            aria-label={isListening ? "Interrompi ascolto" : "Parla con Hermes"}
          >
            <span className="mic-icon" aria-hidden="true">
              {isListening ? "■" : "●"}
            </span>
          </button>

          <div className="voice-copy">
            <strong>
              {isListening
                ? "Ti sto ascoltando…"
                : isLoading
                  ? "Hermes sta preparando la risposta…"
                  : "Premi e parla con Hermes"}
            </strong>
            <span>
              {isListening
                ? "Parla normalmente in italiano"
                : "La risposta verrà letta ad alta voce"}
            </span>
          </div>

          {isSpeaking && (
            <button className="stop-voice" type="button" onClick={stopSpeaking}>
              Interrompi voce
            </button>
          )}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Oppure scrivi un messaggio…"
            aria-label="Messaggio per Hermes"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            Invia
          </button>
        </form>

        <p className="privacy-note">
          Il microfono si attiva soltanto quando premi il pulsante.
        </p>
      </section>
    </main>
  );
}
