import styles from "./Header.module.css";
import logoFull from "@/assets/icons/logo-full.png";

interface HeaderProps {
  title?: string;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export default function Header({
  title = "Ftg",
  onToggleSidebar,
  sidebarOpen = false,
}: HeaderProps) {
  return (
    <header className={styles.header}>
      {!sidebarOpen && (
        <button
          className={styles.sidebarToggle}
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open sidebar"
        >
          <img
            src={logoFull.src}
            alt="Noema"
            className={styles.sidebarToggleLogo}
            draggable={false}
          />
        </button>
      )}
      <div className={styles.titleArea}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.titleChevron} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="m4.5 6.5 3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <div className={styles.actions}>
        <button className={styles.shareButton} type="button">
          Share
        </button>
        <button
          className={styles.iconButton}
          type="button"
          aria-label="Conversation settings"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="9" cy="4" r="1.25" fill="currentColor" />
            <circle cx="9" cy="9" r="1.25" fill="currentColor" />
            <circle cx="9" cy="14" r="1.25" fill="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  );
}
