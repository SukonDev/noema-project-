"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import styles from "./ChatInput.module.css";
import logoFull from "@/assets/icons/logo-full.png";
import type { ChatAttachment } from "@/types";

interface ChatInputProps {
  onSend: (message: string, attachments: ChatAttachment[]) => void;
  isGenerating?: boolean;
  onStop?: () => void;
  variant?: "default" | "welcome";
}

export default function ChatInput({
  onSend,
  isGenerating = false,
  onStop,
  variant = "default",
}: ChatInputProps) {
  const [hasText, setHasText] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Zeta");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  const MODELS = [
    { id: "Zeta", label: "Zeta", hint: "Fastest" },
    { id: "Alpha", label: "Alpha", hint: "Balanced" },
    { id: "Beta", label: "Beta", hint: "Most powerful" },
  ] as const;
  const MAX_IMAGE_ATTACHMENTS = 4;

  // Close the menus when clicking outside of them.
  useEffect(() => {
    if (!menuOpen && !modelMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!attachRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (!modelRef.current?.contains(e.target as Node)) {
        setModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen, modelMenuOpen]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.min(el.scrollHeight, 200);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > 200 ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  const syncHasText = useCallback(() => {
    setHasText(!!textareaRef.current?.value.trim() || attachments.length > 0);
  }, [attachments.length]);

  const sendMessage = () => {
    if (isGenerating) return;
    const value = textareaRef.current?.value.trim();
    if (!value && attachments.length === 0) return;

    onSend(value ?? "", attachments);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
    setHasText(false);
    setAttachments([]);
  };

  const handleStop = () => {
    onStop?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleMenu = () => {
    // On phones, let the browser open the native file picker directly.
    // The custom upward menu is too easy to collide with the keyboard.
    if (window.matchMedia("(max-width: 768px)").matches) {
      setMenuOpen(false);
      fileInputRef.current?.click();
      return;
    }

    setMenuOpen((o) => !o);
  };

  const openFilePicker = (kind: "image" | "file") => {
    setMenuOpen(false);
    const input = kind === "image" ? imageInputRef.current : fileInputRef.current;
    input?.click();
  };

  // Close the menus with Escape.
  const handleAttachKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setMenuOpen(false);
      setModelMenuOpen(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    const currentImageCount = attachments.filter((item) => item.type.startsWith("image/")).length;
    const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));
    const otherFiles = selectedFiles.filter((file) => !file.type.startsWith("image/"));
    const availableImageSlots = Math.max(0, MAX_IMAGE_ATTACHMENTS - currentImageCount);

    if (imageFiles.length > availableImageSlots) {
      window.alert(`You can attach up to ${MAX_IMAGE_ATTACHMENTS} images per message.`);
    }

    const filesToAttach = [
      ...otherFiles,
      ...imageFiles.slice(0, availableImageSlots),
    ];

    const nextAttachments = await Promise.all(
      filesToAttach.map(async (file, index): Promise<ChatAttachment> => {
        const isText = file.type.startsWith("text/") ||
          /\.(md|txt|csv|json|xml|log|tsx?|jsx?|css|html)$/i.test(file.name);

        return {
          id: `${file.name}-${file.lastModified}-${index}`,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
          textContent: isText ? await file.text() : undefined,
        };
      }),
    );

    setAttachments((current) => [...current, ...nextAttachments]);
    setHasText(true);

    // TODO: hook up real upload logic — for now just log the selection.
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => {
      const attachment = current.find((item) => item.id === id);
      if (attachment?.url) URL.revokeObjectURL(attachment.url);
      const next = current.filter((item) => item.id !== id);
      setHasText(!!textareaRef.current?.value.trim() || next.length > 0);
      return next;
    });
  };

  return (
    <div className={`${styles.wrapper} ${variant === "welcome" ? styles.welcomeWrapper : ""}`}>
      <form
        className={styles.container}
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder="How can I help you today?"
          rows={1}
          onKeyDown={handleKeyDown}
          onInput={(e) => {
            adjustHeight();
            syncHasText();
          }}
          aria-label="Message input"
        />
        {attachments.length > 0 && (
          <div className={styles.attachmentList} aria-label="Attached files">
            {attachments.map((attachment) => (
              <div
                className={`${styles.attachmentChip} ${attachment.url ? styles.imageAttachmentChip : ""}`}
                key={attachment.id}
              >
                {attachment.url ? (
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className={styles.attachmentThumb}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPreviewUrl(attachment.url ?? null)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setPreviewUrl(attachment.url ?? null);
                      }
                    }}
                    aria-label={`Preview ${attachment.name}`}
                  />
                ) : (
                  <span className={styles.attachmentFileIcon} aria-hidden="true">文</span>
                )}
                <span className={styles.attachmentName} title={attachment.name}>
                  {attachment.name}
                </span>
                <button
                  type="button"
                  className={styles.attachmentRemove}
                  onClick={() => removeAttachment(attachment.id)}
                  aria-label={`Remove ${attachment.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {previewUrl && typeof document !== "undefined" && createPortal(
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
          </div>,
          document.body,
        )}
        <div className={styles.inputRow}>
          <div
            ref={attachRef}
            className={styles.attachWrapper}
            onKeyDown={handleAttachKeyDown}
          >
            <button
              className={styles.attachButton}
              type="button"
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Attach image or file"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 3v12M3 9h12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {menuOpen && (
              <div className={styles.menu} role="menu">
                <button
                  className={styles.menuItem}
                  type="button"
                  role="menuitem"
                  onClick={() => openFilePicker("image")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="2.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
                    <circle cx="5.7" cy="6.3" r="1.2" fill="currentColor" />
                    <path d="M2.5 11.5l3-3 2.5 2.5 2-2 3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Upload image
                </button>
                <button
                  className={styles.menuItem}
                  type="button"
                  role="menuitem"
                  onClick={() => openFilePicker("file")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M9.5 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V5.5l-4-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M9.5 1.5v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                  Upload file
                </button>
              </div>
            )}
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleFileChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.zip"
            multiple
            hidden
            onChange={handleFileChange}
          />
          <div className={styles.rightControls}>
            <div
              ref={modelRef}
              className={styles.attachWrapper}
              onKeyDown={handleAttachKeyDown}
            >
              <button
                className={styles.modelPicker}
                type="button"
                aria-label="Choose model"
                aria-haspopup="listbox"
                aria-expanded={modelMenuOpen}
                onClick={() => setModelMenuOpen((o) => !o)}
              >
                {selectedModel}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="m4.5 6.5 3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {modelMenuOpen && (
                <div
                  className={`${styles.menu} ${styles.modelMenu}`}
                  role="listbox"
                  aria-label="Models"
                >
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      className={styles.menuItem}
                      type="button"
                      role="option"
                      aria-selected={selectedModel === m.id}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setModelMenuOpen(false);
                      }}
                    >
                      <img
                        src={logoFull.src}
                        alt=""
                        className={styles.modelLogo}
                        draggable={false}
                      />
                      <span className={styles.modelOptionText}>
                        <span>{m.label}</span>
                        <span className={styles.modelHint}>{m.hint}</span>
                      </span>
                      {selectedModel === m.id && (
                        <svg
                          className={styles.modelCheck}
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="m3.5 8.25 3 3 6-6"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isGenerating ? (
            <button
              className={`${styles.sendButton} ${styles.stopButton}`}
              type="button"
              onClick={handleStop}
              aria-label="Stop generating"
            >
              <span className={styles.stopIcon} aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill="currentColor" />
                </svg>
              </span>
            </button>
            ) : (
            <button
              className={styles.sendButton}
              type="submit"
              disabled={!hasText}
              aria-label="Send message"
            >
              <span className={styles.sendIcon} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 13V3M3.5 7.5 8 3l4.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
