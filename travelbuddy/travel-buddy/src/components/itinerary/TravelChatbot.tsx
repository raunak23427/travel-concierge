"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, ChevronDown } from "lucide-react";

interface ChatMessage {
    role: "user" | "bot";
    text: string;
}

const SUGGESTED_QUESTIONS = [
    "What should I pack for this destination?",
    "Do I need any documents, visas, or special requirements?",
    "What are the must-see attractions and top things to do?",
    "How do I get around once I arrive?",
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/api";

/** Parse basic markdown-like text into React elements */
function formatBotMessage(text: string) {
    const lines = text.split("\n").filter((l) => l.trim() !== "");

    return lines.map((line, idx) => {
        const trimmed = line.trim();
        const isBullet = /^[•\-\*]\s+/.test(trimmed);
        const content = isBullet ? trimmed.replace(/^[•\-\*]\s+/, "") : trimmed;

        // Convert **bold** to <strong> tags
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return (
                    <strong key={j} className="font-bold">
                        {part.slice(2, -2)}
                    </strong>
                );
            }
            return part;
        });

        if (isBullet) {
            return (
                <div key={idx} className="flex gap-2 items-start" style={{ marginBottom: 4 }}>
                    <span className="text-[#E25A0F] font-bold flex-shrink-0 mt-px">•</span>
                    <span>{rendered}</span>
                </div>
            );
        }

        return (
            <p key={idx} style={{ marginBottom: idx < lines.length - 1 ? 8 : 0 }}>
                {rendered}
            </p>
        );
    });
}

/**
 * Build the assistant's context from whatever the app knows right now.
 *
 * Read fresh on every send rather than captured once, so the assistant stays
 * in step with the itinerary — swap a restaurant and the next answer knows.
 * Falls back to the saved trip in storage when no live itinerary is passed.
 */
function collectTripContext(live?: any, destination?: string) {
    const ctx: any = { destination: destination || "Goa, India" };
    try {
        const modes = localStorage.getItem("travelbuddy:transport-modes");
        if (modes) ctx.transportModes = JSON.parse(modes);
    } catch { /* private mode */ }

    let trip: any = null;
    try {
        const scopeKey = Object.keys(localStorage).find((k) =>
            k.startsWith("tb:travel:v1:"),
        );
        if (scopeKey) trip = JSON.parse(localStorage.getItem(scopeKey) || "{}")?.trip;
    } catch { /* ignore */ }

    const itin = live || trip;
    if (itin) {
        ctx.destination = itin.destination || ctx.destination;
        ctx.days = (itin.days || []).map((d: any) => ({
            day: d.day,
            title: d.title,
            items: (d.items || []).map((i: any) => ({
                time: i.time, activity: i.activity, description: i.description,
                cost: i.cost, type: i.type,
            })),
        }));
        ctx.totalCost = itin.totalCost;
        if (itin.startDate || itin.endDate)
            ctx.stay = { checkIn: itin.startDate, checkOut: itin.endDate };
        ctx.booked = Boolean(itin.bookedAt || trip?.bookedAt);
    }
    return ctx;
}

export default function TravelChatbot({
    destination,
    country,
    sessionId,
    itinerary,
    launcherClassName = "",
}: {
    destination: string;
    country: string;
    sessionId?: string;
    /** Live itinerary when one is on screen, so edits are reflected instantly. */
    itinerary?: any;
    launcherClassName?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [alertContext, setAlertContext] = useState<Record<string, unknown> | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    // Mirror of the transcript so sendQuestion can include it without
    // re-creating the callback on every message.
    const historyRef = useRef<ChatMessage[]>([]);
    useEffect(() => { historyRef.current = messages; }, [messages]);

    // Other travel surfaces can bring the assistant forward with a focused
    // question. Keeping this as an in-app event avoids losing the traveller's
    // current page or the chat transcript.
    useEffect(() => {
        const openAssistant = (event: Event) => {
            const detail = (event as CustomEvent<{
                question?: string;
                context?: Record<string, unknown>;
            }>).detail;
            setIsOpen(true);
            if (detail?.question) setInput(detail.question);
            if (detail?.context) setAlertContext(detail.context);
        };

        window.addEventListener("travel-assistant:open", openAssistant);
        return () => window.removeEventListener("travel-assistant:open", openAssistant);
    }, []);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const sendQuestion = useCallback(
        async (question: string) => {
            if (!question.trim() || loading) return;

            setMessages((prev) => [...prev, { role: "user", text: question }]);
            setInput("");
            setLoading(true);

            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        question,
                        history: historyRef.current.slice(-8),
                        context: {
                            ...collectTripContext(itinerary, destination),
                            ...(alertContext ? { weatherAlert: alertContext } : {}),
                        },
                    }),
                });

                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.error || "Failed to get answer");
                setMessages((prev) => [...prev, { role: "bot", text: data.answer }]);
            } catch (err) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "bot",
                        text:
                            err instanceof Error && err.message && !/failed to fetch/i.test(err.message)
                                ? err.message
                                : "I couldn't reach the assistant just then. Try again in a moment.",
                    },
                ]);
            } finally {
                setLoading(false);
            }
        },
        [alertContext, destination, loading, itinerary]
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendQuestion(input);
    };

    return (
        <>
            {/* ═══ Floating Chat Button ═══ */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        onClick={() => setIsOpen(true)}
                        aria-label="Open travel assistant"
                        title="Travel assistant"
                        className={`fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full bg-[#1A1A1A] flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.25)] active:scale-90 transition-transform ${launcherClassName}`}
                    >
                        <MessageCircle className="w-6 h-6 text-[#FF6B1A]" />
                        {/* Pulse ring */}
                        <motion.div
                            className="absolute inset-0 rounded-full border-2 border-[#FF6B1A]"
                            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ═══ Chat Panel ═══ */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: "100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 300 }}
                        className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[448px] z-[60] flex flex-col bg-[#F5F3FF]"
                    >
                        {/* ── Header ── */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-3">
                            <div className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/wayzyy-logo.svg" alt="" width={40} height={40}
                                    className="w-10 h-10 rounded-xl shadow-[0_3px_10px_rgba(255,107,26,0.35)]" />
                                <div>
                                    <h3 className="text-[16px] font-bold text-[#1A1A1A]">
                                        Travel Assistant
                                    </h3>
                                    <p className="text-[11px] text-[#8E8E93]">
                                        Ask anything about {destination}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                aria-label="Close travel assistant"
                                className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                            >
                                <X className="w-4.5 h-4.5 text-[#6B6B6B]" />
                            </button>
                        </div>

                        {/* ── Messages ── */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto px-4 pb-4 no-scrollbar"
                            style={{ scrollBehavior: "smooth" }}
                        >
                            {/* Welcome message */}
                            {messages.length === 0 && !loading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center text-center pt-6 pb-4"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-[#FF6B1A]/20 flex items-center justify-center mb-4">
                                        <MessageCircle className="w-8 h-8 text-[#E25A0F]" />
                                    </div>
                                    <h4 className="text-[18px] font-bold text-[#1A1A1A] mb-1">
                                        Hi there! 👋
                                    </h4>
                                    <p className="text-[13px] text-[#8E8E93] max-w-[260px]">
                                        I can help you with everything about your trip to{" "}
                                        <span className="font-semibold text-[#1A1A1A]">
                                            {destination}
                                        </span>
                                        . Try one of these:
                                    </p>

                                    {/* Suggested questions */}
                                    <div className="flex flex-col gap-2.5 mt-5 w-full">
                                        {SUGGESTED_QUESTIONS.map((q, i) => (
                                            <motion.button
                                                key={i}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.15 + i * 0.08 }}
                                                onClick={() => sendQuestion(q)}
                                                className="w-full text-left px-4 py-3 rounded-2xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.04)] text-[13px] font-medium text-[#1A1A1A] active:scale-[0.98] transition-transform border border-[#F2F2F7] hover:border-[#FF6B1A] hover:bg-[#FFF3EC]"
                                            >
                                                <span className="text-[#E25A0F] mr-2">✦</span>
                                                {q}
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Chat messages */}
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-3`}
                                >
                                    <div
                                        className={`max-w-[85%] px-4 py-3 text-[13px] leading-relaxed ${
                                            msg.role === "user"
                                                ? "bg-[#1A1A1A] text-white rounded-[20px] rounded-br-md"
                                                : "bg-white text-[#1A1A1A] rounded-[20px] rounded-bl-md shadow-[0_1px_6px_rgba(0,0,0,0.05)]"
                                        }`}
                                        style={msg.role === "user" ? { whiteSpace: "pre-wrap" } : {}}
                                    >
                                        {msg.role === "bot" ? formatBotMessage(msg.text) : msg.text}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Loading indicator */}
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start mb-3"
                                >
                                    <div className="bg-white rounded-[20px] rounded-bl-md px-5 py-3.5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex items-center gap-1.5">
                                        <motion.div
                                            className="w-2 h-2 rounded-full bg-[#FF6B1A]"
                                            animate={{ y: [0, -6, 0] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                        />
                                        <motion.div
                                            className="w-2 h-2 rounded-full bg-[#E25A0F]"
                                            animate={{ y: [0, -6, 0] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                                        />
                                        <motion.div
                                            className="w-2 h-2 rounded-full bg-[#FF6B1A]"
                                            animate={{ y: [0, -6, 0] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* Re-show suggestions if chat has messages */}
                            {messages.length > 0 && !loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="pt-2 pb-1"
                                >
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <ChevronDown className="w-3 h-3 text-[#C7C7CC]" />
                                        <span className="text-[10px] text-[#C7C7CC] font-medium uppercase tracking-wider">
                                            More questions
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {SUGGESTED_QUESTIONS.map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => sendQuestion(q)}
                                                className="text-[11px] font-medium text-[#6B6B6B] bg-white px-3 py-2 rounded-full border border-[#E5E5EA] active:scale-95 transition-transform hover:border-[#FF6B1A] hover:text-[#1A1A1A]"
                                            >
                                                {q.length > 35 ? q.substring(0, 35) + "…" : q}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* ── Input Bar ── */}
                        <form
                            onSubmit={handleSubmit}
                            className="px-4 pb-6 pt-2"
                        >
                            <div className="flex items-center gap-2 bg-white rounded-full shadow-[0_2px_16px_rgba(0,0,0,0.06)] px-4 py-1.5 border border-[#F2F2F7]">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={`Ask about ${destination}...`}
                                    disabled={loading}
                                    className="flex-1 bg-transparent text-[14px] text-[#1A1A1A] placeholder-[#C7C7CC] outline-none py-2.5"
                                />
                                <motion.button
                                    type="submit"
                                    whileTap={{ scale: 0.85 }}
                                    disabled={!input.trim() || loading}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                                        input.trim()
                                            ? "bg-[#FF6B1A] text-[#1A1A1A]"
                                            : "bg-[#F2F2F7] text-[#C7C7CC]"
                                    }`}
                                >
                                    <Send className="w-4 h-4" />
                                </motion.button>
                            </div>
                            <p className="text-center text-[9px] text-[#C7C7CC] mt-2">
                                Powered by Gemini AI · Answers may not be 100% accurate
                            </p>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
