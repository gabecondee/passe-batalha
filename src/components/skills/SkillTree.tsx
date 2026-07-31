import { Skill, AttributeType } from '@/types/game';
import { SkillNode } from './SkillNode';
import { AddSkillDialog } from './AddSkillDialog';
import { cn } from '@/lib/utils';

interface SkillTreeProps {
  skills: Skill[];
  filter?: AttributeType | 'all';
  onAddXp?: (skillId: string) => void;
  onRemoveXp?: (skillId: string) => void;
  onUnlock?: (skillId: string) => void;
  onAddSkill?: (skill: {
    name: string;
    description: string;
    icon: string;
    attribute: AttributeType;
  }) => void;
}

const categoryOrder: AttributeType[] = ['physical', 'mental', 'professional', 'spiritual', 'financial'];

const attributeLabels: Record<AttributeType, string> = {
  physical: 'Física',
  mental: 'Mental',
  spiritual: 'Espiritual',
  professional: 'Profissional',
  financial: 'Financeiro',
};

const attributeIcons: Record<AttributeType, string> = {
  physical: '💪',
  mental: '🧠',
  spiritual: '✨',
  professional: '💼',
  financial: '💰',
};

const attributeAccentColors: Record<AttributeType, string> = {
  physical: 'border-physical/30',
  mental: 'border-mental/30',
  spiritual: 'border-spiritual/30',
  professional: 'border-professional/30',
  financial: 'border-financial/30',
};

const attributeTagColors: Record<AttributeType, string> = {
  physical: 'bg-physical/10 text-physical border-physical/30',
  mental: 'bg-mental/10 text-mental border-mental/30',
  spiritual: 'bg-spiritual/10 text-spiritual border-spiritual/30',
  professional: 'bg-professional/10 text-professional border-professional/30',
  financial: 'bg-financial/10 text-financial border-financial/30',
};

export function SkillTree({ skills, filter = 'all', onAddXp, onRemoveXp, onUnlock, onAddSkill }: SkillTreeProps) {
  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.attribute]) {
      acc[skill.attribute] = [];
    }
    acc[skill.attribute].push(skill);
    return acc;
  }, {} as Record<AttributeType, Skill[]>);

  const attributesToShow = filter === 'all'
    ? categoryOrder.filter(a => groupedSkills[a]?.length > 0 || true)
    : [filter];

  return (
    <div className="space-y-4">
      {attributesToShow.map((attribute) => {
        const categorySkills = groupedSkills[attribute] || [];
        const unlockedInCategory = categorySkills.filter(s => s.unlocked).length;

        return (
          <div
            key={attribute}
            className={cn(
              'fantasy-card p-4 border',
              attributeAccentColors[attribute]
            )}
          >
            {/* Category Header */}
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-display tracking-wider',
                attributeTagColors[attribute]
              )}>
                <span>{attributeIcons[attribute]}</span>
                <span>{attributeLabels[attribute]}</span>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {unlockedInCategory}/{categorySkills.length}
              </span>
            </div>

            {/* Skills Row — horizontal scroll */}
            <div className="flex items-start gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {categorySkills.map((skill) => (
                <SkillNode
                  key={skill.id}
                  skill={skill}
                  onAddXp={onAddXp}
                  onRemoveXp={onRemoveXp}
                  onUnlock={onUnlock}
                />
              ))}

              {/* Add Skill Button */}
              {onAddSkill && (
                <AddSkillDialog
                  attribute={attribute}
                  onAddSkill={onAddSkill}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
