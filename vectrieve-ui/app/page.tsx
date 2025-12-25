'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Send, Paperclip, Bot, User, Trash2, Menu, X, FileText, 
  Sparkles, BarChart2, MessageSquare, ThumbsUp, ThumbsDown, 
  Settings, RefreshCw, ChevronLeft, Cloud, Lock // <--- Додали нові іконки
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { checkHealth, sendMessage, uploadFile, getFiles, deleteFile, sendFeedback, getAnalytics, Message } from '@/lib/api';

export default function Home() {
  // === STATE ===
  const [activeTab, setActiveTab] = useState<'chat' | 'analytics'>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [temperature, setTemperature] = useState(0.3);
  
  // 👇 НОВИЙ СТАН: Режим роботи (Local vs Cloud)
  const [isLocalMode, setIsLocalMode] = useState(true); 

  const [analytics, setAnalytics] = useState<any>(null);
  
  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === INIT ===
  useEffect(() => {
    checkHealth();
    loadFiles();
  }, []);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      loadAnalytics();
    }
  }, [messages, activeTab]);

  const loadFiles = () => getFiles().then(setFiles);
  
  const loadAnalytics = async () => {
    const data = await getAnalytics();
    if (data) setAnalytics(data);
  };

  // === ACTIONS ===
  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // 👇 ВАЖЛИВО: Передаємо режим (local/cloud) у функцію API
      const response = await sendMessage(
          [...messages, userMsg], 
          temperature, 
          isLocalMode ? 'local' : 'cloud'
      );

      const botMsg: Message = {
        role: 'assistant',
        content: response.response_text,
        sources: response.sources,
        latency: response.latency,
        query_id: response.query_id,
        last_query: input
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Connection Error. Is backend running?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (msg: Message, type: 'positive' | 'negative') => {
    if (!msg.query_id) return;
    await sendFeedback({
        query_id: msg.query_id,
        feedback: type,
        query: msg.last_query || "",
        response: msg.content,
        latency: msg.latency || 0
    });
    const btn = document.getElementById(`btn-${type}-${msg.query_id}`);
    if (btn) btn.classList.add(type === 'positive' ? 'text-green-500' : 'text-red-500');
  };

  const clearHistory = () => {
      if(confirm("Clear chat history?")) setMessages([]);
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setIsLoading(true);
      await uploadFile(e.target.files[0]);
      await loadFiles();
      e.target.value = ''; 
      setIsLoading(false);
    }
  };

  const triggerFileUpload = () => {
      fileInputRef.current?.click();
  }

  const handleDelete = async (fname: string) => {
    if (confirm(`Remove ${fname}?`)) {
      await deleteFile(fname);
      await loadFiles();
    }
  };

  return (
    <div className="flex h-screen bg-[#121212] text-gray-100 font-sans overflow-hidden">
      
      {/* === SIDEBAR (Collapsible) === */}
      <div 
        className={`${isSidebarOpen ? 'w-[280px] opacity-100 p-0' : 'w-0 opacity-0 overflow-hidden'} bg-[#0a0a0a] flex flex-col transition-all duration-300 ease-in-out border-r border-white/5 relative z-20`}
      >
        
        {/* Sidebar Header */}
        <div className="p-5 flex items-center justify-between min-w-[280px]">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
            <Sparkles size={20} className="text-green-500" />
            VECTRIEVE
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-white transition">
            <ChevronLeft size={20}/>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-3 pb-4 border-b border-white/5 space-y-1 min-w-[280px]">
            <button 
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'chat' ? 'bg-[#212121] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
                <MessageSquare size={18} /> Chat
            </button>
            <button 
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'analytics' ? 'bg-[#212121] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
                <BarChart2 size={18} /> Analytics
            </button>
        </div>

        {/* File List & Settings */}
        <div className="flex-1 overflow-y-auto p-4 min-w-[280px]">
            {/* Files */}
            <div className="mb-6">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Knowledge Base</div>
                {files.length === 0 && <div className="text-xs text-gray-600 italic">No context added yet.</div>}
                {files.map(f => (
                    <div key={f} className="group flex justify-between items-center py-2 px-2 rounded hover:bg-white/5 text-sm text-gray-400 transition cursor-pointer">
                    <div className="flex items-center gap-2 truncate">
                        <FileText size={14} className="text-blue-500" />
                        <span className="truncate">{f}</span>
                    </div>
                    <button onClick={() => handleDelete(f)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition"><Trash2 size={14} /></button>
                    </div>
                ))}
            </div>

            {/* Settings Area */}
            <div className="mt-4 pt-4 border-t border-white/5">
                
                {/* 👇 НОВИЙ КОМПОНЕНТ: ПЕРЕМИКАЧ РЕЖИМІВ */}
                <div className="mb-6 bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        Processing Brain
                    </div>
                    <div className="flex bg-black/40 p-1 rounded-lg">
                        <button 
                            onClick={() => setIsLocalMode(false)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-all ${!isLocalMode ? 'bg-blue-600 text-white shadow-lg font-medium' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <Cloud size={12} /> Cloud
                        </button>
                        <button 
                            onClick={() => setIsLocalMode(true)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-all ${isLocalMode ? 'bg-green-600 text-white shadow-lg font-medium' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <Lock size={12} /> Secure
                        </button>
                    </div>
                    <div className="mt-2 text-[10px] text-gray-500 leading-tight px-1">
                        {isLocalMode 
                            ? "Running offline on local Qwen 2.5. Data never leaves this device." 
                            : "Running on Groq Cloud Llama-3. High speed, requires internet."}
                    </div>
                </div>

                {/* Temperature */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Creativity (Temp)</span>
                        <span className="text-green-400">{temperature}</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.1" 
                        value={temperature} 
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                </div>

                <button 
                    onClick={clearHistory}
                    className="flex items-center gap-2 w-full p-2 text-xs text-red-400 hover:bg-red-900/20 rounded transition border border-red-900/30 justify-center"
                >
                    <Trash2 size={14} /> Clear History
                </button>
            </div>
        </div>

        {/* Hidden File Input (Shared) */}
        <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
      </div>

      {/* === MAIN CONTENT === */}
      <div className="flex-1 flex flex-col relative h-full bg-[#121212] transition-all duration-300">
        
        {/* Dynamic Header */}
        <div className={`absolute top-0 left-0 right-0 p-4 z-50 flex items-center transition-opacity duration-300 ${!isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
             <button onClick={() => setSidebarOpen(true)} className="p-2 mr-3 bg-[#1e1e1e] text-gray-300 rounded-lg border border-white/10 hover:bg-white/5 transition">
                <Menu size={20}/>
             </button>
             <div className="flex items-center gap-2 font-bold text-lg tracking-tight bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
                <Sparkles size={20} className="text-green-500" />
                VECTRIEVE
             </div>
        </div>

        {/* --- VIEW: CHAT --- */}
        {activeTab === 'chat' && (
            <>
                <div className="flex-1 overflow-y-auto scroll-smooth">
                    <div className="max-w-4xl mx-auto px-4 py-16 space-y-6">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-40">
                                <Sparkles size={64} className="text-green-500 mb-4" />
                                <h1 className="text-3xl font-bold text-white mb-2">How can I help?</h1>
                                <p className="text-gray-400 max-w-md mb-6">Upload code or documents to get started.</p>
                                
                                {/* Status Indicator in Empty State */}
                                <div className="flex items-center gap-2 text-sm bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                                    <span className={`w-2 h-2 rounded-full ${isLocalMode ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                                    <span className="text-gray-300">
                                        Current Mode: <span className="font-bold">{isLocalMode ? 'Secure Offline' : 'Cloud Speed'}</span>
                                    </span>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-green-900/30 border border-green-500/30 flex items-center justify-center shrink-0 mt-1">
                                    <Bot size={16} className="text-green-400" />
                                </div>
                            )}
                            
                            <div className={`relative max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'bg-[#212121] text-white px-5 py-3 rounded-2xl rounded-tr-sm border border-white/5' : ''}`}>
                                <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#0a0a0a] max-w-none text-sm md:text-base">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>

                                {/* Sources */}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-white/10">
                                        <details className="group">
                                            <summary className="text-xs text-gray-500 cursor-pointer flex items-center gap-2 hover:text-green-400 transition select-none">
                                                <span>📚 {msg.sources.length} Sources</span>
                                                <span className="bg-[#0a0a0a] px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/10">{msg.latency?.toFixed(2)}s</span>
                                            </summary>
                                            <div className="mt-2 space-y-2 pl-2 border-l-2 border-green-500/20">
                                                {msg.sources.map((src, idx) => (
                                                    <div key={idx} className="text-xs">
                                                        <span className="font-bold text-gray-400">{src.filename}</span>
                                                        <p className="text-gray-600 truncate">{src.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                )}

                                {/* Minimalist Feedback */}
                                {msg.role === 'assistant' && (
                                    <div className="absolute -bottom-6 left-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <button id={`btn-positive-${msg.query_id}`} onClick={() => handleFeedback(msg, 'positive')} className="text-gray-600 hover:text-green-400 p-1"><ThumbsUp size={14} /></button>
                                        <button id={`btn-negative-${msg.query_id}`} onClick={() => handleFeedback(msg, 'negative')} className="text-gray-600 hover:text-red-400 p-1"><ThumbsDown size={14} /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                        ))}
                        
                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center"><Bot size={16} className="text-green-400" /></div>
                                <div className="bg-[#1e1e1e] px-4 py-3 rounded-2xl rounded-tl-sm border border-white/5 flex items-center h-full">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} className="h-4" />
                    </div>
                </div>

                {/* === FIXED INPUT AREA === */}
                <div className="p-4 bg-[#121212]">
                    <div className="max-w-4xl mx-auto relative">
                        <div className="flex items-center gap-2 bg-[#1e1e1e] p-2 pl-3 pr-2 rounded-2xl border border-white/10 shadow-2xl focus-within:border-gray-600 transition">
                            
                            {/* Paperclip attached to hidden file input */}
                            <button onClick={triggerFileUpload} className="p-2 text-gray-500 hover:text-white transition rounded-full hover:bg-white/5">
                                <Paperclip size={20} />
                            </button>
                            
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                                placeholder={isLocalMode ? "Message Secure AI (Offline)..." : "Message Cloud AI (Fast)..."}
                                className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 resize-none py-3 max-h-32 focus:outline-none"
                                rows={1}
                            />
                            
                            {/* Send Button */}
                            <button 
                                onClick={handleSend} 
                                disabled={!input.trim() || isLoading} 
                                className={`p-2 rounded-xl transition shrink-0 ${input.trim() ? (isLocalMode ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500') + ' text-white' : 'bg-[#2a2a2a] text-gray-500 cursor-not-allowed'}`}
                            >
                                <Send size={18} fill={input.trim() ? "currentColor" : "none"} />
                            </button>
                        </div>
                        <div className="text-center mt-2 flex justify-center items-center gap-2">
                             {isLocalMode && <Lock size={10} className="text-green-500" />}
                             <span className="text-[10px] text-gray-600">
                                {isLocalMode ? "Secure Environment. No data sent to cloud." : "Cloud Environment. Data processed by Groq."}
                             </span>
                        </div>
                    </div>
                </div>
            </>
        )}

        {/* --- VIEW: ANALYTICS --- */}
        {activeTab === 'analytics' && (
            <div className="flex-1 overflow-y-auto p-8 pt-16">
                <div className="max-w-5xl mx-auto space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <BarChart2 className="text-green-500" /> System Analytics
                        </h2>
                        <button onClick={loadAnalytics} className="p-2 bg-[#212121] rounded hover:bg-[#2a2a2a] text-gray-400 transition flex gap-2 items-center text-xs">
                             <RefreshCw size={14} /> Refresh Data
                        </button>
                    </div>

                    {!analytics ? (
                        <div className="text-gray-500 flex flex-col items-center justify-center h-64">
                            <RefreshCw className="animate-spin mb-2" />
                            Loading analytics...
                        </div>
                    ) : (
                        <>
                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4">
                                <div className="bg-[#1e1e1e] p-5 rounded-xl border border-white/5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><MessageSquare size={48} /></div>
                                    <div className="text-gray-500 text-xs uppercase font-bold tracking-wider">Total Queries</div>
                                    <div className="text-3xl font-bold text-white mt-2">{analytics.total}</div>
                                </div>
                                <div className="bg-[#1e1e1e] p-5 rounded-xl border border-white/5 relative overflow-hidden group">
                                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><Sparkles size={48} /></div>
                                    <div className="text-gray-500 text-xs uppercase font-bold tracking-wider">Avg Latency</div>
                                    <div className="text-3xl font-bold text-green-400 mt-2">{analytics.avg_latency}s</div>
                                </div>
                                <div className="bg-[#1e1e1e] p-5 rounded-xl border border-white/5 relative overflow-hidden group">
                                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><ThumbsUp size={48} /></div>
                                    <div className="text-gray-500 text-xs uppercase font-bold tracking-wider">User Sat.</div>
                                    <div className="text-3xl font-bold text-blue-400 mt-2">
                                        {analytics.likes > 0 ? Math.round((analytics.likes / (analytics.likes + analytics.dislikes || 1)) * 100) : 0}%
                                    </div>
                                </div>
                                <div className="bg-[#1e1e1e] p-5 rounded-xl border border-white/5 relative overflow-hidden group">
                                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><Bot size={48} /></div>
                                    <div className="text-gray-500 text-xs uppercase font-bold tracking-wider">Top Model</div>
                                    <div className="text-xl font-bold text-purple-400 mt-2 truncate">
                                        {/* Simple check to show most used model */}
                                        {Object.entries(analytics.models).sort(([,a]:any, [,b]:any) => b-a)[0]?.[0] || "N/A"}
                                    </div>
                                </div>
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-[#1e1e1e] p-6 rounded-xl border border-white/5">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-6">Latency Trend (Last 50)</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={analytics.history}>
                                                <XAxis dataKey="Timestamp" hide />
                                                <YAxis stroke="#555" fontSize={12} width={30} />
                                                <Tooltip 
                                                    contentStyle={{backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px'}} 
                                                    itemStyle={{color: '#fff'}}
                                                />
                                                <Line type="monotone" dataKey="Latency" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                
                                <div className="bg-[#1e1e1e] p-6 rounded-xl border border-white/5">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-6">Model Distribution</h3>
                                    <div className="h-64 overflow-y-auto pr-2">
                                        <div className="space-y-5">
                                            {Object.entries(analytics.models).map(([model, count]: any) => (
                                                <div key={model}>
                                                    <div className="flex justify-between text-sm mb-2">
                                                        <span className="font-mono text-gray-300 truncate w-3/4">{model}</span>
                                                        <span className="text-gray-500 text-xs">{count} queries</span>
                                                    </div>
                                                    <div className="w-full bg-gray-800 rounded-full h-2">
                                                        <div className="bg-blue-600 h-2 rounded-full transition-all duration-1000" style={{width: `${(count / analytics.total) * 100}%`}}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}