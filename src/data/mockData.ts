import { User, Attribute, Skill, Mission, InventoryItem, RankingUser } from '@/types/game';

export const currentUser: User = {
  id: '1',
  name: 'Guerreiro Anônimo',
  avatar: '/placeholder.svg',
  level: 12,
  totalXP: 15420,
  earnedTotalXP: 15420,
  xpToNextLevel: 2000,
  currentXP: 1420,
  energy: 85,
  maxEnergy: 100,
  rank: 42,
  title: 'Aventureiro Determinado',
};

export const attributes: Attribute[] = [
  { type: 'physical', name: 'Físico', xp: 3200, level: 8, currentXP: 0, xpToNextLevel: 500, icon: '💪' },
  { type: 'mental', name: 'Mental', xp: 4100, level: 10, currentXP: 0, xpToNextLevel: 400, icon: '🧠' },
  { type: 'spiritual', name: 'Espiritual', xp: 2800, level: 7, currentXP: 0, xpToNextLevel: 300, icon: '✨' },
  { type: 'professional', name: 'Profissional', xp: 3500, level: 9, currentXP: 0, xpToNextLevel: 600, icon: '💼' },
  { type: 'financial', name: 'Financeiro', xp: 1820, level: 5, currentXP: 0, xpToNextLevel: 380, icon: '💰' },
];

export const skills: Skill[] = [
  // Physical skills
  { id: 'sp1', name: 'Força', attribute: 'physical', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Melhore sua capacidade física', icon: '🏋️' },
  { id: 'sp2', name: 'Flexibilidade', attribute: 'physical', xp: 0, level: 0, maxLevel: 10, unlocked: false, description: 'Aumente sua mobilidade', icon: '🤸' },
  { id: 'sp3', name: 'Aparência', attribute: 'physical', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Cuide da sua imagem pessoal', icon: '✨' },
  { id: 'sp4', name: 'Alimentação', attribute: 'physical', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Nutra seu corpo com qualidade', icon: '🥗' },
  { id: 'sp5', name: 'Resistência', attribute: 'physical', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Aumente sua energia diária', icon: '🏃' },

  // Mental skills
  { id: 'sm1', name: 'Inteligência', attribute: 'mental', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Expanda seu conhecimento', icon: '🧠' },
  { id: 'sm2', name: 'Disciplina', attribute: 'mental', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Desenvolva constância e foco', icon: '🎯' },
  { id: 'sm3', name: 'Sociabilidade', attribute: 'mental', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Melhore suas relações sociais', icon: '🤝' },
  { id: 'sm4', name: 'Resiliência', attribute: 'mental', xp: 0, level: 0, maxLevel: 10, unlocked: false, description: 'Fortaleça-se diante da adversidade', icon: '🛡️' },
  { id: 'sm5', name: 'Comunicação', attribute: 'mental', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Melhore sua expressão e oratória', icon: '🗣️' },

  // Professional skills
  { id: 'sr1', name: 'Técnica', attribute: 'professional', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Domine habilidades técnicas', icon: '💻' },
  { id: 'sr2', name: 'Estratégia', attribute: 'professional', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Pense de forma estratégica', icon: '♟️' },
  { id: 'sr3', name: 'Networking', attribute: 'professional', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Expanda sua rede de contatos', icon: '🌐' },
  { id: 'sr4', name: 'Influência', attribute: 'professional', xp: 0, level: 0, maxLevel: 10, unlocked: false, description: 'Aumente seu poder de persuasão', icon: '📢' },
  { id: 'sr5', name: 'Liderança', attribute: 'professional', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Aprimore suas habilidades de líder', icon: '👑' },

  // Spiritual skills
  { id: 'ss1', name: 'Natureza', attribute: 'spiritual', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Conecte-se com a natureza', icon: '🌿' },
  { id: 'ss2', name: 'Autocontrole', attribute: 'spiritual', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Domine seus impulsos', icon: '🧘' },
  { id: 'ss3', name: 'Conexão', attribute: 'spiritual', xp: 0, level: 0, maxLevel: 10, unlocked: false, description: 'Aprofunde sua conexão espiritual', icon: '🔮' },
  { id: 'ss4', name: 'Maturidade', attribute: 'spiritual', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Desenvolva sabedoria emocional', icon: '🌳' },
  { id: 'ss5', name: 'Gratidão', attribute: 'spiritual', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Pratique a gratidão diária', icon: '🙏' },

  // Financial skills
  { id: 'sf1', name: 'Organização', attribute: 'financial', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Organize suas finanças', icon: '📋' },
  { id: 'sf2', name: 'Investimentos', attribute: 'financial', xp: 0, level: 0, maxLevel: 10, unlocked: false, description: 'Aprenda a investir', icon: '📈' },
  { id: 'sf3', name: 'Controle', attribute: 'financial', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Controle seus gastos', icon: '📊' },
  { id: 'sf4', name: 'Dívidas', attribute: 'financial', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Gerencie e elimine dívidas', icon: '💳' },
  { id: 'sf5', name: 'Conhecimento', attribute: 'financial', xp: 0, level: 0, maxLevel: 10, unlocked: true, description: 'Educação financeira contínua', icon: '📚' },
];

export const missions: Mission[] = [];

export const inventory: InventoryItem[] = [
  { id: 'i1', name: 'Emblema do Iniciante', description: 'Concedido ao iniciar sua jornada', rarity: 'common', type: 'badge', icon: '🎖️', quantity: 1 },
  { id: 'i2', name: 'Cristal de Foco', description: '+10% XP em missões mentais por 24h', rarity: 'rare', type: 'buff', icon: '💎', quantity: 3 },
  { id: 'i3', name: 'Troféu Primeira Vitória', description: 'Primeira missão diária completada', rarity: 'uncommon', type: 'trophy', icon: '🏆', quantity: 1 },
  { id: 'i4', name: 'Poção de Energia', description: 'Restaura 25 pontos de energia', rarity: 'common', type: 'consumable', icon: '⚡', quantity: 5 },
  { id: 'i5', name: 'Selo do Guerreiro', description: 'Completou 7 dias consecutivos de treino', rarity: 'epic', type: 'badge', icon: '⚔️', quantity: 1 },
  { id: 'i6', name: 'Amuleto da Sabedoria', description: '+15% XP em todas as áreas por 12h', rarity: 'legendary', type: 'buff', icon: '📿', quantity: 1 },
];

export const ranking: RankingUser[] = [
  { id: 'r1', name: 'MestreDasArtes', avatar: '/placeholder.svg', level: 45, totalXP: 125000, rank: 1 },
  { id: 'r2', name: 'GuerreiroImplacável', avatar: '/placeholder.svg', level: 42, totalXP: 118500, rank: 2 },
  { id: 'r3', name: 'SábioAncião', avatar: '/placeholder.svg', level: 40, totalXP: 112000, rank: 3 },
  { id: 'r4', name: 'CaçadorDeSonhos', avatar: '/placeholder.svg', level: 38, totalXP: 98000, rank: 4 },
  { id: 'r5', name: 'FênixRenascida', avatar: '/placeholder.svg', level: 35, totalXP: 89000, rank: 5 },
  { id: 'r6', name: 'MongeIluminado', avatar: '/placeholder.svg', level: 32, totalXP: 78000, rank: 6 },
  { id: 'r7', name: 'TitãDaVontade', avatar: '/placeholder.svg', level: 28, totalXP: 62000, rank: 7 },
  { id: 'r8', name: 'EstrategistaReal', avatar: '/placeholder.svg', level: 25, totalXP: 51000, rank: 8 },
  { id: 'r9', name: 'AventureiroBravo', avatar: '/placeholder.svg', level: 20, totalXP: 38000, rank: 9 },
  { id: 'r10', name: 'NovatoPromissor', avatar: '/placeholder.svg', level: 15, totalXP: 22000, rank: 10 },
];
