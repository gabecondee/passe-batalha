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
      // Simula um tempo de "geração" para efeito visual
      await new Promise(r => setTimeout(r, 2500));
      
      const total = finalScores.time + finalScores.frequency + finalScores.impact + finalScores.attempts;
      
      const classify = (t: number): BossDifficulty => {
        if (t <= 5) return "common";
        if (t <= 8) return "uncommon";
        if (t <= 11) return "rare";
        if (t <= 14) return "epic";
        return "legendary";
      };
      
      const difficulty = classify(total);
      
      const REWARDS: Record<BossDifficulty, { xp: number; penalty: number; maxFails: number }> = {
        common: { xp: 50, penalty: 50, maxFails: 10 },
        uncommon: { xp: 300, penalty: 100, maxFails: 7 },
        rare: { xp: 600, penalty: 200, maxFails: 5 },
        epic: { xp: 1100, penalty: 350, maxFails: 3 },
        legendary: { xp: 1500, penalty: 500, maxFails: 1 },
      };
      
      const rewards = REWARDS[difficulty];

      const detectSecondaryArea = (text: string): string => {
        const t = text.toLowerCase();
        const rules = [
          { re: /(d[íi]vid|financ|dinheiro|gasto|compra|investir|cr[ée]dito|econom|sal[áa]rio)/, area: 'Financeiro' },
          { re: /(sedentar|preguic|exerc|academ|corri|aliment|comida|dieta|junk|fum|cigarr|[áa]lcool|bebid|drog|sono|dormir|obesid|corpo|sa[úu]de)/, area: 'Físico' },
          { re: /(procrast|trabalh|estud|foco|distra|redes.?soci|instagram|tiktok|youtube|netflix|jogo|game|celular|produtiv|carreir|profission)/, area: 'Profissional' },
        ];
        for (const r of rules) if (r.re.test(t)) return r.area;
        return 'Espiritual';
      };
      
      const secondaryArea = detectSecondaryArea(problem);
      
      const id = `boss-custom-${Date.now()}`;
      const capName = problem.trim().toUpperCase();
      const formattedName = `${capName} - A Sombra do Hábito`;

      const newBoss: Boss = {
        id,
        name: formattedName,
        class: problem.trim(),
        vice: problem.trim(),
        difficulty,
        defeated: false,
        xpReward: rewards.xp,
        portrait: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(problem)}&colors=red,orange,yellow&backgroundColor=111111`,
        description: `Um chefão forjado a partir do seu desafio constante com ${problem.trim()}. Ele se alimenta da sua hesitação e da perda de foco. Esta é a manifestação mental do obstáculo que você deve superar.`,
        origin: `Nascido dos padrões repetitivos e gatilhos relacionados a ${problem.trim()}.`,
        abilities: [
          { name: "Golpe da Tentação", description: "Tenta induzir uma recaída imediata e impensada." },
          { name: "Neblina Mental", description: "Reduz a clareza sobre seus objetivos de longo prazo." },
          { name: "Fadiga Ilusória", description: "Faz você acreditar que está cansado demais para tentar." },
          { name: "Racionalização", description: "Cria desculpas perfeitas para justificar a manutenção do problema." }
        ],
        weaknesses: [
          { name: "Consciência Ativa", description: "Monitorar o gatilho quebra a furtividade do chefe." },
          { name: "Ação Imediata", description: "Tomar uma decisão contrária nos primeiros 5 segundos." },
          { name: "Substituição", description: "Trocar o hábito ruim por um bom anula o ataque." },
          { name: "Constância", description: "Cada dia vencido tira camadas de armadura do boss." }
        ],
        rules: {
          penaltyAreas: ['Mental', secondaryArea],
          penaltyPoints: rewards.penalty,
          rewardXp: rewards.xp,
          rewardAreas: ['Mental', secondaryArea],
          maxFails: rewards.maxFails,
        },
        durationDays: 30,
        dailyTasks: Array.from({ length: 30 }).map((_, i) => ({
          day: i + 1,
          action: i < 7 ? `Ataque Base: Monitorar o padrão e registrar o gatilho do problema.` : 
                 i < 14 ? `Defesa: Evitar o principal gatilho do dia.` :
                 i < 21 ? `Contra-Ataque: Aplicar a rotina de substituição com sucesso.` :
                 `Golpe Final: Reforçar o novo comportamento de sucesso.`,
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
