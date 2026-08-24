"use client";

import { useRef, useEffect } from "react";
import styles from "./MessageList.module.css";
import MessageBubble from "./MessageBubble";
import ThinkingIndicator from "./ThinkingIndicator";
import type { ChatMessage } from "@/types";

interface MessageListProps {
  messages: ChatMessage[];
  isGenerating?: boolean;
  onRetry?: (messageId: string) => void;
}

export default function MessageList({ messages, isGenerating = false, onRetry }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className={styles.scrollArea} role="log" aria-label="Chat messages">
      <div className={styles.inner}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
              >
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle cx="18" cy="20" r="2" fill="currentColor" />
                <circle cx="30" cy="20" r="2" fill="currentColor" />
                <path
                  d="M16 32c2 3 5.5 4.5 8 4.5s6-1.5 8-4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Start a conversation</h2>
            <p className={styles.emptyText}>
              Ask anything — from code reviews to creative writing.
            </p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`${styles.messageRow} ${msg.role === "user" ? styles.userMessageRow : ""}`}
          >
            <MessageBubble
              message={msg}
              isStreaming={isGenerating && index === messages.length - 1 && msg.role === "assistant"}
              onRetry={onRetry && msg.role === "assistant" ? () => onRetry(msg.id) : undefined}
            />
          </div>
        ))}

        {isGenerating && messages[messages.length - 1]?.role !== "assistant" && (
          <div className={styles.messageRow}>
            <ThinkingIndicator />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
