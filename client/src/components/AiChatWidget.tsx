import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResult {
  message: string;
  transaction?: {
    type: "EXPENSE" | "INCOME";
    amount: number;
    categoryName: string;
    description?: string | null;
  };
}

const suggestions = [
  "J'ai dépensé 5000 aujourd'hui en transport",
  "Quelle est ma plus grosse dépense ?",
  "Mon budget est-il en danger ?",
];

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, loading, open]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;

    const updated: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await api<ChatResult>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ messages: updated.map((m) => ({ role: m.role, content: m.content })) }),
      });

      let reply = res.message;
      if (res.transaction) {
        const sign = res.transaction.type === "INCOME" ? "+" : "−";
        reply += `\n\n✓ Transaction enregistrée : ${sign}${res.transaction.amount.toLocaleString("fr-FR")} FCFA (${res.transaction.categoryName}).`;
      }
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur avec l'assistant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
            onClick={() => setOpen((o) => !o)}
            className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-2xl shadow-lg shadow-indigo-600/40 flex items-center justify-center transition active:scale-95"
            title="Parler à Nafi 🤖"
          >
            {open ? "✕" : "🤖"}
          </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">Nafi · ton assistant</p>
              <p className="text-xs text-slate-400">Analyse tes dépenses, enregistre tes transactions</p>
            </div>
          </div>

          <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-slate-500 bg-white rounded-xl p-3 border border-slate-200">
                  Salut ! Je suis Nafi 🎉 Pose-moi une question sur ton budget, ou dis-moi une dépense que tu viens de faire et je l'enregistrerai.
                </p>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-left text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg px-3 py-2 transition"
                  >
                    💬 {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white self-end ml-auto"
                    : "bg-white text-slate-800 border border-slate-200"
                }`}
              >
                {m.content}
              </div>
            ))}

            {loading && (
              <div className="bg-white text-slate-500 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm max-w-[85%] animate-pulse">
                Nafi réfléchit…
              </div>
            )}
            {error && <p className="text-red-600 text-xs">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 p-3 border-t border-slate-200"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex : j'ai dépensé 3000 en basket…"
              className="flex-1 input"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 rounded-lg transition"
            >
              Envoyer
            </button>
          </form>
        </div>
      )}
    </>
  );
}