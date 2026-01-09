
import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Bot, User, Loader2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { ChatMessage, UserProfile, Trade } from '../types';
import { storageService } from '../services/storageService';

interface CoachChatProps {
  profile: UserProfile;
  trades: Trade[];
}

const CoachChat: React.FC<CoachChatProps> = ({ profile, trades }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = storageService.getChats();
    if (saved.length > 0) {
      setMessages(saved);
    } else {
      setMessages([{
        role: 'model',
        parts: `Terminal Equilibrium activa. Operador: ${profile.name}. ¿Qué aspecto de tu proceso requiere revisión?`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [profile.name]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > 0) {
      storageService.saveChats(messages);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = {
      role: 'user',
      parts: input,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    const response = await geminiService.startChat(messages, input, profile, trades);
    const botMsg: ChatMessage = {
      role: 'model',
      parts: response,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  const clearChat = () => {
    if (confirm('¿Confirmar purga de registros de conversación?')) {
      setMessages([]);
      storageService.saveChats([]);
      setMessages([{
        role: 'model',
        parts: `Registros eliminados. Terminal reiniciada. ¿En qué puedo ayudarte?`,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-4xl mx-auto p-4 animate-fade-in">
      <div className="flex justify-between items-center mb-4 bg-navy-light cyber-border p-4 rounded-xl border-l-4 border-cyan">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan animate-pulse"></div>
          <h2 className="font-bold text-white text-sm tracking-widest uppercase italic font-mono">AI Coach // Interface 2.5</h2>
        </div>
        <button onClick={clearChat} className="text-slate-500 hover:text-red-500 transition-colors p-2">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4 p-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-xl flex gap-3 ${m.role === 'user' ? 'bg-cyan text-navy font-medium rounded-tr-none' : 'bg-navy-light border border-navy-accent text-slate-300 rounded-tl-none'}`}>
              <div className="shrink-0 mt-1">
                {m.role === 'user' ? <User size={14} /> : <Bot size={14} className="text-cyan" />}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">{m.parts}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-navy-light border border-navy-accent p-4 rounded-xl rounded-tl-none animate-pulse">
              <Loader2 className="animate-spin text-cyan" size={14} />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="relative">
        <input 
          type="text" 
          placeholder="Consultar proceso técnico o psicológico..."
          className="w-full bg-navy border border-navy-accent rounded-xl p-4 pr-16 text-white focus:border-cyan outline-none transition-all shadow-md text-sm font-mono placeholder:text-slate-700"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button 
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-cyan text-navy rounded-lg hover:brightness-110 disabled:opacity-50 transition-all shadow-sm"
        >
          <Send size={18} />
        </button>
      </div>
      <div className="flex justify-between items-center px-1 mt-2">
        <p className="text-[8px] font-mono text-slate-500 uppercase tracking-[0.3em] opacity-60">Status: Active // Data Sync: Realtime</p>
        <p className="text-[8px] font-mono text-slate-700 uppercase">Protocolo: Sin recomendaciones de inversión</p>
      </div>
    </div>
  );
};

export default CoachChat;
