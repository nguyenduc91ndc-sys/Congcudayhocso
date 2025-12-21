import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Bot, User, Loader2, Trash2 } from 'lucide-react';
import { sendMessageToGemini, ChatMessage } from '../utils/geminiService';

interface ChatBoxProps {
    userName?: string;
}

export default function ChatBox({ userName }: ChatBoxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setError(null);

        // Add user message
        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const response = await sendMessageToGemini(userMessage, messages);
            setMessages([...newMessages, { role: 'assistant', content: response }]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearChat = () => {
        setMessages([]);
        setError(null);
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          fixed bottom-6 right-6 z-50
          w-16 h-16 rounded-full
          flex items-center justify-center
          shadow-2xl
          transition-all duration-300 ease-out
          ${isOpen
                        ? 'bg-gradient-to-r from-red-500 to-pink-500 rotate-90 scale-90'
                        : 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:scale-110 hover:shadow-purple-500/50'
                    }
        `}
                style={{
                    boxShadow: isOpen
                        ? '0 8px 32px rgba(239, 68, 68, 0.4)'
                        : '0 8px 32px rgba(147, 51, 234, 0.4)'
                }}
            >
                {isOpen ? (
                    <X className="w-7 h-7 text-white" />
                ) : (
                    <div className="relative">
                        <MessageCircle className="w-7 h-7 text-white" />
                        <Sparkles className="w-4 h-4 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
                    </div>
                )}
            </button>

            {/* Chat Panel */}
            <div
                className={`
          fixed bottom-24 right-6 z-40
          w-[380px] max-w-[calc(100vw-48px)]
          transition-all duration-300 ease-out
          ${isOpen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                    }
        `}
            >
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden flex flex-col"
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                        maxHeight: 'calc(100vh - 150px)'
                    }}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 px-5 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg">Trợ lý AI</h3>
                                    <p className="text-white/80 text-xs">Sẵn sàng hỗ trợ bạn ✨</p>
                                </div>
                            </div>
                            {messages.length > 0 && (
                                <button
                                    onClick={clearChat}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                    title="Xóa hội thoại"
                                >
                                    <Trash2 className="w-5 h-5 text-white/80" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 min-h-[200px] max-h-[350px] overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-purple-50/50 to-white/50">
                        {messages.length === 0 && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-purple-500" />
                                </div>
                                <p className="text-gray-600 font-medium">Xin chào{userName ? ` ${userName}` : ''}! 👋</p>
                                <p className="text-gray-500 text-sm mt-1">Hãy hỏi tôi bất cứ điều gì!</p>
                                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                    {['Hướng dẫn sử dụng', 'Mẹo giảng dạy', 'Trợ giúp bài tập'].map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => setInput(suggestion)}
                                            className="px-3 py-1.5 text-xs bg-white/80 hover:bg-white border border-purple-200 
                        rounded-full text-purple-600 hover:text-purple-700 transition-colors shadow-sm"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {/* Avatar */}
                                <div className={`
                  w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                  ${msg.role === 'user'
                                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                                        : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                    }
                `}>
                                    {msg.role === 'user'
                                        ? <User className="w-4 h-4 text-white" />
                                        : <Bot className="w-4 h-4 text-white" />
                                    }
                                </div>

                                {/* Message Bubble */}
                                <div className={`
                  max-w-[75%] px-4 py-2.5 rounded-2xl
                  ${msg.role === 'user'
                                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-md'
                                        : 'bg-white shadow-md border border-gray-100 text-gray-700 rounded-bl-md'
                                    }
                `}>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-white shadow-md border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                                        <span className="text-sm text-gray-500">Đang suy nghĩ...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                                ⚠️ {error}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Nhập câu hỏi..."
                                disabled={isLoading}
                                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                  text-gray-700 placeholder-gray-400 text-sm
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="w-12 h-12 flex items-center justify-center
                  bg-gradient-to-r from-purple-600 to-pink-500 
                  hover:from-purple-700 hover:to-pink-600
                  disabled:from-gray-300 disabled:to-gray-400
                  rounded-xl text-white shadow-lg
                  transition-all duration-200
                  disabled:cursor-not-allowed disabled:shadow-none
                  hover:shadow-purple-500/30"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
