import { useCallback, useEffect, useState } from 'react';
import { emit } from '@/lib/eventBus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export function useJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchEntries = async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Erro ao buscar diário:", error);
        return;
      }
      
      if (data) {
        const mapped: JournalEntry[] = data.map(d => ({
          id: d.id,
          title: d.title,
          category: d.category as JournalCategory,
          content: d.content,
          date: d.entry_date,
          createdAt: d.created_at,
          updatedAt: d.created_at,
          wordCount: d.word_count,
          readingMinutes: d.reading_minutes
        }));
        setEntries(mapped);
      }
    };
    
    fetchEntries();
  }, [user]);

  const createEntry = useCallback(
    async (data: { title: string; category: JournalCategory; content: string; date: string }) => {
      if (!user) return null;
      
      const words = countWords(data.content);
      const minutes = readingMinutes(words);
      
      const newEntry = {
        user_id: user.id,
        title: data.title.trim(),
        category: data.category,
        content: data.content,
        entry_date: data.date,
        word_count: words,
        reading_minutes: minutes
      };

      const { data: insertedData, error } = await supabase
        .from('journal_entries')
        .insert(newEntry)
        .select()
        .single();
        
      if (error) {
        console.error("Erro ao criar entrada:", error);
        return null;
      }
      
      const entry: JournalEntry = {
        id: insertedData.id,
        title: insertedData.title,
        category: insertedData.category as JournalCategory,
        content: insertedData.content,
        date: insertedData.entry_date,
        createdAt: insertedData.created_at,
        updatedAt: insertedData.created_at,
        wordCount: insertedData.word_count,
        readingMinutes: insertedData.reading_minutes
      };

      setEntries(prev => {
        const next = [entry, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        emit({ type: 'journal:entry-added', count: next.length });
        return next;
      });
      
      return entry;
    },
    [user]
  );

  const updateEntry = useCallback(
    async (id: string, data: Partial<Pick<JournalEntry, 'title' | 'category' | 'content' | 'date'>>) => {
      if (!user) return;
      
      const updatePayload: any = {};
      if (data.title !== undefined) updatePayload.title = data.title.trim();
      if (data.category !== undefined) updatePayload.category = data.category;
      if (data.content !== undefined) {
        updatePayload.content = data.content;
        updatePayload.word_count = countWords(data.content);
        updatePayload.reading_minutes = readingMinutes(updatePayload.word_count);
      }
      if (data.date !== undefined) updatePayload.entry_date = data.date;

      const { error } = await supabase
        .from('journal_entries')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) {
        console.error("Erro ao atualizar entrada:", error);
        return;
      }
      
      setEntries(prev => prev.map(e => {
        if (e.id !== id) return e;
        const merged = { ...e, ...data };
        if (data.content) {
          merged.wordCount = updatePayload.word_count;
          merged.readingMinutes = updatePayload.reading_minutes;
        }
        merged.updatedAt = new Date().toISOString();
        return merged;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    },
    [user]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!user) return;
      
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) {
        console.error("Erro ao deletar entrada:", error);
        return;
      }
      
      setEntries(prev => {
        const next = prev.filter(e => e.id !== id);
        emit({ type: 'journal:entry-deleted', count: next.length });
        return next;
      });
    },
    [user]
  );

  return { entries, createEntry, updateEntry, deleteEntry };
}
