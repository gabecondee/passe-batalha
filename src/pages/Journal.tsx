import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, parseISO, subDays, subYears, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  BookOpen,
  Calendar as CalendarIcon,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Sliders,
  Trash2,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JournalEntryDialog } from '@/components/journal/JournalEntryDialog';
import {
  JOURNAL_CATEGORIES,
  JournalEntry,
  useJournal,
} from '@/hooks/useJournal';
import { cn } from '@/lib/utils';

type Period = '30d' | 'year' | 'custom';

export default function Journal() {
  const navigate = useNavigate();
  const { entries, createEntry, updateEntry, deleteEntry } = useJournal();

  const [period, setPeriod] = useState<Period>('30d');
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [viewing, setViewing] = useState<JournalEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    if (period === '30d') start = subDays(now, 30);
    else if (period === 'year') start = subYears(now, 1);
    else {
      start = parseISO(customStart);
      end = parseISO(customEnd);
    }
    return entries
      .filter((e) => {
        const d = parseISO(e.date);
        return d >= start && d <= new Date(end.getTime() + 24 * 3600 * 1000);
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [entries, period, customStart, customEnd]);

  const stats = useMemo(() => {
    const totalWords = filtered.reduce((acc, e) => acc + e.wordCount, 0);
    // streak: consecutive days ending today (or most recent day)
    const dates = Array.from(new Set(filtered.map((e) => e.date))).sort((a, b) => (a < b ? 1 : -1));
    let streak = 0;
    if (dates.length > 0) {
      const today = new Date();
      let cursor = parseISO(dates[0]);
      const diffFromToday = differenceInCalendarDays(today, cursor);
      if (diffFromToday <= 1) {
        streak = 1;
        for (let i = 1; i < dates.length; i++) {
          const prev = parseISO(dates[i]);
          if (differenceInCalendarDays(cursor, prev) === 1) {
            streak++;
            cursor = prev;
          } else break;
        }
      }
    }
    return { count: filtered.length, streak, words: totalWords };
  }, [filtered]);

  const visible = showAll ? filtered : filtered.slice(0, 5);

  const periodBtn = (id: Period, label: string, Icon: typeof CalendarIcon) => (
    <button
      onClick={() => {
        if (id === 'custom') setCustomOpen(true);
        setPeriod(id);
      }}
      className={cn(
        'flex-1 rounded-2xl border px-3 py-3 text-sm font-medium transition inline-flex items-center justify-center gap-2',
        period === id
          ? 'border-primary/70 bg-primary/10 text-primary shadow-[0_0_20px_hsl(var(--primary)/0.2)]'
          : 'border-border/60 bg-card/40 text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );

  return (
    <MainLayout>
      <PageTransition>
        <div className="mx-auto w-full max-w-3xl space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-card/60 text-foreground hover:border-primary/50 hover:text-primary transition"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-muted-foreground text-sm">Voltar</span>
          </div>

          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-wider text-primary">
                Diário de Bordo
              </h1>
            </div>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Utilize essa sessão sempre que precisar descarregar seus pensamentos ou registrar suas reflexões.
            </p>
          </div>

          {/* Period filters */}
          <div className="flex gap-2">
            {periodBtn('30d', 'Últimos 30 dias', CalendarIcon)}
            {periodBtn('year', 'Último ano', CalendarIcon)}
            {periodBtn('custom', 'Personalizado', Sliders)}
          </div>

          {/* Summary */}
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5">
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-accent" />
            <p className="mb-4 font-display text-sm uppercase tracking-wider text-primary">Resumo</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <StatBlock
                value={stats.count}
                label={<>Registros<br/>realizados</>}
                icon={<FileText className="h-6 w-6" />}
                color="text-emerald-400"
                ring="border-emerald-400/50"
              />
              <StatBlock
                value={stats.streak}
                label={<>Dias seguidos<br/>escrevendo</>}
                icon={<CalendarIcon className="h-6 w-6" />}
                color="text-primary"
                ring="border-primary/50"
              />
              <StatBlock
                value={stats.words.toLocaleString('pt-BR')}
                label={<>Palavras<br/>escritas</>}
                icon={<Pencil className="h-6 w-6" />}
                color="text-muted-foreground"
                ring="border-border/60"
              />
            </div>
          </div>

          {/* New entry button */}
          <button
            onClick={() => setCreating(true)}
            className="w-full rounded-2xl border-2 border-primary/60 bg-primary/5 py-4 text-primary font-medium hover:bg-primary/10 hover:shadow-[0_0_25px_hsl(var(--primary)/0.25)] transition inline-flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Novo registro
          </button>

          {/* Recent entries */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center space-y-3">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="text-muted-foreground">Você ainda não criou nenhum registro.</p>
              <Button
                onClick={() => setCreating(true)}
                className="rounded-full bg-gradient-to-r from-primary to-accent font-display uppercase tracking-wider"
              >
                <Plus className="mr-1 h-4 w-4" /> Criar primeiro registro
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm uppercase tracking-wider text-primary">
                  Registros Recentes
                </h2>
                {filtered.length > 5 && (
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:text-accent transition"
                  >
                    {showAll ? 'Ver menos' : 'Ver todos'}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {visible.map((e, idx) => {
                  const cat = JOURNAL_CATEGORIES[e.category];
                  const d = parseISO(e.date);
                  return (
                    <motion.button
                      key={e.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => setViewing(e)}
                      className="group w-full text-left flex items-stretch gap-3 rounded-xl border border-border/60 bg-background/40 p-3 hover:border-primary/50 hover:shadow-[0_0_18px_hsl(var(--primary)/0.15)] transition"
                    >
                      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/40 bg-primary/5 py-2 text-primary">
                        <CalendarIcon className="mb-0.5 h-4 w-4" />
                        <span className="font-display text-xl leading-none font-bold">
                          {format(d, 'dd')}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider">
                          {format(d, 'MMM', { locale: ptBR }).replace('.', '')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="font-semibold text-foreground truncate">{e.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {e.content}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                              cat.bg,
                              cat.text,
                              cat.border,
                            )}
                          >
                            {cat.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {e.readingMinutes} min de leitura
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 self-center text-muted-foreground group-hover:text-primary transition" />
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-background/30 p-3 text-xs text-muted-foreground">
                <span className="text-primary">💡</span>
                <span>Dica: Escrever regularmente ajuda a clarear a mente e acompanhar sua evolução.</span>
              </div>
            </div>
          )}
        </div>

        {/* Create / edit dialog */}
        <JournalEntryDialog
          open={creating}
          onOpenChange={setCreating}
          onSave={(data) => createEntry(data)}
        />
        <JournalEntryDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          entry={editing}
          onSave={(data) => {
            if (editing) updateEntry(editing.id, data);
            setEditing(null);
          }}
        />

        {/* View dialog */}
        <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-lg border-primary/30 bg-card max-h-[92vh] overflow-y-auto">
            {viewing && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        JOURNAL_CATEGORIES[viewing.category].bg,
                        JOURNAL_CATEGORIES[viewing.category].text,
                        JOURNAL_CATEGORIES[viewing.category].border,
                      )}
                    >
                      {JOURNAL_CATEGORIES[viewing.category].label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(viewing.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <DialogTitle className="font-display text-xl text-foreground">
                    {viewing.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {viewing.readingMinutes} min de leitura • {viewing.wordCount} palavras
                  </DialogDescription>
                </DialogHeader>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {viewing.content}
                </div>
                <DialogFooter className="!flex-row gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full"
                    onClick={() => {
                      setDeleteTarget(viewing);
                    }}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Excluir
                  </Button>
                  <Button
                    className="flex-1 rounded-full bg-gradient-to-r from-primary to-accent font-display uppercase tracking-wider"
                    onClick={() => {
                      setEditing(viewing);
                      setViewing(null);
                    }}
                  >
                    <Pencil className="mr-1 h-4 w-4" /> Editar
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-sm border-red-500/40 bg-card">
            <DialogHeader>
              <DialogTitle className="font-display uppercase tracking-wider text-red-400">
                Excluir registro?
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="!flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 rounded-full bg-red-500 hover:bg-red-600 text-white"
                onClick={() => {
                  if (deleteTarget) deleteEntry(deleteTarget.id);
                  setDeleteTarget(null);
                  setViewing(null);
                }}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom period dialog */}
        <Dialog open={customOpen} onOpenChange={setCustomOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-sm border-primary/30 bg-card">
            <DialogHeader>
              <DialogTitle className="font-display uppercase tracking-wider text-primary">
                Período personalizado
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cs">Início</Label>
                <Input id="cs" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ce">Fim</Label>
                <Input id="ce" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
              <Button
                className="w-full rounded-full bg-gradient-to-r from-primary to-accent font-display uppercase tracking-wider"
                onClick={() => {
                  setPeriod('custom');
                  setCustomOpen(false);
                }}
              >
                Aplicar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </MainLayout>
  );
}

function StatBlock({
  value,
  label,
  icon,
  color,
  ring,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  ring: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn('flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background/40', ring, color)}>
        {icon}
      </div>
      <div className={cn('font-display text-2xl font-bold', color)}>{value}</div>
      <div className="text-xs text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}
