import OpenAI from "openai";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  messages?: ChatMessage[];
};

const HERMES_INSTRUCTIONS = `
Sei Hermes, l'assistente operativo personale di Elvis.
Rispondi principalmente in italiano, a meno che Elvis non richieda un'altra lingua.
Sii diretto, concreto e orientato all'azione.
Per ora sei un assistente conversazionale: non dichiarare di avere eseguito azioni esterne che non hai realmente eseguito.
Mantieni le risposte vocali facili da ascoltare: usa frasi chiare e non eccessivamente lunghe.
Quando una richiesta è ambigua, fai una sola domanda breve solo se davvero necessaria.
`;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        error:
          "Manca OPENAI_API_KEY. Aggiungila nelle variabili d’ambiente di Vercel.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as ChatRequest;

    const messages = Array.isArray(body.messages)
      ? body.messages
          .filter(
            (message): message is ChatMessage =>
              (message?.role === "user" || message?.role === "assistant") &&
              typeof message.content === "string" &&
              message.content.trim().length > 0,
          )
          .slice(-20)
          .map((message) => ({
            role: message.role,
            content: message.content.trim().slice(0, 6000),
          }))
      : [];

    if (messages.length === 0) {
      return Response.json(
        { error: "Scrivi o pronuncia un messaggio prima di inviarlo." },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5",
      instructions: HERMES_INSTRUCTIONS,
      input: messages,
    });

    const reply = response.output_text?.trim();

    if (!reply) {
      return Response.json(
        { error: "Hermes non ha generato una risposta testuale." },
        { status: 502 },
      );
    }

    return Response.json({ reply });
  } catch (error) {
    console.error("Hermes chat error", error);

    return Response.json(
      {
        error:
          "Non riesco a contattare Hermes. Controlla la chiave API e riprova.",
      },
      { status: 500 },
    );
  }
}
