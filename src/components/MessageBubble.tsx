"use client";

import { useState } from "react";
import styles from "./MessageBubble.module.css";
import type { ChatMessage } from "@/types";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import logoFull from "@/assets/icons/logo-full.png";

interface MessageBubbleProps {
  message: ChatMessage;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!navigator.clipboard) return;

    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeToolbar}>
        <span className={styles.codeLanguage}>{language ?? "code"}</span>
        <button
          className={`${styles.codeCopy} ${copied ? styles.codeCopyCopied : ""}`}
          type="button"
          onClick={copyCode}
          aria-label={copied ? "Copied" : "Copy code"}
          title={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          )}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

const markdownComponents = {
  code({ className, children, ...props }) {
    const language = /language-(\w+)/.exec(className ?? "")?.[1];
    const code = String(children).replace(/\n$/, "");
    const isBlock = Boolean(language) || code.includes("\n");

    if (isBlock) {
      return <CodeBlock code={code} language={language} />;
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
} satisfies Components;

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`${styles.row} ${isUser ? styles.rowUser : styles.rowAssistant}`}
    >
      {isUser ? (
        <div className={`${styles.bubble} ${styles.bubbleUser}`}>
          <p className={styles.text}>{message.content}</p>
        </div>
      ) : (
        <div className={styles.assistantMessage}>
          <div className={styles.assistantIcon} aria-hidden="true">
            <img src={logoFull.src} alt="" draggable={false} />
          </div>
          <div className={styles.assistantBody}>
            <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
              <div className={`${styles.text} ${styles.markdown}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>

            <div className={styles.assistantMeta}>
              <button className={styles.metaButton} type="button" aria-label="Copy">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
              <button className={styles.metaButton} type="button" aria-label="Read aloud">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2.5 6v4h2.5L9 13V3L5 6H2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M11 5.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
              <button className={styles.metaButton} type="button" aria-label="Good response">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4.5 7.5 7 2.5c.9 0 1.5.7 1.5 1.5v2.5h3.6c.8 0 1.4.8 1.2 1.6l-1 4.4a1.5 1.5 0 0 1-1.5 1.2H4.5m0-6.2v6.2m0-6.2H2.5v6.2h2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
              </button>
              <button className={styles.metaButton} type="button" aria-label="Bad response">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: "rotate(180deg)" }}>
                  <path d="M4.5 7.5 7 2.5c.9 0 1.5.7 1.5 1.5v2.5h3.6c.8 0 1.4.8 1.2 1.6l-1 4.4a1.5 1.5 0 0 1-1.5 1.2H4.5m0-6.2v6.2m0-6.2H2.5v6.2h2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
              </button>
              <button className={styles.metaButton} type="button" aria-label="Retry">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {isUser ? (
        <div className={styles.userMeta}>
          <button className={styles.metaButton} type="button" aria-label="Retry">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className={styles.metaButton} type="button" aria-label="Copy">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <button className={styles.metaButton} type="button" aria-label="Edit">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 11.5 10.5 4a1.4 1.4 0 0 1 2 2L5 13.5H3v-2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
