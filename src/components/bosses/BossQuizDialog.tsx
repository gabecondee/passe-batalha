import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useBoss } from '@/contexts/BossContext';
import { Boss, BossDifficulty } from '@/types/boss';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronRight, Sparkles, Swords } from 'lucide-react';

interface QuizOption {
  label: string;
  score: 1 | 2 | 3 | 4;
}

interface QuizStep {
  key: 'time' | 'frequency' | 'impact' | 'attempts';
  question: string;
  options: QuizOption[];
}

const STEPS: QuizStep[] = [
  {
    key: 'time',
    question: 'Há quanto tempo esse problema existe?',
    options: [
      { label: 'Menos de 1 mês', score: 1 },
      { label: '1 a 6 meses', score: 2 },
      { label: '6 meses a 1 ano', score: 3 },
      { label: 'Mais de 1 ano', score: 4 },
    ],
  },
  {
    key: 'frequency',
    question: 'Com que frequência ele afeta sua vida?',
    options: [
      { label: 'Raramente', score: 1 },
      { label: 'Algumas vezes por semana', score: 2 },
      { label: 'Quase todos os dias', score: 3 },
      { label: 'Todos os dias', score: 4 },
    ],
  },
  {
    key: 'impact',
    question: 'O quanto ele prejudica seus resultados?',
    options: [
      { label: 'Pouco', score: 1 },
      { label: 'Moderadamente', score: 2 },
      { label: 'Muito', score: 3 },
      { label: 'Extremamente', score: 4 },
    ],
  },
  {
    key: 'attempts',
    question: 'Você já tentou resolver isso antes?',
    options: [
      { label: 'Nunca', score: 1 },
      { label: 'Uma vez', score: 2 },
      { label: 'Algumas vezes', score: 3 },
      { label: 'Muitas vezes', score: 4 },
    ],
  },
];

const LOADING_MESSAGES = [
  'Forjando seu inimigo...',
  'Analisando padrões comportamentais...',
  'Construindo sua batalha...',
  'Criando desafios...',
  'Preparando o Bestiário...',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BossQuizDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { addBoss, startBattle, hasActiveBattle } = useBoss();
  const [step, setStep] = useState(0); // 0 = problem, 1..4 = quiz steps
  const [problem, setProblem] = useState('');
  const [scores, setScores] = useState<Record<string, 1 | 2 | 3 | 4>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(0);
      setProblem('');
      setScores({});
      setLoading(false);
      setLoadingMsgIdx(0);
    }
  }, [open]);

  // Cycle loading messages
  useEffect(() => {
    if (!loading) return;
    const int = setInterval(() => {
      setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(int);
  }, [loading]);

  const totalSteps = STEPS.length + 1; // problem + 4 quiz
  const progressPct = Math.round(((step + 1) / totalSteps) * 100);

  const handleProblemSubmit = () => {
    if (!problem.trim()) {
      toast.error('Descreva o vício ou problema.');
      return;
    }
    if (hasActiveBattle()) {
      toast.error('Você já possui um chefão em batalha. Finalize ou abandone antes de criar outro.');
      return;
    }
    setStep(1);
  };

  const handleOption = async (score: 1 | 2 | 3 | 4) => {
    const currentStep = STEPS[step - 1];
    const newScores = { ...scores, [currentStep.key]: score };
    setScores(newScores);

    if (step < STEPS.length) {
      setStep(step + 1);
    } else {
      await generateBoss(newScores);
    }
  };

  const generateBoss = async (finalScores: Record<string, 1 | 2 | 3 | 4>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-boss', {
        body: {
          problem: problem.trim(),
          timeScore: finalScores.time,
          frequencyScore: finalScores.frequency,
          impactScore: finalScores.impact,
          attemptsScore: finalScores.attempts,
        },
      });

      if (error) throw error;
      if (!data?.boss) throw new Error('Resposta incompleta da IA.');

      const { boss: b, difficulty, rewards, portraitDataUrl } = data as {
        boss: any;
        difficulty: BossDifficulty;
        rewards: { xp: number; penalty: number; maxFails: number };
        portraitDataUrl: string | null;
      };

      const id = `boss-custom-${Date.now()}`;
      const DIFFICULTY_MAX_FAILS: Record<BossDifficulty, number> = {
        legendary: 1, epic: 3, rare: 5, uncommon: 7, common: 10,
      };
      const maxFails = DIFFICULTY_MAX_FAILS[difficulty] ?? rewards.maxFails;

      // Detecta a segunda área impactada com base no problema
      const detectSecondaryArea = (text: string): string => {
        const t = text.toLowerCase();
        const rules: { re: RegExp; area: string }[] = [
          { re: /(d[íi]vid|financ|dinheiro|gasto|compra|investir|cr[ée]dito|econom|sal[áa]rio)/, area: 'Financeiro' },
          { re: /(sedentar|preguic|exerc|academ|corri|aliment|comida|dieta|junk|fum|cigarr|[áa]lcool|bebid|drog|sono|dormir|obesid|corpo|sa[úu]de)/, area: 'Físico' },
          { re: /(procrast|trabalh|estud|foco|distra|redes.?soci|instagram|tiktok|youtube|netflix|jogo|game|celular|produtiv|carreir|profission)/, area: 'Profissional' },
          { re: /(porn|masturb|lux[úu]ri|ansied|depress|medo|raiva|ego|espirit|orgul|inveja|solid|vazi|prop[óo]sito|f[ée]|medita|culpa|v[íi]cio\s+emocional)/, area: 'Espiritual' },
        ];
        for (const r of rules) if (r.re.test(t)) return r.area;
        return 'Espiritual';
      };
      const secondaryArea = (b.secondaryArea && ['Físico','Financeiro','Profissional','Espiritual'].includes(b.secondaryArea))
        ? b.secondaryArea
        : detectSecondaryArea(problem);

      // Garante formato "Nome - Subtítulo"
      const rawName: string = String(b.name || '').trim();
      const shortName: string = (b.shortName || '').toString().trim();
      let formattedName = rawName;
      if (shortName && !rawName.toLowerCase().startsWith(shortName.toLowerCase())) {
        formattedName = `${shortName} - ${rawName}`;
      } else if (shortName && rawName.toLowerCase() === shortName.toLowerCase()) {
        formattedName = shortName;
      } else if (!/\s[-–:]\s/.test(rawName)) {
        // Se veio sem separador com espaço, tenta normalizar o primeiro "-" ou ":"
        formattedName = rawName.replace(/\s*[-–:]\s*/, ' - ');
      }

      const newBoss: Boss = {
        id,
        name: formattedName,
        class: b.class || problem.trim(),
        vice: problem.trim(),
        difficulty,
        defeated: false,
        xpReward: rewards.xp,
        portrait: portraitDataUrl || undefined,
        description: b.description,
        origin: b.origin,
        abilities: b.abilities,
        weaknesses: b.weaknesses,
        rules: {
          penaltyAreas: ['Mental', secondaryArea],
          penaltyPoints: rewards.penalty,
          rewardXp: rewards.xp,
          rewardAreas: ['Mental', secondaryArea],
          maxFails,
        },
        durationDays: 30,
        dailyTasks: (b.campaign as Array<{ day: number; action: string; attackName?: string }>).map(d => ({
          day: d.day,
          action: d.attackName ? `${d.attackName}: ${d.action}` : d.action,
        })),
      };

      addBoss(newBoss);
      // Auto-start the battle
      setTimeout(() => {
        startBattle(id, 30);
        navigate(`/bosses/${id}`);
        onOpenChange(false);
      }, 400);
    } catch (e: any) {
      console.error(e);
      toast.error('Falha ao gerar o chefão. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="bg-card border-border/50 max-w-md p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center space-y-6 min-h-[360px] flex flex-col items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
              <Sparkles className="w-14 h-14 text-primary relative animate-pulse drop-shadow-[0_0_20px_hsl(var(--primary)/0.8)]" />
            </div>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <div className="space-y-2">
              <p className="font-display text-lg tracking-wider text-primary uppercase animate-fade-in" key={loadingMsgIdx}>
                {LOADING_MESSAGES[loadingMsgIdx]}
              </p>
              <p className="text-xs text-muted-foreground">A IA está forjando seu inimigo. Isso pode levar até 30 segundos.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-3 border-b border-border/40">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-display tracking-wider uppercase text-primary text-base">
                  <Swords className="w-4 h-4" />
                  Criar Novo Chefão
                </DialogTitle>
              </DialogHeader>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
                  <span>Pergunta {step + 1} de {totalSteps}</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-primary transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-5 min-h-[280px]">
              {step === 0 ? (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <p className="font-display text-base text-foreground/95 mb-1">
                      Qual vício ou problema seu Boss irá representar?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ex: Procrastinação, Pornografia, Redes sociais, Ansiedade, Álcool, Açúcar, Jogos...
                    </p>
                  </div>
                  <Input
                    autoFocus
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleProblemSubmit()}
                    placeholder="Descreva o problema..."
                    className="h-12 bg-background/60 border-border/60 focus-visible:ring-primary/40"
                    maxLength={80}
                  />
                  <Button
                    onClick={handleProblemSubmit}
                    disabled={!problem.trim()}
                    className="w-full h-11 bg-primary text-primary-foreground font-bold tracking-wider uppercase text-sm"
                  >
                    Avançar
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in" key={step}>
                  <p className="font-display text-base text-foreground/95">
                    {STEPS[step - 1].question}
                  </p>
                  <div className="space-y-2">
                    {STEPS[step - 1].options.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => handleOption(opt.score)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl border transition-all",
                          "bg-card/60 border-border/60 text-foreground/90",
                          "hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_16px_hsl(var(--primary)/0.15)]",
                        )}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
