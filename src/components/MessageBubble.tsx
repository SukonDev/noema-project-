"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./MessageBubble.module.css";
import type { ChatMessage, GeneratedFile } from "@/types";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import logoFull from "@/assets/icons/logo-full.png";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onRetry?: () => void;
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) throw new Error("Copy failed");
}

function downloadFile(file: GeneratedFile) {
  const blob = new Blob([file.content], { type: file.mimeType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewCloseRef = useRef<HTMLButtonElement>(null);
  const isHtml = language === "html" || language === "htm";

  useEffect(() => {
    if (!previewOpen) return;

    previewCloseRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [previewOpen]);

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
        <div className={styles.codeActions}>
          {isHtml && (
            <button
              className={styles.codePreview}
              type="button"
              onClick={() => setPreviewOpen(true)}
              aria-label="Preview HTML"
            >
              Preview
            </button>
          )}
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
      </div>
      <pre>
        <code>{code}</code>
      </pre>
      {previewOpen && (
        <div
          className={styles.htmlPreviewOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="html-preview-title"
          onClick={() => setPreviewOpen(false)}
        >
          <div className={styles.htmlPreviewDialog} onClick={(event) => event.stopPropagation()}>
            <div className={styles.htmlPreviewHeader}>
              <h2 id="html-preview-title">HTML preview</h2>
              <button
                ref={previewCloseRef}
                className={styles.htmlPreviewClose}
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="Close HTML preview"
              >
                ×
              </button>
            </div>
            <iframe
              className={styles.htmlPreviewFrame}
              title="HTML preview"
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              srcDoc={code}
            />
          </div>
        </div>
      )}
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

export default function MessageBubble({ message, isStreaming = false, onRetry }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);
  const [actionStatus, setActionStatus] = useState("");

  const copyAnswer = async () => {
    try {
      await copyToClipboard(message.content);
      setCopied(true);
      setActionStatus("Copied");
      window.setTimeout(() => {
        setCopied(false);
        setActionStatus("");
      }, 1600);
    } catch {
      setActionStatus("Copy failed");
    }
  };

  const setResponseFeedback = (nextFeedback: "like" | "dislike") => {
    setFeedback((current) => (current === nextFeedback ? null : nextFeedback));
    setActionStatus(feedback === nextFeedback ? "" : "Thanks for the feedback");
  };

  return (
    <div
      className={`${styles.row} ${isUser ? styles.rowUser : styles.rowAssistant}`}
    >
      {isUser ? (
        <div className={`${styles.bubble} ${styles.bubbleUser}`}>
          {message.attachments && message.attachments.length > 0 && (
            <div className={styles.messageAttachments}>
              {message.attachments.map((attachment) => (
                <div className={styles.messageAttachment} key={attachment.id}>
                  {attachment.url ? (
                    <button
                      type="button"
                      className={styles.messageAttachmentPreviewButton}
                      onClick={() => setPreviewUrl(attachment.url ?? null)}
                      aria-label={`Preview ${attachment.name}`}
                    >
                      <img src={attachment.url} alt={attachment.name} className={styles.messageAttachmentImage} />
                    </button>
                  ) : (
                    <span className={styles.messageAttachmentIcon} aria-hidden="true">文</span>
                  )}
                  <span className={styles.messageAttachmentName}>{attachment.name}</span>
                </div>
              ))}
            </div>
          )}
          {message.content && <p className={styles.text}>{message.content}</p>}
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

            {message.files && message.files.length > 0 && (
              <div className={styles.generatedFiles} aria-label="Generated files">
                {message.files.map((file) => (
                  <button
                    className={styles.generatedFile}
                    key={`${file.name}-${file.content.length}`}
                    type="button"
                    onClick={() => downloadFile(file)}
                    title={`Download ${file.name}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M8 2v8m0 0 3-3m-3 3L5 7M3 13.5h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>
            )}

            {!isStreaming && message.content.trim() && (
              <div className={styles.assistantMeta}>
                <button
                  className={`${styles.metaButton} ${copied ? styles.metaButtonActive : ""}`}
                  type="button"
                  onClick={copyAnswer}
                  aria-label={copied ? "Copied answer" : "Copy answer"}
                  title={copied ? "Copied" : "Copy answer"}
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
                <button
                  className={`${styles.metaButton} ${feedback === "like" ? styles.metaButtonActive : ""}`}
                  type="button"
                  onClick={() => setResponseFeedback("like")}
                  aria-label="Like answer"
                  aria-pressed={feedback === "like"}
                  title="Like answer"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4.5 7.5 7 2.5c.9 0 1.5.7 1.5 1.5v2.5h3.6c.8 0 1.4.8 1.2 1.6l-1 4.4a1.5 1.5 0 0 1-1.5 1.2H4.5m0-6.2v6.2m0-6.2H2.5v6.2h2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  className={`${styles.metaButton} ${feedback === "dislike" ? styles.metaButtonActive : ""}`}
                  type="button"
                  onClick={() => setResponseFeedback("dislike")}
                  aria-label="Dislike answer"
                  aria-pressed={feedback === "dislike"}
                  title="Dislike answer"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: "rotate(180deg)" }}>
                    <path d="M4.5 7.5 7 2.5c.9 0 1.5.7 1.5 1.5v2.5h3.6c.8 0 1.4.8 1.2 1.6l-1 4.4a1.5 1.5 0 0 1-1.5 1.2H4.5m0-6.2v6.2m0-6.2H2.5v6.2h2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                </button>
                {onRetry && (
                  <button
                    className={styles.metaButton}
                    type="button"
                    onClick={onRetry}
                    aria-label="Retry answer"
                    title="Retry answer"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
                {actionStatus && <span className={styles.actionStatus} role="status">{actionStatus}</span>}
              </div>
            )}
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

      {previewUrl && (
        <div
          className={styles.previewOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            className={styles.previewClose}
            onClick={() => setPreviewUrl(null)}
            aria-label="Close image preview"
          >
            ×
          </button>
          <img
            src={previewUrl}
            alt="Attachment preview"
            className={styles.previewImage}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
