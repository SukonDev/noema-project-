import styles from "./ThinkingIndicator.module.css";
import logoFull from "@/assets/icons/logo-full.png";

interface ThinkingIndicatorProps {
  label?: string;
}

export default function ThinkingIndicator({ label = "Thinking..." }: ThinkingIndicatorProps) {
  return (
    <div className={styles.thinking} role="status" aria-label={label}>
      <div className={styles.icon} aria-hidden="true">
        <img className={styles.logo} src={logoFull.src} alt="" draggable={false} />
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
