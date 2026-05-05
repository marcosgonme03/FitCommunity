import { useEffect, useRef, useState } from 'react';
import { Send, Plus, Trash2, Sparkles } from 'lucide-react';
import aiService from '../../services/ai.service';
import { AiConversation, AiMessage } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import PremiumGate from '../../components/common/PremiumGate';
import { timeAgo } from '../../lib/format';
import { toast } from '../../components/ui/Toast';

const SUGGESTED_PROMPTS = [
  '¿Cómo mejoro mi sentadilla?',
  'Plan rápido pecho y tríceps en 45 min',
  'Cuántas series por grupo muscular a la semana',
  'Cómo evitar el estancamiento en press banca',
];

function CoachChatInner() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConv, setActiveConv] = useState<AiConversation | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiService.listConversations()
      .then((r) => setConversations(r.items))
      .catch(() => undefined)
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function loadConversation(id: string) {
    setLoadingMessages(true);
    try {
      const conv = await aiService.getConversation(id);
      setActiveConv(conv);
      setMessages(conv.messages ?? []);
    } catch {
      toast.error('No se pudo cargar la conversación');
    } finally {
      setLoadingMessages(false);
    }
  }

  function newConversation() {
    setActiveConv(null);
    setMessages([]);
  }

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content) return;
    setInput('');
    setSending(true);
    // Optimistic user message
    const tempUserMsg: AiMessage = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await aiService.chat({
        conversationId: activeConv?.id,
        message: content,
      });
      // Refresh to get persisted user message + assistant response
      const conv = await aiService.getConversation(result.conversationId);
      setActiveConv(conv);
      setMessages(conv.messages ?? []);
      // refresh list
      const list = await aiService.listConversations();
      setConversations(list.items);
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      const e = err as { response?: { data?: { error?: string } } };
      toast.error('Error', e.response?.data?.error ?? 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  }

  async function deleteConv(id: string) {
    if (!confirm('¿Borrar conversación?')) return;
    try {
      await aiService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConv?.id === id) newConversation();
    } catch {
      toast.error('Error');
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-r border-surface-200 bg-surface-50">
        <div className="p-4 border-b border-surface-200">
          <Button fullWidth onClick={newConversation} leftIcon={<Plus className="w-4 h-4" />}>
            Nueva conversación
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingList ? (
            <Spinner label="Cargando..." />
          ) : conversations.length === 0 ? (
            <p className="text-center text-xs text-surface-500 py-6">
              No tienes conversaciones aún
            </p>
          ) : (
            conversations.map((c) => (
              <div key={c.id} className="group relative">
                <button
                  onClick={() => loadConversation(c.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors
                              ${activeConv?.id === c.id ? 'bg-brand-100 text-brand-900' : 'text-surface-700 hover:bg-surface-100'}`}
                >
                  <p className="text-sm font-semibold truncate">{c.title}</p>
                  <p className="text-[10px] text-surface-500 mt-0.5">
                    {c._count?.messages ?? 0} mensajes · {timeAgo(c.updated_at)}
                  </p>
                </button>
                <button
                  onClick={() => deleteConv(c.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded text-surface-400 hover:text-red-600 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-surface-200 bg-white">
          <h1 className="font-bold text-surface-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600" />
            Coach IA · FitCommunity
          </h1>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
          {loadingMessages ? (
            <Spinner label="Cargando..." />
          ) : messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-10">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent-400 to-brand-500 flex items-center justify-center mb-4 shadow-glow">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-surface-900 mb-2">
                Hola {user?.profile?.displayName?.split(' ')[0] ?? 'atleta'}
              </h2>
              <p className="text-surface-600 mb-8">
                Pregúntame lo que quieras sobre entrenamiento, técnica, nutrición o motivación.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="text-left p-3 rounded-xl bg-white border border-surface-200 hover:border-brand-300 hover:bg-brand-50/40 text-sm text-surface-700 transition-all"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-400 to-brand-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3
                                ${m.role === 'user'
                                  ? 'bg-brand-500 text-white rounded-tr-sm'
                                  : 'bg-white border border-surface-200 text-surface-800 rounded-tl-sm shadow-soft'}`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
                {m.role === 'user' && (
                  <Avatar src={user?.profile?.avatarUrl} name={user?.profile?.displayName ?? '?'} size="sm" />
                )}
              </div>
            ))
          )}
          {sending && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-400 to-brand-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="bg-white border border-surface-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-soft">
                <span className="inline-flex gap-1">
                  <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="p-4 border-t border-surface-200 bg-white">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregúntame algo sobre entrenamiento..."
              maxLength={2000}
              disabled={sending}
              className="input-field"
            />
            <Button type="submit" loading={sending} disabled={!input.trim()} leftIcon={<Send className="w-4 h-4" />}>
              Enviar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CoachChatPage() {
  return (
    <PremiumGate featureName="el coach IA">
      <CoachChatInner />
    </PremiumGate>
  );
}
