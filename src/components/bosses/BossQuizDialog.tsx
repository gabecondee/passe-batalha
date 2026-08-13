import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useBoss } from '@/contexts/BossContext';
import { Boss, BossDifficulty, AttributeArea } from '@/types/boss';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronRight, Sparkles, Swords, Brain, Dumbbell, Sparkle, Briefcase, DollarSign } from 'lucide-react';

import { uploadBossPortraitToSupabase } from '@/lib/bossImageStorage';

interface QuizOption {
  label: string;
  score: 1 | 2 | 3 | 4;
}

interface QuizStep {
  key: 'time' | 'frequency' | 'impact' | 'attempts';
  question: string;
  options: QuizOption[];
}

const ATTRIBUTE_AREAS: { key: AttributeArea; label: string; icon: any; color: string; desc: string }[] = [
  { key: 'Espiritual', label: 'Espiritual', icon: Sparkle, color: 'text-amber-400 border-amber-400/40 bg-amber-400/10', desc: 'Valores, vício pessoal, pornografia, despropósito' },
  { key: 'Mental', label: 'Mental', icon: Brain, color: 'text-purple-400 border-purple-400/40 bg-purple-400/10', desc: 'Redes sociais, ansiedade, distrações, falta de foco' },
  { key: 'Profissional', label: 'Profissional', icon: Briefcase, color: 'text-green-400 border-green-400/40 bg-green-400/10', desc: 'Procrastinação, metas não cumpridas, carreira' },
  { key: 'Físico', label: 'Físico', icon: Dumbbell, color: 'text-blue-400 border-blue-400/40 bg-blue-400/10', desc: 'Sedentarismo, má alimentação, falta de sono, álcool' },
  { key: 'Financeiro', label: 'Financeiro', icon: DollarSign, color: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10', desc: 'Compras impulsivas, dívidas, falta de controle financeiro' },
];

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
  'Invocando as energias sombrias...',
  'Materializando os atributos do seu inimigo...',
  'Analisando seus medos e fraquezas...',
  'Construindo o arsenal de habilidades do monstro...',
  'Preparando a jornada de 30 dias de batalha...',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BossQuizDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { addBoss, startBattle, hasActiveBattle } = useBoss();
  const [step, setStep] = useState(0); // 0 = problem, 1 = area selection, 2..5 = quiz questions
  const [problem, setProblem] = useState('');
  const [selectedArea, setSelectedArea] = useState<AttributeArea>('' as AttributeArea);
  const [scores, setScores] = useState<Record<string, 1 | 2 | 3 | 4>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const isCancelledRef = useRef(false);

  const cancelGeneration = () => {
    isCancelledRef.current = true;
    setLoading(false);
    setStep(0);
    setProblem('');
    setScores({});
  };


  useEffect(() => {
    if (!open) {
      setStep(0);
      setProblem('');
      setSelectedArea('' as AttributeArea);
      setScores({});
      setLoading(false);
      setLoadingMsgIdx(0);
    }
  }, [open]);

  useEffect(() => {
    if (!loading) return;
    const int = setInterval(() => {
      setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(int);
  }, [loading]);

  const totalSteps = STEPS.length + 2; // problem + area + 4 quiz steps
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
    setStep(1); // Advance to area selection
  };

  const handleAreaSelect = (area: AttributeArea) => {
    setSelectedArea(area);
    setStep(2); // Advance to first quiz question
  };

  const handleOption = async (score: 1 | 2 | 3 | 4) => {
    const quizIdx = step - 2;
    const currentStep = STEPS[quizIdx];
    const newScores = { ...scores, [currentStep.key]: score };
    setScores(newScores);

    if (quizIdx < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await generateBoss(newScores);
    }
  };

  const generateBoss = async (finalScores: Record<string, 1 | 2 | 3 | 4>) => {
    isCancelledRef.current = false;
    setLoading(true);
    try {
      const timeScore = finalScores.time || 2;
      const frequencyScore = finalScores.frequency || 2;
      const impactScore = finalScores.impact || 2;
      const attemptsScore = finalScores.attempts || 2;

      const total = timeScore + frequencyScore + impactScore + attemptsScore;

      const classify = (t: number): BossDifficulty => {
        if (t <= 5) return 'common';
        if (t <= 8) return 'uncommon';
        if (t <= 11) return 'rare';
        if (t <= 14) return 'epic';
        return 'legendary';
      };

      const difficulty = classify(total);

      const REWARDS: Record<BossDifficulty, { xp: number; penalty: number; maxFails: number }> = {
        common: { xp: 100, penalty: 50, maxFails: 10 },
        uncommon: { xp: 300, penalty: 100, maxFails: 7 },
        rare: { xp: 600, penalty: 200, maxFails: 5 },
        epic: { xp: 1100, penalty: 350, maxFails: 3 },
        legendary: { xp: 1500, penalty: 500, maxFails: 1 },
      };

      const rewards = REWARDS[difficulty];

      let aiResult: any = null;
      let portraitUrl: string | null = null;

      // Try calling Supabase Edge Function with GPT & Image Gen
      try {
        const { data, error } = await supabase.functions.invoke('generate-boss', {
          body: {
            problem,
            attributeArea: selectedArea,
            timeScore,
            frequencyScore,
            impactScore,
            attemptsScore,
          },
        });
        if (!error && data) {
          aiResult = data.boss;
          portraitUrl = data.portraitUrl || data.portraitDataUrl || null;
        }
      } catch (err) {
        console.warn('Edge function invoke failed, fallback to client GPT generator', err);
        // Fallback local se a Edge function falhar totalmente
        const prompt = `${problem} ${selectedArea}`;
        
        aiResult = {
          name: `${prompt.split(' ')[0].toUpperCase()}'ZUL`,
          subtitle: `O Devorador de ${selectedArea}`,
          class: problem,
          description: `Um boss gerado como fallback local porque o servidor falhou.`,
          origin: `Nascido do erro 500.`,
          abilities: [
            { name: "Ataque Básico", description: "Causa dano." },
            { name: "Ataque Básico", description: "Causa dano." },
            { name: "Ataque Básico", description: "Causa dano." },
            { name: "Ataque Básico", description: "Causa dano." },
          ],
          weaknesses: [
            { name: "Foco", description: "Manter a atenção." },
            { name: "Foco", description: "Manter a atenção." },
            { name: "Foco", description: "Manter a atenção." },
            { name: "Foco", description: "Manter a atenção." },
          ],
          imagePrompt: "dark fantasy",
          campaign: Array.from({ length: 30 }).map((_, i) => ({
            day: i + 1,
            attackName: "Passo Inicial",
            action: "Ação de fallback"
          }))
        };
      }

      // Se a Edge Function não retornou imagem (porque DALL-E falhou e Pollinations deu 403)
      if (!portraitUrl) {
        // Usa Morth'zul como fallback oficial
        portraitUrl = '/images/bosses/boss-morthzul.jpg';
      }

      const bossId = `boss-custom-${Date.now()}`;

      // Upload imagem para Supabase Storage permanente (se necessário)
      if (isCancelledRef.current) return;
      const permanentPortraitUrl = await uploadBossPortraitToSupabase(portraitUrl, bossId);
      if (isCancelledRef.current) return;

      const capName = problem.trim().toUpperCase();
      const rawAiName = aiResult?.name || `${capName} - A Sombra de ${selectedArea}`;
      const defaultName = aiResult?.subtitle && !rawAiName.includes('-') 
        ? `${rawAiName} - ${aiResult.subtitle}` 
        : rawAiName;

      const defaultDesc = aiResult?.description || `A manifestação sombria de sua luta contra ${problem.trim()}. Ele se alimenta da sua hesitação e consome sua energia na área ${selectedArea}, aguardando o momento em que sua força de vontade fraqueja.`;
      const defaultOrigin = aiResult?.origin || `Nascido dos padrões repetitivos e gatilhos automáticos associados a ${problem.trim()}.`;

      const defaultAbilities = aiResult?.abilities || [
        { name: 'Golpe da Tentação', description: `Tenta induzir uma recaída imediata ligada a ${problem.trim()}.` },
        { name: 'Neblina Mental', description: 'Reduz a clareza sobre seus objetivos e prioridades de longo prazo.' },
        { name: 'Fadiga Ilusória', description: 'Faz você acreditar que está cansado demais para tentar.' },
        { name: 'Racionalização', description: 'Cria desculpas perfeitas para justificar a manutenção do problema.' },
      ];

      const defaultWeaknesses = aiResult?.weaknesses || [
        { name: 'Consciência Ativa', description: 'Monitorar o gatilho quebra a furtividade do chefe.' },
        { name: 'Ação Imediata em 5s', description: 'Tomar uma decisão contrária nos primeiros 5 segundos.' },
        { name: 'Substituição Comportamental', description: 'Trocar o hábito ruim por uma ação saudável anula o ataque.' },
        { name: 'Constância Inabalável', description: 'Cada dia vencido tira camadas de armadura do boss.' },
      ];

      const campaignTasks = aiResult?.campaign?.map((c: any) => ({
        day: c.day,
        action: c.action || `${c.attackName}: Realizar a ação diária contra ${problem.trim()}`,
      })) || Array.from({ length: 30 }).map((_, i) => ({
        day: i + 1,
        action:
          i < 7 ? `Fase 1 (Consciência): Anotar gatilhos e horários em que o impulso de ${problem.trim()} surge.` :
          i < 14 ? `Fase 2 (Redução de Gatilhos): Eliminar ou afastar o principal gatilho do dia relativo a ${problem.trim()}.` :
          i < 21 ? `Fase 3 (Substituição): Aplicar a rotina de substituição assim que notar o impulso.` :
          `Fase 4 (Consolidação): Manter o controle e reforçar o comportamento vitorioso.`,
      }));

      const newBoss: Boss = {
        id: bossId,
        name: defaultName,
        subtitle: aiResult?.subtitle || '',
        class: problem.trim(),
        vice: problem.trim(),
        difficulty,
        attributeArea: selectedArea,
        defeated: false,
        xpReward: rewards.xp,
        penaltyXp: rewards.penalty,
        maxFails: rewards.maxFails,
        isSystem: false,
        portrait: permanentPortraitUrl,
        description: defaultDesc,
        origin: defaultOrigin,
        abilities: defaultAbilities,
        weaknesses: defaultWeaknesses,
        rules: {
          penaltyAreas: [selectedArea],
          penaltyPoints: rewards.penalty,
          rewardXp: rewards.xp,
          rewardAreas: [selectedArea],
          maxFails: rewards.maxFails,
        },
        durationDays: 30,
        dailyTasks: campaignTasks,
      };

      if (isCancelledRef.current) return;
      await addBoss(newBoss);
      if (isCancelledRef.current) return;

      setTimeout(() => {
        startBattle(bossId, 30);
        navigate(`/bosses/${bossId}`);
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
              <p className="text-xs text-muted-foreground">Materializando os atributos do inimigo e forjando a batalha...</p>
            </div>
            <Button
              variant="outline"
              onClick={cancelGeneration}
              className="mt-6 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Cancelar Geração
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-3 border-b border-border/40">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-display tracking-wider uppercase text-primary text-base">
                  <Swords className="w-4 h-4" />
                  Criar Novo Boss
                </DialogTitle>
              </DialogHeader>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
                  <span>Etapa {step + 1} de {totalSteps}</span>
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
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              ) : step === 1 ? (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <p className="font-display text-base text-foreground/95 mb-1">
                      Selecione a área de atribuição do BOSS:
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vencer este boss creditará XP nesta área; perder irá descontar.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {ATTRIBUTE_AREAS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = selectedArea === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleAreaSelect(item.key)}
                          className={cn(
                            'w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3',
                            isSelected
                              ? item.color + ' ring-1 ring-primary shadow-lg'
                              : 'bg-card/60 border-border/60 hover:bg-primary/10 hover:border-primary/40'
                          )}
                        >
                          <div className="p-2 rounded-lg bg-background/50 shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setStep(0)}
                    className="w-full mt-4 h-11 text-muted-foreground hover:text-foreground tracking-wider uppercase text-xs"
                  >
                    Voltar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in" key={step}>
                  <p className="font-display text-base text-foreground/95">
                    {STEPS[step - 2].question}
                  </p>
                  <div className="space-y-2">
                    {STEPS[step - 2].options.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => handleOption(opt.score)}
                        className={cn(
                          'w-full text-left px-4 py-3 rounded-xl border transition-all',
                          'bg-card/60 border-border/60 text-foreground/90',
                          'hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_16px_hsl(var(--primary)/0.15)]'
                        )}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setStep(step - 1)}
                    className="w-full mt-4 h-11 text-muted-foreground hover:text-foreground tracking-wider uppercase text-xs"
                  >
                    Voltar
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
