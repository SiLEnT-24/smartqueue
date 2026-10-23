import { useEffect, useRef, useState } from 'react';
import { Bot, Send, User, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Card, PageTitle } from '../components/ui';

const CHIPS = ['What is my token status?', 'How long is the wait?', 'Which counters are open?', 'How do I get a token?'];
const WELCOME = { role: 'assistant', text: 'Hi! I can answer questions about your token, waiting times and how to use SmartQueue. Pick a question below or type your own.' };

export default function Assistant() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState([WELCOME]);
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => { end.current && end.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy]);

  const send = async (raw) => {
    const message = (raw ?? text).trim();
    if (!message || busy) return;
    setText(''); setBusy(true);
    const history = msgs.filter((m) => m !== WELCOME && !m.error).map((m) => ({ role: m.role, content: m.text }));
    setMsgs((m) => [...m, { role: 'user', text: message }]);
    try {
      const r = await api.post('/chat', { message, history });
      setMsgs((m) => [...m, { role: 'assistant', text: r.reply, source: r.source }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', text: e.message, error: true }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageTitle title="Assistant" sub="Ask about your token, waits and how to use SmartQueue.">
        <button className="btn btn-ghost" onClick={() => setMsgs([WELCOME])}><Trash2 size={16} />Clear chat</button>
      </PageTitle>
      <Card className="flex h-[70vh] flex-col !p-0">
        <div className="flex-1 space-y-4 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Conversation">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === 'user' ? 'bg-violet/20 text-violet' : 'bg-cyan/15 text-cyan'}`}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}</div>
              <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-violet/15' : m.error ? 'border border-red-500/30 bg-red-500/10 text-red-400' : ''}`}
                style={m.role === 'assistant' && !m.error ? { background: 'var(--glass-strong)' } : undefined}>
                {m.text}
                {m.source && <div className="mt-1.5 text-xs text-mute">{m.source === 'ai' ? 'AI answer. Check important details on your token page.' : 'Quick answer from live queue data.'}</div>}
              </div>
            </div>))}
          {busy && <div className="flex items-center gap-2 text-sm text-mute" role="status"><Bot size={16} className="text-cyan" />Thinking…</div>}
          <div ref={end} />
        </div>

        <div className="border-t p-3" style={{ borderColor: 'var(--line)' }}>
          {msgs.length <= 1 && <div className="mb-3 flex flex-wrap gap-2">{CHIPS.filter((c) => user.role === 'student' || !/my token/i.test(c)).map((c) => (
            <button key={c} className="badge !px-3 !py-1.5 text-sm text-mute hover:text-ink" style={{ borderColor: 'var(--line)' }} onClick={() => send(c)}>{c}</button>))}</div>}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
            <label htmlFor="chat" className="sr-only">Your question</label>
            <input id="chat" className="input" maxLength={500} autoComplete="off" placeholder="Ask a question…" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn btn-primary" disabled={busy || !text.trim()} aria-label="Send"><Send size={16} /></button>
          </form>
          <p className="mt-2 text-xs text-mute">The assistant can be wrong. It cannot create or cancel tokens. Waiting times are approximate.</p>
        </div>
      </Card>
    </>);
}
