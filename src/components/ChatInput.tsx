"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./ChatInput.module.css";
import logoFull from "@/assets/icons/logo-full.png";

interface ChatInputProps {
  onSend: (message: string) => void;
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
    setHasText(!!textareaRef.current?.value.trim());
  }, []);

  const sendMessage = () => {
    if (isGenerating) return;
    const value = textareaRef.current?.value.trim();
    if (!value) return;

    onSend(value);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
    setHasText(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // TODO: hook up real upload logic — for now just log the selection.
    console.log(
      "Attached files:",
      Array.from(files).map((f) => f.name),
    );
    e.target.value = "";
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
