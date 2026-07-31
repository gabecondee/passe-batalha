import { useCallback, useEffect, useState } from 'react';
import { emit } from '@/lib/eventBus';

export type JournalCategory =
  | 'reflexao'
  | 'aprendizado'
  | 'vitoria'
  | 'desafio'
  | 'gratidao'
  | 'planejamento'
  | 'insight';

export interface JournalEntry {
  id: string;
  title: string;
  category: JournalCategory;
  content: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  readingMinutes: number;
}

const STORAGE_KEY = 'passe_journal_entries_v1';

export interface JournalCategoryMeta {
  id: JournalCategory;
  label: string;
  icon: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
}

export const JOURNAL_CATEGORIES: Record<JournalCategory, JournalCategoryMeta> = {
  reflexao: {
    id: 'reflexao',
    label: 'Reflexão',
    icon: '🧠',
    text: 'text-sky-300',
    bg: 'bg-sky-500/15',
    border: 'border-sky-400/40',
    dot: 'bg-sky-400',
  },
  aprendizado: {
    id: 'aprendizado',
    label: 'Aprendizado',
    icon: '🎓',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-400/40',
    dot: 'bg-emerald-400',
  },
  vitoria: {
    id: 'vitoria',
    label: 'Vitória',
    icon: '🏆',
    text: 'text-amber-300',
    bg: 'bg-amber-500/15',
    border: 'border-amber-400/40',
    dot: 'bg-amber-400',
  },
  desafio: {
    id: 'desafio',
    label: 'Desafio',
    icon: '⚔️',
    text: 'text-red-300',
    bg: 'bg-red-500/15',
    border: 'border-red-400/40',
    dot: 'bg-red-400',
  },
  gratidao: {
    id: 'gratidao',
    label: 'Gratidão',
    icon: '🙏',
    text: 'text-violet-300',
    bg: 'bg-violet-500/15',
    border: 'border-violet-400/40',
    dot: 'bg-violet-400',
  },
  planejamento: {
    id: 'planejamento',
    label: 'Planejamento',
    icon: '🎯',
    text: 'text-yellow-300',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-400/40',
    dot: 'bg-yellow-400',
  },
  insight: {
    id: 'insight',
    label: 'Insight',
    icon: '💡',
    text: 'text-cyan-300',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-400/40',
    dot: 'bg-cyan-400',
  },
};

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

function load(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as JournalEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  localStorage.setItem('journal_entries_count', String(entries.length));
}

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    setEntries(load());
  }, []);

  const persist = (next: JournalEntry[]) => {
    setEntries(next);
    save(next);
  };

  const createEntry = useCallback(
    (data: { title: string; category: JournalCategory; content: string; date: string }) => {
      const words = countWords(data.content);
      const now = new Date().toISOString();
      const entry: JournalEntry = {
        id: crypto.randomUUID(),
        title: data.title.trim(),
        category: data.category,
        content: data.content,
        date: data.date,
        createdAt: now,
        updatedAt: now,
        wordCount: words,
        readingMinutes: readingMinutes(words),
      };
      const next = [entry, ...load()];
      persist(next);
      emit({ type: 'journal:entry-added', count: next.length });
      return entry;
    },
    [],
  );

  const updateEntry = useCallback(
    (id: string, data: Partial<Pick<JournalEntry, 'title' | 'category' | 'content' | 'date'>>) => {
      const list = load();
      const next = list.map((e) => {
        if (e.id !== id) return e;
        const merged = { ...e, ...data };
        const words = countWords(merged.content);
        return {
          ...merged,
          wordCount: words,
          readingMinutes: readingMinutes(words),
          updatedAt: new Date().toISOString(),
        };
      });
      persist(next);
    },
    [],
  );

  const deleteEntry = useCallback((id: string) => {
    const next = load().filter((e) => e.id !== id);
    persist(next);
    emit({ type: 'journal:entry-deleted', count: next.length });
  }, []);

  return { entries, createEntry, updateEntry, deleteEntry };
}
