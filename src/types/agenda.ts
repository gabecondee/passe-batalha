export type AgendaCategory =
  | 'health'
  | 'work'
  | 'study'
  | 'finance'
  | 'social'
  | 'personal'
  | 'other';

export type AgendaRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export type AgendaSource = 'manual' | 'mission' | 'training' | 'google';

export interface AgendaEvent {
  id: string;
  name: string;
  category: AgendaCategory;
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** HH:mm */
  time?: string;
  description?: string;
  recurrence: AgendaRecurrence;
  source: AgendaSource;
  /** Optional id referencing the original mission/training */
  sourceId?: string;
  /** Reserved for future Google Calendar sync */
  googleCalendarId?: string | null;
  /** Direct link to the event on calendar.google.com */
  googleCalendarLink?: string;
  completed?: boolean;
  createdAt: string;
}

export interface AgendaCategoryMeta {
  id: AgendaCategory;
  label: string;
  icon: string;
  color: string; // tailwind class for text/border accent
  bg: string; // tailwind class for soft background
}

export const AGENDA_CATEGORIES: Record<AgendaCategory, AgendaCategoryMeta> = {
  health: {
    id: 'health',
    label: 'Saúde',
    icon: '🟢',
    color: 'text-emerald-400 border-emerald-400/50',
    bg: 'bg-emerald-400/10',
  },
  work: {
    id: 'work',
    label: 'Trabalho',
    icon: '💼',
    color: 'text-amber-400 border-amber-400/50',
    bg: 'bg-amber-400/10',
  },
  study: {
    id: 'study',
    label: 'Estudos',
    icon: '📚',
    color: 'text-sky-400 border-sky-400/50',
    bg: 'bg-sky-400/10',
  },
  finance: {
    id: 'finance',
    label: 'Financeiro',
    icon: '💰',
    color: 'text-lime-400 border-lime-400/50',
    bg: 'bg-lime-400/10',
  },
  social: {
    id: 'social',
    label: 'Social',
    icon: '❤️',
    color: 'text-rose-400 border-rose-400/50',
    bg: 'bg-rose-400/10',
  },
  personal: {
    id: 'personal',
    label: 'Pessoal',
    icon: '👤',
    color: 'text-violet-400 border-violet-400/50',
    bg: 'bg-violet-400/10',
  },
  other: {
    id: 'other',
    label: 'Outros',
    icon: '📄',
    color: 'text-muted-foreground border-border/60',
    bg: 'bg-secondary/40',
  },
};

/** Map legacy category ids (mission/training/diet/spiritual) to the new set. */
export function normalizeCategory(cat: string | undefined | null): AgendaCategory {
  switch (cat) {
    case 'health':
    case 'work':
    case 'study':
    case 'finance':
    case 'social':
    case 'personal':
    case 'other':
      return cat;
    case 'training':
    case 'diet':
      return 'health';
    case 'spiritual':
      return 'personal';
    case 'mission':
      return 'other';
    default:
      return 'other';
  }
}
