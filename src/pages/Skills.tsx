import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Lightbulb,
  ChevronRight,
  Dumbbell,
  Brain,
  Sparkle,
  Briefcase,
  DollarSign,
  Crosshair,
  Trash2,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SkillsRadar } from '@/components/dashboard/SkillsRadar';
import { AddSkillDialog } from '@/components/skills/AddSkillDialog';
import { useGame } from '@/contexts/GameContext';
import { AttributeType, Skill } from '@/types/game';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type AreaMeta = {
  type: AttributeType;
  label: string;
  description: string;
  Icon: typeof Dumbbell;
  color: string;
  ring: string;
  tint: string;
  border: string;
};

const AREAS: AreaMeta[] = [
  {
    type: 'physical',
    label: 'Física',
    description: 'Fortaleça seu corpo e aumente sua performance.',
    Icon: Dumbbell,
    color: '#3b82f6',
    ring: 'rgba(59,130,246,0.35)',
    tint: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.30)',
  },
  {
    type: 'mental',
    label: 'Mental',
    description: 'Desenvolva sua mente e amplie seu conhecimento.',
    Icon: Brain,
    color: '#a855f7',
    ring: 'rgba(168,85,247,0.35)',
    tint: 'rgba(168,85,247,0.10)',
    border: 'rgba(168,85,247,0.30)',
  },
  {
    type: 'spiritual',
    label: 'Espiritual',
    description: 'Aprofunde sua fé e fortaleça seu propósito.',
    Icon: Sparkle,
    color: '#facc15',
    ring: 'rgba(250,204,21,0.35)',
    tint: 'rgba(250,204,21,0.10)',
    border: 'rgba(250,204,21,0.30)',
  },
  {
    type: 'professional',
    label: 'Profissional',
    description: 'Evolua sua carreira e aumente sua produtividade.',
    Icon: Briefcase,
    color: '#22c55e',
    ring: 'rgba(34,197,94,0.35)',
    tint: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.30)',
  },
  {
    type: 'financial',
    label: 'Financeira',
    description: 'Organize suas finanças e construa riqueza.',
    Icon: DollarSign,
    color: '#f59e0b',
    ring: 'rgba(245,158,11,0.35)',
    tint: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.30)',
  },
];

const XP_PER_LEVEL = 100;

function ReadOnlySkillRow({ skill, color, onDelete }: { skill: Skill; color: string; onDelete?: (id: string) => void }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border bg-card/40"
      style={{ borderColor: `${color}33` }}
    >
      <div
        className="w-11 h-11 rounded-xl border flex items-center justify-center text-xl shrink-0"
        style={{
          borderColor: color,
          background: `${color}14`,
          boxShadow: `0 0 10px ${color}40`,
        }}
      >
        {skill.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{skill.name}</p>
        {skill.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
            {skill.description}
          </p>
        )}
      </div>
      {!skill.isDefault && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(skill.id)}
          title="Excluir habilidade"
          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function Skills() {
  const { skills, attributes, addSkill, deleteSkill } = useGame();
  const [helpOpen, setHelpOpen] = useState(false);
  const [openArea, setOpenArea] = useState<AreaMeta | null>(null);


  const countByArea = (t: AttributeType) => skills.filter((s) => s.attribute === t).length;

  const areaSkills = openArea ? skills.filter((s) => s.attribute === openArea.type) : [];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto pb-10 px-1">
        {/* Title */}
        <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-3">
            <Crosshair
              className="w-7 h-7"
              style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.55))' }}
            />
            <h1
              className="font-display text-3xl md:text-4xl tracking-[0.18em] font-bold"
              style={{
                background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              SKILLS
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2 px-6">
            Fortaleça skills existentes através das missões ou crie suas próprias skills.
          </p>
        </div>

        {/* Skill Tree Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 relative rounded-2xl border p-4 md:p-5"
          style={{
            borderColor: 'rgba(245,158,11,0.18)',
            background:
              'radial-gradient(120% 80% at 50% 0%, rgba(245,158,11,0.06) 0%, rgba(5,8,15,0.6) 60%, rgba(5,8,15,0.85) 100%)',
            boxShadow: '0 0 40px rgba(245,158,11,0.05) inset',
          }}
        >
          <button
            onClick={() => setHelpOpen(true)}
            className="absolute top-3 right-3 w-9 h-9 rounded-lg border border-border/60 bg-card/70 flex items-center justify-center hover:border-amber-500/40 hover:text-amber-400 transition"
            aria-label="Ajuda"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <div className="text-center">
            <h2
              className="font-display text-base tracking-[0.2em] font-bold leading-tight"
              style={{ color: '#22d3ee', textShadow: '0 0 12px rgba(34,211,238,0.4)' }}
            >
              ÁRVORE DE
              <br />
              HABILIDADES
            </h2>
          </div>

          <div className="mt-2">
            <SkillsRadar attributes={attributes} />
          </div>
        </motion.div>

        {/* Aprimore suas Skills */}
        <div className="mt-6 rounded-2xl border border-border/40 bg-card/30 p-4">
          <h3
            className="font-display text-sm tracking-[0.2em] font-bold mb-3"
            style={{ color: '#f59e0b' }}
          >
            APRIMORE SUAS SKILLS
          </h3>

          <div className="space-y-2.5">
            {AREAS.map((a) => {
              const count = countByArea(a.type);
              return (
                <button
                  key={a.type}
                  onClick={() => setOpenArea(a)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card/40 hover:bg-card/70 transition-all text-left"
                  style={{ borderColor: a.border }}
                >
                  <div
                    className="w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{
                      borderColor: a.color,
                      background: a.tint,
                      boxShadow: `0 0 12px ${a.ring}`,
                    }}
                  >
                    <a.Icon className="w-5 h-5" style={{ color: a.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{a.label}</p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {a.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-display" style={{ color: a.color }}>
                      {count} skills
                    </span>
                    <ChevronRight className="w-4 h-4" style={{ color: a.color }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tip card */}
        <div className="mt-5 rounded-2xl border border-amber-500/15 bg-card/30 p-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full border border-amber-500/40 bg-amber-500/10 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-amber-400 font-semibold">Dica:</span> As skills servem como
            um direcionamento sobre o que buscar evoluir em cada uma das áreas.
          </p>
        </div>
      </div>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              Como funcionam as skills?
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2 text-sm leading-relaxed">
              <span className="block">
                As skills evoluem automaticamente através das missões, hábitos e ações que você
                realiza dentro do app.
              </span>
              <span className="block">
                Você pode criar novas skills personalizadas dentro de cada área, mas não é
                possível adicionar ou remover pontos manualmente — a evolução acontece pela sua
                jornada real.
              </span>
              <span className="block text-amber-400/90">
                Conclua missões na área correspondente para ver suas skills crescerem.
              </span>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Area Dialog */}
      <Dialog open={!!openArea} onOpenChange={(o) => !o && setOpenArea(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          {openArea && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: openArea.color,
                      background: openArea.tint,
                      boxShadow: `0 0 10px ${openArea.ring}`,
                    }}
                  >
                    <openArea.Icon className="w-4 h-4" style={{ color: openArea.color }} />
                  </div>
                  <div>
                    <p className="font-display tracking-wider" style={{ color: openArea.color }}>
                      {openArea.label.toUpperCase()}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-normal">
                      {areaSkills.length} skills nesta área
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-2 mt-2">
                <AnimatePresence initial={false}>
                  {areaSkills.map((s) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <ReadOnlySkillRow skill={s} color={openArea.color} onDelete={deleteSkill} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {areaSkills.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Nenhuma skill nesta área ainda. Crie a primeira!
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border/40 flex justify-center">
                <AddSkillDialog attribute={openArea.type} onAddSkill={addSkill} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
