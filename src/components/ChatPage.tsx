"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import styles from "./ChatPage.module.css";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import type { ChatMessage } from "@/types";
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

const markdownTestResponse = [
  "# Markdown test response",
  "",
  "This is **bold**, *italic*, ~~strikethrough~~, and `inline code`.",
  "",
  "> A blockquote rendered with GitHub Flavored Markdown.",
  "",
  "- Unordered item",
  "- [x] Completed task",
  "- [ ] Open task",
  "",
  "1. Ordered item",
  "2. Another ordered item",
  "",
  "| Feature | Status |",
  "| --- | --- |",
  "| GFM | Supported |",
  "| Code | Ready |",
  "",
  "```ts",
  "const answer = 'Markdown works';",
  "```",
].join("\n");

function getTimeGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [greeting, setGreeting] = useState("Hello");
  const [isGenerating, setIsGenerating] = useState(false);
  const generationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Clear any pending simulated response if the component unmounts.
  useEffect(() => {
    return () => {
      if (generationTimeoutRef.current)
        clearTimeout(generationTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const updateGreeting = () => setGreeting(getTimeGreeting());
    updateGreeting();

    const greetingTimer = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(greetingTimer);
  }, []);

  const handleSend = useCallback((content: string) => {
    // The welcome screen becomes the first chat as soon as the user sends a message.
    setSelectedConversationId((currentId) => currentId || "1");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulated assistant response
    setIsGenerating(true);
    generationTimeoutRef.current = setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          markdownTestResponse,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsGenerating(false);
    }, 3000);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    setMessages(id === "1" ? initialMessages : []);
  }, []);

  const handleStop = useCallback(() => {
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
      generationTimeoutRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setSelectedConversationId("");
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
                <ChatInput onSend={handleSend} isGenerating={isGenerating} onStop={handleStop} variant="welcome" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
