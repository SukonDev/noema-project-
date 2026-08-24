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
  const lastModelRef = useRef<ChatModelId>("Zeta");

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
    baseMessages: ChatMessage[] = messages,
  ) => {
    if (abortControllerRef.current) return;
    lastModelRef.current = model;

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
    const requestMessages = [...baseMessages, userMessage];
    setMessages(requestMessages);
    setError(null);
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    let streamedContent = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, messages: requestMessages }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to generate a response. Check your connection and try again.");
      }

      if (!response.body) throw new Error("The response did not include a readable stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const result = await reader.read();
        buffer += decoder.decode(result.value, { stream: !result.done });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";

        for (const event of events) {
          const dataLine = event
            .split(/\r?\n/)
            .find((line) => line.startsWith("data:"));
          if (!dataLine) continue;

          const payload = JSON.parse(dataLine.slice(5).trim()) as {
            text?: string;
            done?: boolean;
            error?: string;
          };
          if (payload.error) throw new Error(payload.error);
          if (payload.text) {
            streamedContent += payload.text;
            setMessages((current) => {
              const assistantExists = current.some((message) => message.id === assistantId);
              if (!assistantExists) {
                return [...current, { ...assistantMessage, content: streamedContent }];
              }
              return current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: streamedContent }
                  : message,
              );
            });
          }
          if (payload.done) done = true;
        }

        if (result.done) done = true;
      }

      if (!streamedContent) throw new Error("MaxPlus AI returned an empty response.");
    } catch (requestError) {
      setMessages((current) =>
        streamedContent && !(requestError instanceof DOMException && requestError.name === "AbortError")
          ? current
          : current.filter((message) => message.id !== assistantId),
      );
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError(requestError instanceof Error ? requestError.message : "Unable to generate a response.");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsGenerating(false);
      }
    }
  }, [messages]);

  const handleRetry = useCallback((assistantId: string) => {
    if (abortControllerRef.current) return;

    const assistantIndex = messages.findIndex((message) => message.id === assistantId);
    if (assistantIndex < 0) return;

    const userIndex = messages
      .slice(0, assistantIndex)
      .map((message) => message.role)
      .lastIndexOf("user");
    if (userIndex < 0) return;

    const userMessage = messages[userIndex];
    const history = messages.slice(0, userIndex);
    setMessages(history);
    void handleSend(
      userMessage.content,
      userMessage.attachments ?? [],
      lastModelRef.current,
      history,
    );
  }, [handleSend, messages]);

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
              <MessageList messages={messages} isGenerating={isGenerating} onRetry={handleRetry} />
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
