"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import styles from "./ChatPage.module.css";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import type { ChatAttachment, ChatMessage } from "@/types";
import type { ChatModelId } from "@/lib/models";
import logoFull from "@/assets/icons/logo-full.png";

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    role: "user",
    content: "Ftg",
    timestamp: "",
  },
  {
    id: "2",
    role: "assistant",
    content:
      'Hi! "Ftg" doesn\'t give me much to go on — could you tell me a bit more about what you\'re looking for? For example, is it an abbreviation, a typo, or something specific you\'d like help with?',
    timestamp: "",
  },
];

const conversationTitles: Record<string, string> = {
  "1": "Ftg",
  "2": "Three.js firearm geometry design",
  "3": "UI tablist สำหรับ mobile game landing",
  "4": "Minimal game loading screen design",
  "5": "SA-MP game files manifest generator",
};

function getTimeGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [greeting, setGreeting] = useState("Hello");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const updateGreeting = () => setGreeting(getTimeGreeting());
    updateGreeting();

    const greetingTimer = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(greetingTimer);
  }, []);

  const handleSend = useCallback(async (
    content: string,
    attachments: ChatAttachment[] = [],
    model: ChatModelId = "Zeta",
  ) => {
    if (abortControllerRef.current) return;

    // The welcome screen becomes the first chat as soon as the user sends a message.
    setSelectedConversationId((currentId) => currentId || "1");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      attachments,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    const requestMessages = [...messages, userMessage];
    setMessages(requestMessages);
    setError(null);
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, messages: requestMessages }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to generate a response. Check your connection and try again.");
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: payload.content,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError(requestError instanceof Error ? requestError.message : "Unable to generate a response.");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsGenerating(false);
      }
    }
  }, [messages]);

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    setMessages(id === "1" ? initialMessages : []);
  }, []);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
  }, []);

  const handleNewChat = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setMessages([]);
    setSelectedConversationId("");
    setError(null);
    setSidebarOpen(false);
  }, []);

  return (
    <div className={styles.layout}>
      {sidebarOpen && (
        <Sidebar
          onToggle={() => setSidebarOpen(false)}
          onNewChat={handleNewChat}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      )}

      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className={`${styles.main} ${!selectedConversationId ? styles.newMain : ""}`}>
        <Header
          title={conversationTitles[selectedConversationId] ?? "New chat"}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(true)}
        />
        {selectedConversationId ? (
          <>
            <div className={styles.chatArea}>
              <MessageList messages={messages} isGenerating={isGenerating} />
              <div className={styles.inputArea}>
                <div className={styles.inputMaxWidth}>
                  {error && <p className={styles.errorMessage} role="alert">{error}</p>}
                  <ChatInput onSend={handleSend} isGenerating={isGenerating} onStop={handleStop} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.welcomeArea}>
            <div className={styles.welcomeContent}>
              <div className={styles.welcomeIdentity}>
                <img src={logoFull.src} alt="Noema" className={styles.welcomeLogo} draggable={false} />
                <p className={styles.welcomeGreeting}>{greeting}</p>
                <p className={styles.welcomeName}>Mr Philip</p>
              </div>
              <div className={styles.welcomeInput}>
                {error && <p className={styles.errorMessage} role="alert">{error}</p>}
                <ChatInput onSend={handleSend} isGenerating={isGenerating} onStop={handleStop} variant="welcome" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
