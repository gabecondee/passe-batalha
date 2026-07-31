import { useState, useCallback } from 'react';
import { Skill, AttributeType } from '@/types/game';
import { skills as initialSkills } from '@/data/mockData';
import { toast } from 'sonner';

const XP_PER_CLICK = 25;
const XP_PER_LEVEL = 100;

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);

  const addXpToSkill = useCallback((skillId: string) => {
    setSkills(prevSkills => 
      prevSkills.map(skill => {
        if (skill.id !== skillId) return skill;
        if (!skill.unlocked) return skill;
        if (skill.level >= skill.maxLevel) {
          toast.info(`${skill.name} já está no nível máximo!`);
          return skill;
        }

        const newXp = skill.xp + XP_PER_CLICK;
        const xpForNextLevel = (skill.level + 1) * XP_PER_LEVEL;
        
        // Check if leveled up
        if (newXp >= xpForNextLevel && skill.level < skill.maxLevel) {
          const newLevel = skill.level + 1;
          toast.success(`🎉 ${skill.name} subiu para o nível ${newLevel}!`);
          return {
            ...skill,
            xp: newXp,
            level: newLevel,
          };
        }

        return {
          ...skill,
          xp: newXp,
        };
      })
    );
  }, []);

  const removeXpFromSkill = useCallback((skillId: string) => {
    setSkills(prevSkills => 
      prevSkills.map(skill => {
        if (skill.id !== skillId) return skill;
        if (!skill.unlocked) return skill;
        
        // Minimum XP is level 1 with 0 progress (which is XP_PER_LEVEL for level 1)
        const minXp = XP_PER_LEVEL; // Level 1 starts at 100 XP
        
        if (skill.xp <= minXp && skill.level <= 1) {
          toast.info(`${skill.name} está no XP mínimo`);
          return skill;
        }
        
        const newXp = Math.max(minXp, skill.xp - XP_PER_CLICK);
        const xpForCurrentLevel = skill.level * XP_PER_LEVEL;
        
        // Check if leveled down
        if (newXp < xpForCurrentLevel && skill.level > 1) {
          const newLevel = skill.level - 1;
          toast.warning(`${skill.name} voltou para o nível ${newLevel}`);
          return {
            ...skill,
            xp: newXp,
            level: newLevel,
          };
        }

        toast.success(`-${XP_PER_CLICK} XP em ${skill.name}`);
        return {
          ...skill,
          xp: newXp,
        };
      })
    );
  }, []);

  const unlockSkill = useCallback((skillId: string) => {
    setSkills(prevSkills =>
      prevSkills.map(skill => {
        if (skill.id !== skillId) return skill;
        if (skill.unlocked) return skill;
        
        toast.success(`🔓 ${skill.name} foi desbloqueada!`);
        return {
          ...skill,
          unlocked: true,
          level: 1,
          xp: XP_PER_LEVEL,
        };
      })
    );
  }, []);

  const addSkill = useCallback((newSkill: {
    name: string;
    description: string;
    icon: string;
    attribute: AttributeType;
  }) => {
    const id = `skill-${Date.now()}`;
    const skill: Skill = {
      id,
      name: newSkill.name,
      attribute: newSkill.attribute,
      xp: 0,
      level: 0,
      maxLevel: 10,
      unlocked: false,
      description: newSkill.description,
      icon: newSkill.icon,
    };

    setSkills(prevSkills => [...prevSkills, skill]);
    toast.success(`✨ ${newSkill.name} foi adicionada à árvore!`);
  }, []);

  return {
    skills,
    addXpToSkill,
    removeXpFromSkill,
    unlockSkill,
    addSkill,
  };
}
