import styles from "./ThinkingIndicator.module.css";
import logoFull from "@/assets/icons/logo-full.png";

export default function ThinkingIndicator() {
  return (
    <div className={styles.thinking} role="status" aria-label="AI is thinking">
      <div className={styles.icon} aria-hidden="true">
        <img className={styles.logo} src={logoFull.src} alt="" draggable={false} />
      </div>
      <span className={styles.label}>Thinking...</span>
    </div>
  );
}
