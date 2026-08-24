import styles from "./Sidebar.module.css";
import type { Conversation } from "@/types";
import logoBrand from "@/assets/icons/logo-brand.png";
import logoFull from "@/assets/icons/logo-full.png";

const conversations: Conversation[] = [
  {
    id: "1",
    title: "Ftg",
    lastMessage: "",
    timestamp: "",
    isActive: true,
  },
  {
    id: "2",
    title: "Three.js firearm geometry design",
    lastMessage: "",
    timestamp: "",
  },
  {
    id: "3",
    title: "UI tablist สำหรับ mobile game landing",
    lastMessage: "",
    timestamp: "",
  },
  {
    id: "4",
    title: "Minimal game loading screen design",
    lastMessage: "",
    timestamp: "",
  },
  {
    id: "5",
    title: "SA-MP game files manifest generator",
    lastMessage: "",
    timestamp: "",
  },
];

type IconName =
  | "plus"
  | "projects"
  | "artifacts"
  | "code"
  | "customize"
  | "filter"
  | "design"
  | "chevron";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    plus: <path d="M8 3v10M3 8h10" />,
    projects: <path d="M2.5 5.5h11M4 3.5h3l1 2h4.5a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1Z" />,
    artifacts: <path d="m8 2.5 3 1.75v3.5L8 9.5 5 7.75v-3.5l3-1.75ZM5 8.5l-3 1.75v3.5l3 1.75 3-1.75v-3.5L5 8.5Zm6 0-3 1.75v3.5l3 1.75 3-1.75v-3.5l-3-1.75Z" />,
    code: <path d="m5.5 4-3 4 3 4M10.5 4l3 4-3 4M9 2.5 7 13.5" />,
    customize: <path d="M2.5 5.5h11M2.5 8h11M2.5 10.5h11M5 4v3M10 6.5v3M7 9v3" />,
    filter: <path d="M3 4.5h10M5 8h6M7 11.5h2" />,
    design: <path d="M3 11.5 10.5 4a1.4 1.4 0 0 1 2 2L5 13.5H3v-2ZM9 5.5l2 2" />,
    chevron: <path d="m5.5 6.5 2.5 2.5 2.5-2.5" />,
  };

  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[name]}
      </g>
    </svg>
  );
}

interface SidebarProps {
  onToggle?: () => void;
  onNewChat?: () => void;
  selectedConversationId?: string;
  onSelectConversation?: (id: string) => void;
}

export default function Sidebar({
  onToggle,
  onNewChat,
  selectedConversationId = "1",
  onSelectConversation,
}: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <img
          src={logoBrand.src}
          alt="Noema"
          className={styles.logo}
          draggable={false}
        />
        <button
          className={styles.closeButton}
          type="button"
          onClick={onToggle}
          aria-label="Collapse sidebar"
        >
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2.75" y="2.75" width="10.5" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6.5 2.75v10.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>

      <nav className={styles.primaryNav} aria-label="Main navigation">
        <button className={styles.primaryItem} type="button" onClick={onNewChat}>
          <span className={styles.primaryIcon}><Icon name="plus" /></span>
          New
        </button>
      </nav>

      <button className={styles.newChat} type="button" onClick={onNewChat}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M8 3v10M3 8h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        New conversation
      </button>

      <nav className={styles.nav} aria-label="Chats and tasks">
        <div className={styles.sectionHeader}>
          <span>Chats and tasks</span>
          <Icon name="filter" />
        </div>
        <ul className={styles.list}>
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                className={`${styles.item} ${selectedConversationId === conv.id ? styles.active : ""}`}
                type="button"
                onClick={() => onSelectConversation?.(conv.id)}
                aria-current={selectedConversationId === conv.id ? "true" : undefined}
              >
                <span className={styles.itemTitle}>{conv.title}</span>
                <span className={styles.itemDot}><svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="2.25" stroke="currentColor" /></svg></span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.footer}>
        <button className={styles.designButton} type="button">
          <Icon name="design" />
          Design
        </button>
        <div className={styles.user}>
          <div className={styles.avatar} aria-hidden="true">
            MP
          </div>
          <span className={styles.userName}>Mr Philip · Free</span>
          <span className={styles.userChevron}><Icon name="chevron" /></span>
        </div>
      </div>
    </aside>
  );
}
