import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, LogOut, Radio, User, Loader2 } from 'lucide-react';

// For Monolithic deployment, io() auto-connects to window.location.origin

export default function App() {
  const [socket, setSocket] = useState(null);
  const [view, setView] = useState('LANDING'); // LANDING, SEARCHING, CHATTING
  const [name, setName] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [partnerActive, setPartnerActive] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom on new message
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connectToSocket = () => {
    if (!name.trim()) return;

    // Same-origin connection for monolithic deployment
    const newSocket = io();
    setSocket(newSocket);
    setView('SEARCHING');

    newSocket.on('connect', () => {
      console.log('Connected to server with ID:', newSocket.id);
      newSocket.emit('join_queue', { name });
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    newSocket.on('match_found', ({ partnerName }) => {
      console.log('Match found!');
      setView('CHATTING');
      setMessages([]); // Clear previous chat
      setPartnerActive(true);
    });

    newSocket.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    newSocket.on('partner_disconnected', () => {
      setMessages((prev) => [...prev, { system: true, text: 'Stranger has disconnected.' }]);
      setPartnerActive(false);
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket || !partnerActive) return;

    const msg = { text: inputText, sender: 'me', timestamp: Date.now() };
    socket.emit('send_message', msg);
    setMessages((prev) => [...prev, msg]);
    setInputText('');
  };

  const handleNext = () => {
    if (socket) {
      setView('SEARCHING');
      setMessages([]);
      setPartnerActive(false);
      socket.emit('next_partner');
    }
  };

  const handleEndChat = () => {
    if (socket) socket.disconnect();
    setSocket(null);
    setView('LANDING');
    setMessages([]);
    setPartnerActive(false);
  };

  // -- RENDER HELPERS --

  if (view === 'LANDING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-zinc-950 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-900/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl shadow-2xl space-y-8 text-center ring-1 ring-white/5">
          <div className="space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Radio className="text-white w-6 h-6" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">unseen</h1>
            <p className="text-zinc-400">Talk to someone you’ve never met.</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && connectToSocket()}
              className="w-full bg-zinc-950/50 border border-zinc-800 text-white px-5 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-600/50 placeholder:text-zinc-600 transition-all font-medium"
            />
            <button
              onClick={connectToSocket}
              disabled={!name.trim()}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98]"
            >
              Connect
            </button>
          </div>

          <p className="text-xs text-zinc-600 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Completely anonymous & encrypted
          </p>
        </div>
      </div>
    );
  }

  if (view === 'SEARCHING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 relative overflow-hidden">
        {/* Pulse Animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-64 bg-violet-500/10 rounded-full animate-pulse-slow"></div>
          <div className="absolute w-48 h-48 bg-violet-500/10 rounded-full animate-pulse-slow delay-75"></div>
          <div className="absolute w-32 h-32 bg-violet-500/10 rounded-full animate-pulse-slow delay-150"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full p-1 shadow-2xl ring-1 ring-white/10 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin"></div>
            <User className="w-8 h-8 text-violet-400" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-white">Looking for someone out there...</h2>
            <p className="text-zinc-500 text-sm">Finding a stranger to chat with anonymously.</p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 py-2 px-4 rounded-full flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
            <span className="text-xs font-medium text-zinc-300">Searching for matches</span>
            <span className="text-[10px] font-bold text-violet-500 tracking-wider bg-violet-500/10 px-2 py-0.5 rounded">ACTIVE</span>
          </div>

          <button onClick={handleEndChat} className="mt-8 text-zinc-500 hover:text-white text-sm transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // CHATTING VIEW
  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      {/* Header */}
      <header className="flex-none h-16 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center text-violet-400">
            <Radio className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <h1 className="font-bold text-white tracking-tight">unseen</h1>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${partnerActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              <span className="text-xs text-zinc-400 font-medium">
                {partnerActive ? 'Connected to a stranger' : 'Stranger disconnected'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEndChat}
            className="hidden sm:flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            End Chat
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6 scrollbar-hide">
        {messages.map((msg, idx) => {
          if (msg.system) {
            return (
              <div key={idx} className="flex justify-center my-4">
                <span className="bg-zinc-900/80 text-zinc-500 text-xs py-1 px-3 rounded-full border border-zinc-800">
                  {msg.text}
                </span>
              </div>
            );
          }
          const isMe = msg.sender === 'me';
          return (
            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-5 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed break-words ${isMe
                  ? 'bg-violet-600 text-white rounded-tr-sm'
                  : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-sm'
                  }`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-zinc-600 px-1 opacity-0 hover:opacity-100 transition-opacity">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Input / Control Area */}
      <footer className="flex-none p-4 sm:p-6 bg-zinc-950 border-t border-zinc-900/50">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Controls */}
          {!partnerActive && (
            <div className="flex justify-center pb-2">
              <button onClick={handleNext} className="bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                Find Next Stranger
              </button>
            </div>
          )}

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={partnerActive ? "Say something..." : "Waiting for connection..."}
              disabled={!partnerActive}
              className="flex-1 bg-zinc-900/50 border border-zinc-800 text-white pl-5 pr-12 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-600/50 placeholder:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || !partnerActive}
              className="absolute right-2 p-2 bg-violet-600 rounded-xl text-white shadow-lg hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          {/* Mobile Bottom Actions */}
          <div className="flex sm:hidden justify-between items-center px-2 pt-2">
            <button onClick={handleEndChat} className="text-zinc-500 text-xs hover:text-white flex items-center gap-1">
              <LogOut className="w-3 h-3" /> End Chat
            </button>
            {partnerActive && (
              <button onClick={handleNext} className="text-zinc-400 text-xs hover:text-white font-medium border border-zinc-800 px-3 py-1 rounded-full">
                Next Stranger
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
