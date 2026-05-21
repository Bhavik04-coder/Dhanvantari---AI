'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Bot, User, X, Stethoscope } from 'lucide-react';
import Swal from 'sweetalert2';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: string;
}

export interface DoctorChatContext {
  patientName?: string;
  disease?: string;
  confidence?: number;
  symptoms?: string[];
}

interface DoctorChatAssistantProps {
  initialContext?: DoctorChatContext;
  onClose?: () => void;
}

const API_URL = '/api/chat';

export default function DoctorChatAssistant({ initialContext, onClose }: DoctorChatAssistantProps) {
  const welcomeText = initialContext?.patientName
    ? `Hello, Doctor! I have context for patient **${initialContext.patientName}**:\n\n${initialContext.disease ? `🔬 Condition: ${initialContext.disease}` : ''}${initialContext.confidence ? `\n📊 AI Confidence: ${initialContext.confidence}%` : ''}${initialContext.symptoms?.length ? `\n🩺 Symptoms: ${initialContext.symptoms.join(', ')}` : ''}\n\nAsk me anything — differential diagnosis, treatment protocols, drug interactions, or clinical guidelines.`
    : "Hello, Doctor! I'm your AI Clinical Assistant.\n\nI can help with:\n• Differential diagnosis & treatment protocols\n• Drug interactions & dosage references\n• Clinical guidelines & evidence-based medicine\n• Patient case discussions\n\nExample: \"What are the treatment options for Type 2 Diabetes with hypertension?\"";

  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    text: welcomeText,
    sender: 'ai',
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Close on Escape
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check backend health on mount
  useEffect(() => {
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hi' }),
    })
      .then(r => setBackendOnline(r.status !== 503))
      .catch(() => setBackendOnline(false));
  }, []);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    recognitionRef.current = new SR();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.onresult = (e: any) => { setInput(e.results[0][0].transcript); setIsListening(false); };
    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => setIsListening(false);
    return () => recognitionRef.current?.stop();
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      Swal.fire({ icon: 'warning', title: 'Not Supported', text: 'Speech recognition is not supported. Please use Chrome or Edge.', confirmButtonColor: '#2563eb' });
      return;
    }
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  const buildHistory = () =>
    messages.slice(-8).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), text: userText, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const body: Record<string, any> = {
        message: userText,
        history: buildHistory(),
        role: 'doctor', // signal to backend that this is a doctor query
      };

      if (initialContext) {
        body.context = {
          patientName: initialContext.patientName,
          disease: initialContext.disease,
          confidence: initialContext.confidence,
          symptoms: initialContext.symptoms,
        };
      }

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: data.message ?? data.response ?? 'No response from server.',
        sender: 'ai',
        timestamp: new Date(),
        type: data.type,
      }]);
    } catch {
      const fallback = initialContext?.patientName
        ? `⚠️ Cannot connect to AI backend right now.\n\nFor patient **${initialContext.patientName}**${initialContext.disease ? ` with ${initialContext.disease}` : ''}, please refer to standard clinical guidelines or consult a specialist.\n\nMake sure the Python server is running:\n  cd Human-Health_model\n  python app.py`
        : '⚠️ Cannot connect to AI backend. Make sure the Python server is running:\n  cd Human-Health_model\n  python app.py';

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: fallback,
        sender: 'ai',
        timestamp: new Date(),
        type: 'error',
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6 flex flex-col min-h-0 h-full">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4 shrink-0">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800">AI Clinical Assistant</h3>
          <p className="text-xs text-gray-500">
            {initialContext?.patientName
              ? `Patient: ${initialContext.patientName}`
              : 'Evidence-based clinical decision support'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${
              backendOnline === null ? 'bg-yellow-400 animate-pulse'
              : backendOnline ? 'bg-green-400 animate-pulse'
              : 'bg-red-400'
            }`} />
            <span className="text-xs text-gray-500">
              {backendOnline === null ? 'Checking...' : backendOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close chat"
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Patient context pill */}
      {initialContext?.patientName && (
        <div className="mb-4 flex flex-wrap gap-2 p-3 bg-blue-50 border border-blue-200 rounded-2xl shrink-0">
          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
            {initialContext.patientName}
          </span>
          {initialContext.disease && (
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full capitalize">
              {initialContext.disease}
            </span>
          )}
          {initialContext.confidence != null && (
            <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">
              {initialContext.confidence}% confidence
            </span>
          )}
          {initialContext.symptoms?.slice(0, 3).map(s => (
            <span key={s} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">{s}</span>
          ))}
          {(initialContext.symptoms?.length ?? 0) > 3 && (
            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
              +{(initialContext.symptoms?.length ?? 0) - 3} more
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain space-y-4 mb-4 pr-1 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start space-x-2 max-w-[88%] ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600'
              }`}>
                {msg.sender === 'user'
                  ? <User className="w-4 h-4 text-white" />
                  : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : msg.type === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-gray-50 text-gray-800 border border-gray-200'
              }`}>
                <p className="whitespace-pre-line">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center space-x-2 shrink-0">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={
              initialContext?.patientName
                ? `Ask about ${initialContext.patientName}'s case...`
                : 'Ask a clinical question...'
            }
            className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button
            type="button"
            onClick={toggleVoice}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
              isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-gray-100 text-gray-400'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Voice input'}
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
