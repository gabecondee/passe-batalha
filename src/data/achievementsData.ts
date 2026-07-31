import {
  Trophy, Flame, Shield, Castle, Crown, Check, CheckCircle2, Sword, Settings,
  Axe, Flag, Dumbbell, Apple, BookOpen, Medal, Gift, Brain, Briefcase, Coins,
  Skull, Award, Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type Rarity = 'comum' | 'incomum' | 'rara' | 'epica' | 'lendaria' | 'mitica';

export type Area = 'Física' | 'Mental' | 'Espiritual' | 'Profissional' | 'Financeira';

export type MissionDifficulty = 1 | 2 | 3 | 4 | 5;
export type BossRarity = 'rare' | 'epic' | 'legendary';

export type Requirement =
  | { type: 'setup' }
  | { type: 'streak'; value: number }
  | { type: 'daily_actions'; value: number }
  | { type: 'main_missions_completed'; value: number }
  | { type: 'main_missions_by_difficulty'; difficulty: MissionDifficulty; value: number }
  | { type: 'boss_hits'; value: number }
  | { type: 'bosses_defeated'; value: number }
  | { type: 'bosses_defeated_by_rarity'; rarity: BossRarity; value: number }
  | { type: 'trainings'; value: number }
  | { type: 'diet_plans_created'; value: number }
  | { type: 'journal_entries'; value: number }
  | { type: 'area_xp'; area: Area; value: number }
  | { type: 'investments'; value: number }
  | { type: 'level'; value: number }
  | { type: 'ranking_rank'; maxRank: number }
  | { type: 'seasons_won'; value: number }
  | { type: 'shop_item'; itemId: string };

export interface AchievementDef {
  id: string;
  name: string;
  milestone: string; // "Marco atingido" - shown in popup
  phrase: string;    // Descrição
  xp: number;
  area: Area;
  icon: LucideIcon;
  rarity: Rarity;
  requirement: Requirement;
}

const RARITY_MAP: Record<string, Rarity> = {
  'Comum': 'comum',
  'Incomum': 'incomum',
  'Rara': 'rara',
  'Épica': 'epica',
  'Lendária': 'lendaria',
  'Mítica': 'mitica',
};

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles, flame: Flame, shield: Shield, castle: Castle, crown: Crown,
  check: Check, check_circle: CheckCircle2, sword: Sword, gear: Settings,
  trophy: Trophy, axe: Axe, flag: Flag, dumbbell: Dumbbell, apple: Apple,
  book: BookOpen, medal: Medal, gift: Gift, brain: Brain, briefcase: Briefcase,
  coins: Coins, skull: Skull, award: Award,
};

interface RawAch {
  id: string; name: string; rar: string; milestone: string; phrase: string;
  xp: number; area: Area; icon: string; req: Requirement;
}

const A = (r: RawAch): AchievementDef => ({
  id: r.id, name: r.name, milestone: r.milestone, phrase: r.phrase,
  xp: r.xp, area: r.area, icon: ICON_MAP[r.icon] ?? Trophy,
  rarity: RARITY_MAP[r.rar] ?? 'comum',
  requirement: r.req,
});

export const ALL_ACHIEVEMENTS: AchievementDef[] = [
  A({ id: 'ACH_001', name: 'Despertar', rar: 'Comum', milestone: 'Finalizou as configurações iniciais', phrase: 'Parabéns! Você deu o primeiro passo rumo à reconstrução da sua vida.', xp: 10, area: 'Mental', icon: 'sparkles', req: { type: 'setup' } }),

  // Ofensiva
  A({ id: 'ACH_002', name: 'Chama Inicial', rar: 'Comum', milestone: '3 dias de ofensiva', phrase: 'Boa! Você manteve 3 dias de ofensiva.', xp: 10, area: 'Mental', icon: 'flame', req: { type: 'streak', value: 3 } }),
  A({ id: 'ACH_003', name: 'Fogo Crescente', rar: 'Incomum', milestone: '7 dias de ofensiva', phrase: 'Sua disciplina começou a ganhar forma.', xp: 30, area: 'Mental', icon: 'flame', req: { type: 'streak', value: 7 } }),
  A({ id: 'ACH_004', name: 'Guerreiro Consistente', rar: 'Rara', milestone: '30 dias de ofensiva', phrase: '30 dias sem quebrar sua sequência. Continue avançando.', xp: 100, area: 'Mental', icon: 'shield', req: { type: 'streak', value: 30 } }),
  A({ id: 'ACH_005', name: 'Muralha de Disciplina', rar: 'Épica', milestone: '100 dias de ofensiva', phrase: 'Você provou que não depende de motivação.', xp: 200, area: 'Mental', icon: 'castle', req: { type: 'streak', value: 100 } }),
  A({ id: 'ACH_006', name: 'Lenda Viva', rar: 'Lendária', milestone: '365 dias de ofensiva', phrase: 'Um ano inteiro de consistência. Poucos chegam até aqui.', xp: 500, area: 'Mental', icon: 'crown', req: { type: 'streak', value: 365 } }),

  // Missões Diárias
  A({ id: 'ACH_007', name: 'Primeiro Passo', rar: 'Comum', milestone: '1 missão diária concluída', phrase: 'Toda evolução começa com uma única missão.', xp: 10, area: 'Mental', icon: 'check', req: { type: 'daily_actions', value: 1 } }),
  A({ id: 'ACH_008', name: 'Em Movimento', rar: 'Incomum', milestone: '10 missões diárias concluídas', phrase: 'Você concluiu suas primeiras 10 missões diárias.', xp: 30, area: 'Mental', icon: 'check', req: { type: 'daily_actions', value: 10 } }),
  A({ id: 'ACH_009', name: 'Executor', rar: 'Rara', milestone: '50 missões diárias concluídas', phrase: 'Você está criando o hábito da ação.', xp: 100, area: 'Mental', icon: 'sword', req: { type: 'daily_actions', value: 50 } }),
  A({ id: 'ACH_010', name: 'Incansável', rar: 'Épica', milestone: '100 missões diárias concluídas', phrase: 'Sua disciplina está ficando afiada.', xp: 200, area: 'Mental', icon: 'sword', req: { type: 'daily_actions', value: 100 } }),
  A({ id: 'ACH_011', name: 'Máquina de Evolução', rar: 'Lendária', milestone: '500 missões diárias concluídas', phrase: 'Você transformou a ação em rotina.', xp: 500, area: 'Mental', icon: 'gear', req: { type: 'daily_actions', value: 500 } }),
  A({ id: 'ACH_012', name: 'Imparável', rar: 'Mítica', milestone: '1000 missões diárias concluídas', phrase: 'Mil missões concluídas. Você não é mais o mesmo homem.', xp: 800, area: 'Mental', icon: 'trophy', req: { type: 'daily_actions', value: 1000 } }),

  // Chefões - golpes
  A({ id: 'ACH_013', name: 'Primeiro Sangue', rar: 'Comum', milestone: '1 golpe aplicado em chefão', phrase: 'Você acertou seu primeiro golpe contra um chefão.', xp: 10, area: 'Mental', icon: 'axe', req: { type: 'boss_hits', value: 1 } }),
  A({ id: 'ACH_014', name: 'Caçador', rar: 'Incomum', milestone: '10 golpes aplicados em chefões', phrase: 'Os monstros internos já não assustam tanto.', xp: 30, area: 'Mental', icon: 'axe', req: { type: 'boss_hits', value: 10 } }),
  A({ id: 'ACH_015', name: 'Matador de Monstros', rar: 'Rara', milestone: '50 golpes aplicados em chefões', phrase: 'Cada golpe representa uma vitória contra seus velhos hábitos.', xp: 100, area: 'Mental', icon: 'axe', req: { type: 'boss_hits', value: 50 } }),
  A({ id: 'ACH_016', name: 'Destruidor', rar: 'Épica', milestone: '100 golpes aplicados em chefões', phrase: 'Seu inimigo está ficando sem forças.', xp: 200, area: 'Mental', icon: 'axe', req: { type: 'boss_hits', value: 100 } }),
  A({ id: 'ACH_017', name: 'Exterminador', rar: 'Lendária', milestone: '500 golpes aplicados em chefões', phrase: 'Você se tornou uma ameaça para os seus próprios vícios.', xp: 500, area: 'Mental', icon: 'axe', req: { type: 'boss_hits', value: 500 } }),

  // Missões Principais totais
  A({ id: 'ACH_018', name: 'Rumo ao Destino', rar: 'Comum', milestone: '1 missão principal concluída', phrase: 'Você concluiu sua primeira missão principal.', xp: 10, area: 'Profissional', icon: 'flag', req: { type: 'main_missions_completed', value: 1 } }),
  A({ id: 'ACH_019', name: 'Conquistador', rar: 'Rara', milestone: '10 missões principais concluídas', phrase: 'Seu progresso já pode ser visto.', xp: 100, area: 'Profissional', icon: 'flag', req: { type: 'main_missions_completed', value: 10 } }),
  A({ id: 'ACH_020', name: 'Herói', rar: 'Épica', milestone: '50 missões principais concluídas', phrase: 'Poucos homens mantêm esse nível de comprometimento.', xp: 200, area: 'Profissional', icon: 'flag', req: { type: 'main_missions_completed', value: 50 } }),
  A({ id: 'ACH_021', name: 'Lenda', rar: 'Lendária', milestone: '100 missões principais concluídas', phrase: 'Você está construindo uma história digna de ser lembrada.', xp: 500, area: 'Profissional', icon: 'crown', req: { type: 'main_missions_completed', value: 100 } }),

  // Treino
  A({ id: 'ACH_022', name: 'Primeiro Treino', rar: 'Comum', milestone: 'Criou o primeiro treino', phrase: 'Todo guerreiro começa com um único treino.', xp: 10, area: 'Física', icon: 'dumbbell', req: { type: 'trainings', value: 1 } }),
  A({ id: 'ACH_023', name: 'Corpo em Movimento', rar: 'Incomum', milestone: '10 treinos concluídos', phrase: 'Seu corpo já sente os efeitos da disciplina.', xp: 30, area: 'Física', icon: 'dumbbell', req: { type: 'trainings', value: 10 } }),
  A({ id: 'ACH_024', name: 'Atleta', rar: 'Rara', milestone: '50 treinos concluídos', phrase: 'Você está construindo força através da consistência.', xp: 100, area: 'Física', icon: 'dumbbell', req: { type: 'trainings', value: 50 } }),
  A({ id: 'ACH_025', name: 'Máquina de Guerra', rar: 'Épica', milestone: '100 treinos concluídos', phrase: 'Seu corpo se tornou uma arma a seu favor.', xp: 200, area: 'Física', icon: 'dumbbell', req: { type: 'trainings', value: 100 } }),

  // Dieta
  A({ id: 'ACH_026', name: 'Primeiro Plano', rar: 'Comum', milestone: 'Criou a primeira dieta', phrase: 'Grandes resultados começam com um plano.', xp: 10, area: 'Física', icon: 'apple', req: { type: 'diet_plans_created', value: 1 } }),
  A({ id: 'ACH_027', name: 'Alimentação Estratégica', rar: 'Rara', milestone: 'Criou 10 planos de dieta', phrase: 'Você aprendeu a abastecer seu corpo corretamente.', xp: 100, area: 'Física', icon: 'apple', req: { type: 'diet_plans_created', value: 10 } }),
  A({ id: 'ACH_028', name: 'Mestre da Nutrição', rar: 'Épica', milestone: 'Criou 30 planos de dieta', phrase: 'Sua alimentação agora trabalha a seu favor.', xp: 200, area: 'Física', icon: 'apple', req: { type: 'diet_plans_created', value: 30 } }),

  // Diário
  A({ id: 'ACH_029', name: 'Primeiras Palavras', rar: 'Comum', milestone: 'Primeiro registro criado', phrase: 'Registrar pensamentos é o início da clareza.', xp: 10, area: 'Mental', icon: 'book', req: { type: 'journal_entries', value: 1 } }),
  A({ id: 'ACH_030', name: 'Cronista', rar: 'Incomum', milestone: '10 registros realizados', phrase: 'Você começou a registrar sua jornada.', xp: 30, area: 'Mental', icon: 'book', req: { type: 'journal_entries', value: 10 } }),
  A({ id: 'ACH_031', name: 'Historiador', rar: 'Rara', milestone: '50 registros realizados', phrase: 'Suas reflexões estão construindo sua evolução.', xp: 100, area: 'Mental', icon: 'book', req: { type: 'journal_entries', value: 50 } }),
  A({ id: 'ACH_032', name: 'Filósofo', rar: 'Épica', milestone: '100 registros realizados', phrase: 'Você aprendeu a observar sua própria mente.', xp: 200, area: 'Mental', icon: 'book', req: { type: 'journal_entries', value: 100 } }),
  A({ id: 'ACH_033', name: 'Guardião das Memórias', rar: 'Lendária', milestone: '365 registros realizados', phrase: 'Um ano inteiro registrando sua jornada.', xp: 500, area: 'Mental', icon: 'book', req: { type: 'journal_entries', value: 365 } }),

  // Ranking
  A({ id: 'ACH_034', name: 'Top 10', rar: 'Rara', milestone: 'Entrou no Top 10 mensal', phrase: 'Você já está entre os melhores guerreiros.', xp: 100, area: 'Profissional', icon: 'medal', req: { type: 'ranking_rank', maxRank: 10 } }),
  A({ id: 'ACH_035', name: 'Elite do Reino', rar: 'Épica', milestone: 'Entrou no Top 5 mensal', phrase: 'Sua dedicação o colocou entre a elite.', xp: 200, area: 'Profissional', icon: 'medal', req: { type: 'ranking_rank', maxRank: 5 } }),
  A({ id: 'ACH_036', name: 'Pódio da Glória', rar: 'Épica', milestone: 'Entrou no Top 3 mensal', phrase: 'Seu esforço agora é visível para todos.', xp: 200, area: 'Profissional', icon: 'medal', req: { type: 'ranking_rank', maxRank: 3 } }),
  A({ id: 'ACH_037', name: 'Campeão do Reino', rar: 'Lendária', milestone: 'Campeão da temporada', phrase: 'Você dominou a temporada.', xp: 500, area: 'Profissional', icon: 'crown', req: { type: 'ranking_rank', maxRank: 1 } }),
  A({ id: 'ACH_038', name: 'Imperador da Temporada', rar: 'Mítica', milestone: '3 temporadas vencidas', phrase: 'Seu nome entrou para a história do reino.', xp: 800, area: 'Profissional', icon: 'crown', req: { type: 'seasons_won', value: 3 } }),

  // Loja
  A({ id: 'ACH_039', name: 'Coqueteleira da Ascensão', rar: 'Épica', milestone: 'Item resgatado', phrase: 'Sua consistência já pode ser segurada nas mãos.', xp: 200, area: 'Física', icon: 'gift', req: { type: 'shop_item', itemId: 'shaker-ascensao' } }),
  A({ id: 'ACH_040', name: 'Cálice da Constância', rar: 'Lendária', milestone: 'Item resgatado', phrase: 'A disciplina deixou de ser esforço e virou identidade.', xp: 500, area: 'Mental', icon: 'gift', req: { type: 'shop_item', itemId: 'calice-constancia' } }),
  A({ id: 'ACH_041', name: 'Manto do Reconstrutor', rar: 'Mítica', milestone: 'Item resgatado', phrase: 'Você se tornou um exemplo para outros guerreiros.', xp: 800, area: 'Profissional', icon: 'gift', req: { type: 'shop_item', itemId: 'manto-reconstrutor' } }),

  // Skills - Física
  A({ id: 'ACH_042', name: 'Corpo Desperto', rar: 'Comum', milestone: '1.000 XP na Área Física', phrase: 'Você começou a construir uma versão mais forte de si mesmo.', xp: 10, area: 'Física', icon: 'dumbbell', req: { type: 'area_xp', area: 'Física', value: 1000 } }),
  A({ id: 'ACH_043', name: 'Corpo em Evolução', rar: 'Incomum', milestone: '3.000 XP na Área Física', phrase: 'Sua disciplina já começou a gerar resultados visíveis.', xp: 30, area: 'Física', icon: 'dumbbell', req: { type: 'area_xp', area: 'Física', value: 3000 } }),
  A({ id: 'ACH_044', name: 'Guerreiro de Aço', rar: 'Rara', milestone: '5.000 XP na Área Física', phrase: 'Seu esforço diário está moldando seu corpo.', xp: 100, area: 'Física', icon: 'dumbbell', req: { type: 'area_xp', area: 'Física', value: 5000 } }),
  A({ id: 'ACH_045', name: 'Atleta da Reconstrução', rar: 'Épica', milestone: '10.000 XP na Área Física', phrase: 'Você está muito acima da média.', xp: 200, area: 'Física', icon: 'dumbbell', req: { type: 'area_xp', area: 'Física', value: 10000 } }),
  A({ id: 'ACH_046', name: 'Lenda da Arena', rar: 'Lendária', milestone: '20.000 XP na Área Física', phrase: 'Poucos guerreiros alcançam este nível de comprometimento.', xp: 500, area: 'Física', icon: 'dumbbell', req: { type: 'area_xp', area: 'Física', value: 20000 } }),
  A({ id: 'ACH_047', name: 'Corpo Lendário', rar: 'Mítica', milestone: '50.000 XP na Área Física', phrase: 'Seu corpo se tornou uma fortaleza construída pela disciplina.', xp: 800, area: 'Física', icon: 'dumbbell', req: { type: 'area_xp', area: 'Física', value: 50000 } }),

  // Skills - Mental
  A({ id: 'ACH_048', name: 'Mente Desperta', rar: 'Comum', milestone: '1.000 XP na Área Mental', phrase: 'Você começou a fortalecer sua mente.', xp: 10, area: 'Mental', icon: 'brain', req: { type: 'area_xp', area: 'Mental', value: 1000 } }),
  A({ id: 'ACH_049', name: 'Aprendiz do Conhecimento', rar: 'Incomum', milestone: '3.000 XP na Área Mental', phrase: 'Seu conhecimento está crescendo dia após dia.', xp: 30, area: 'Mental', icon: 'brain', req: { type: 'area_xp', area: 'Mental', value: 3000 } }),
  A({ id: 'ACH_050', name: 'Estrategista', rar: 'Rara', milestone: '5.000 XP na Área Mental', phrase: 'Você aprendeu a pensar antes de agir.', xp: 100, area: 'Mental', icon: 'brain', req: { type: 'area_xp', area: 'Mental', value: 5000 } }),
  A({ id: 'ACH_051', name: 'Mestre da Clareza', rar: 'Épica', milestone: '10.000 XP na Área Mental', phrase: 'Sua mente já opera em outro nível.', xp: 200, area: 'Mental', icon: 'brain', req: { type: 'area_xp', area: 'Mental', value: 10000 } }),
  A({ id: 'ACH_052', name: 'Arquiteto Mental', rar: 'Lendária', milestone: '20.000 XP na Área Mental', phrase: 'Você construiu uma mente resistente ao caos.', xp: 500, area: 'Mental', icon: 'brain', req: { type: 'area_xp', area: 'Mental', value: 20000 } }),
  A({ id: 'ACH_053', name: 'Mente Inabalável', rar: 'Mítica', milestone: '50.000 XP na Área Mental', phrase: 'Poucas coisas ainda conseguem desviar seu foco.', xp: 800, area: 'Mental', icon: 'brain', req: { type: 'area_xp', area: 'Mental', value: 50000 } }),

  // Skills - Espiritual
  A({ id: 'ACH_054', name: 'Buscador', rar: 'Comum', milestone: '1.000 XP na Área Espiritual', phrase: 'Você iniciou sua caminhada espiritual.', xp: 10, area: 'Espiritual', icon: 'sparkles', req: { type: 'area_xp', area: 'Espiritual', value: 1000 } }),
  A({ id: 'ACH_055', name: 'Discípulo', rar: 'Incomum', milestone: '3.000 XP na Área Espiritual', phrase: 'Sua fé começou a criar raízes profundas.', xp: 30, area: 'Espiritual', icon: 'sparkles', req: { type: 'area_xp', area: 'Espiritual', value: 3000 } }),
  A({ id: 'ACH_056', name: 'Guardião da Fé', rar: 'Rara', milestone: '5.000 XP na Área Espiritual', phrase: 'Você permanece firme mesmo nas tempestades.', xp: 100, area: 'Espiritual', icon: 'sparkles', req: { type: 'area_xp', area: 'Espiritual', value: 5000 } }),
  A({ id: 'ACH_057', name: 'Servo Fiel', rar: 'Épica', milestone: '10.000 XP na Área Espiritual', phrase: 'Sua constância fortaleceu sua espiritualidade.', xp: 200, area: 'Espiritual', icon: 'sparkles', req: { type: 'area_xp', area: 'Espiritual', value: 10000 } }),
  A({ id: 'ACH_058', name: 'Luz na Escuridão', rar: 'Lendária', milestone: '20.000 XP na Área Espiritual', phrase: 'Sua caminhada inspira outros guerreiros.', xp: 500, area: 'Espiritual', icon: 'sparkles', req: { type: 'area_xp', area: 'Espiritual', value: 20000 } }),
  A({ id: 'ACH_059', name: 'Santo Guerreiro', rar: 'Mítica', milestone: '50.000 XP na Área Espiritual', phrase: 'Sua fé se tornou parte da sua identidade.', xp: 800, area: 'Espiritual', icon: 'sparkles', req: { type: 'area_xp', area: 'Espiritual', value: 50000 } }),

  // Skills - Profissional
  A({ id: 'ACH_060', name: 'Trabalhador', rar: 'Comum', milestone: '1.000 XP na Área Profissional', phrase: 'Você começou a construir algo relevante.', xp: 10, area: 'Profissional', icon: 'briefcase', req: { type: 'area_xp', area: 'Profissional', value: 1000 } }),
  A({ id: 'ACH_061', name: 'Homem de Ação', rar: 'Incomum', milestone: '3.000 XP na Área Profissional', phrase: 'Você aprendeu a agir mesmo sem motivação.', xp: 30, area: 'Profissional', icon: 'briefcase', req: { type: 'area_xp', area: 'Profissional', value: 3000 } }),
  A({ id: 'ACH_062', name: 'Construtor', rar: 'Rara', milestone: '5.000 XP na Área Profissional', phrase: 'Seus resultados começaram a aparecer.', xp: 100, area: 'Profissional', icon: 'briefcase', req: { type: 'area_xp', area: 'Profissional', value: 5000 } }),
  A({ id: 'ACH_063', name: 'Comandante', rar: 'Épica', milestone: '10.000 XP na Área Profissional', phrase: 'Você assumiu o controle do próprio destino.', xp: 200, area: 'Profissional', icon: 'briefcase', req: { type: 'area_xp', area: 'Profissional', value: 10000 } }),
  A({ id: 'ACH_064', name: 'Rei da Execução', rar: 'Lendária', milestone: '20.000 XP na Área Profissional', phrase: 'Sua produtividade se tornou uma vantagem competitiva.', xp: 500, area: 'Profissional', icon: 'briefcase', req: { type: 'area_xp', area: 'Profissional', value: 20000 } }),
  A({ id: 'ACH_065', name: 'Imperador da Construção', rar: 'Mítica', milestone: '50.000 XP na Área Profissional', phrase: 'Você construiu algo que poucos conseguem.', xp: 800, area: 'Profissional', icon: 'briefcase', req: { type: 'area_xp', area: 'Profissional', value: 50000 } }),

  // Skills - Financeira
  A({ id: 'ACH_066', name: 'Organizado', rar: 'Comum', milestone: '1.000 XP na Área Financeira', phrase: 'Você começou a controlar seus recursos.', xp: 10, area: 'Financeira', icon: 'coins', req: { type: 'area_xp', area: 'Financeira', value: 1000 } }),
  A({ id: 'ACH_067', name: 'Acumulador', rar: 'Incomum', milestone: '3.000 XP na Área Financeira', phrase: 'Seus hábitos financeiros estão evoluindo.', xp: 30, area: 'Financeira', icon: 'coins', req: { type: 'area_xp', area: 'Financeira', value: 3000 } }),
  A({ id: 'ACH_068', name: 'Estrategista Financeiro', rar: 'Rara', milestone: '5.000 XP na Área Financeira', phrase: 'Você aprendeu a direcionar seu dinheiro.', xp: 100, area: 'Financeira', icon: 'coins', req: { type: 'area_xp', area: 'Financeira', value: 5000 } }),
  A({ id: 'ACH_069', name: 'Investidor', rar: 'Épica', milestone: '10.000 XP na Área Financeira', phrase: 'Seu patrimônio começou a crescer.', xp: 200, area: 'Financeira', icon: 'coins', req: { type: 'area_xp', area: 'Financeira', value: 10000 } }),
  A({ id: 'ACH_070', name: 'Construtor de Patrimônio', rar: 'Lendária', milestone: '20.000 XP na Área Financeira', phrase: 'Sua disciplina financeira está gerando frutos.', xp: 500, area: 'Financeira', icon: 'coins', req: { type: 'area_xp', area: 'Financeira', value: 20000 } }),
  A({ id: 'ACH_071', name: 'Rei do Ouro', rar: 'Mítica', milestone: '50.000 XP na Área Financeira', phrase: 'Você construiu uma verdadeira fortaleza financeira.', xp: 800, area: 'Financeira', icon: 'coins', req: { type: 'area_xp', area: 'Financeira', value: 50000 } }),

  // Chefões derrotados
  A({ id: 'ACH_072', name: 'Primeiro Troféu', rar: 'Rara', milestone: '1 Chefão derrotado', phrase: 'Você conquistou sua primeira grande vitória.', xp: 100, area: 'Mental', icon: 'skull', req: { type: 'bosses_defeated', value: 1 } }),
  A({ id: 'ACH_073', name: 'Dominador', rar: 'Épica', milestone: '5 Chefões derrotados', phrase: 'Você se acostumou a superar desafios relevantes.', xp: 200, area: 'Mental', icon: 'skull', req: { type: 'bosses_defeated', value: 5 } }),
  A({ id: 'ACH_074', name: 'Predador', rar: 'Lendária', milestone: '10 Chefões derrotados', phrase: 'Você está se tornando um verdadeiro destruidor de monstros.', xp: 500, area: 'Mental', icon: 'skull', req: { type: 'bosses_defeated', value: 10 } }),
  A({ id: 'ACH_075', name: 'Colecionador de Troféus', rar: 'Rara', milestone: '1 Chefão Raro derrotado', phrase: 'Seu histórico de vitórias começa a chamar atenção.', xp: 100, area: 'Mental', icon: 'skull', req: { type: 'bosses_defeated_by_rarity', rarity: 'rare', value: 1 } }),
  A({ id: 'ACH_076', name: 'Senhor dos Raros', rar: 'Épica', milestone: '5 Chefões Raros derrotados', phrase: 'Você se tornou uma ameaça para qualquer adversário.', xp: 200, area: 'Mental', icon: 'skull', req: { type: 'bosses_defeated_by_rarity', rarity: 'rare', value: 5 } }),
  A({ id: 'ACH_077', name: 'Conquistador Épico', rar: 'Épica', milestone: '1 Chefão Épico derrotado', phrase: 'Você superou um desafio extraordinário.', xp: 200, area: 'Mental', icon: 'skull', req: { type: 'bosses_defeated_by_rarity', rarity: 'epic', value: 1 } }),
  A({ id: 'ACH_078', name: 'Desafiador dos Gigantes', rar: 'Lendária', milestone: '5 Chefões Épicos derrotados', phrase: 'Poucos guerreiros chegam tão longe.', xp: 500, area: 'Mental', icon: 'skull', req: { type: 'bosses_defeated_by_rarity', rarity: 'epic', value: 5 } }),
  A({ id: 'ACH_079', name: 'Conquistador Lendário', rar: 'Épica', milestone: '1 Chefão Lendário derrotado', phrase: 'Você derrotou um dos maiores inimigos possíveis.', xp: 200, area: 'Mental', icon: 'skull', req: { type: 'bosses_defeated_by_rarity', rarity: 'legendary', value: 1 } }),
  A({ id: 'ACH_080', name: 'Assassino de Lendas', rar: 'Lendária', milestone: '5 Chefões Lendários derrotados', phrase: 'O impossível começou a se tornar rotina.', xp: 500, area: 'Mental', icon: 'skull', req: { type: 'bosses_defeated_by_rarity', rarity: 'legendary', value: 5 } }),
  A({ id: 'ACH_081', name: 'Matador de Deuses', rar: 'Mítica', milestone: '20 Chefões Lendários derrotados', phrase: 'Seu nome ecoará pelos salões da história.', xp: 800, area: 'Mental', icon: 'skull', req: { type: 'bosses_defeated_by_rarity', rarity: 'legendary', value: 20 } }),

  // Missões Principais por dificuldade
  A({ id: 'ACH_082', name: 'Passos Pequenos', rar: 'Comum', milestone: '10 missões Muito Fáceis concluídas', phrase: 'Grandes mudanças começam com pequenas ações.', xp: 10, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 1, value: 10 } }),
  A({ id: 'ACH_083', name: 'Hábito Formado', rar: 'Incomum', milestone: '50 missões Muito Fáceis concluídas', phrase: 'Você transformou pequenas ações em rotina.', xp: 30, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 1, value: 50 } }),
  A({ id: 'ACH_084', name: 'Automatizado', rar: 'Rara', milestone: '100 missões Muito Fáceis concluídas', phrase: 'Algumas vitórias já acontecem sem esforço.', xp: 100, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 1, value: 100 } }),
  A({ id: 'ACH_085', name: 'Sem Resistência', rar: 'Comum', milestone: '10 missões Fáceis concluídas', phrase: 'Você venceu a inércia e entrou em movimento.', xp: 10, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 2, value: 10 } }),
  A({ id: 'ACH_086', name: 'Ritmo Constante', rar: 'Incomum', milestone: '50 missões Fáceis concluídas', phrase: 'A consistência começou a aparecer.', xp: 30, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 2, value: 50 } }),
  A({ id: 'ACH_087', name: 'Fluidez Total', rar: 'Rara', milestone: '100 missões Fáceis concluídas', phrase: 'Seus hábitos estão fluindo naturalmente.', xp: 100, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 2, value: 100 } }),
  A({ id: 'ACH_088', name: 'Desafiador', rar: 'Incomum', milestone: '10 missões Médias concluídas', phrase: 'Você escolheu crescer através do desconforto.', xp: 30, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 3, value: 10 } }),
  A({ id: 'ACH_089', name: 'Persistente', rar: 'Rara', milestone: '50 missões Médias concluídas', phrase: 'Sua disciplina já supera suas desculpas.', xp: 100, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 3, value: 50 } }),
  A({ id: 'ACH_090', name: 'Inabalável', rar: 'Épica', milestone: '100 missões Médias concluídas', phrase: 'Você aprendeu a agir mesmo sem vontade.', xp: 200, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 3, value: 100 } }),
  A({ id: 'ACH_091', name: 'Coragem', rar: 'Rara', milestone: '10 missões Difíceis concluídas', phrase: 'Você encarou desafios que a maioria evita.', xp: 100, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 4, value: 10 } }),
  A({ id: 'ACH_092', name: 'Guerreiro', rar: 'Épica', milestone: '50 missões Difíceis concluídas', phrase: 'Você aprendeu a lutar contra sua resistência interna.', xp: 200, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 4, value: 50 } }),
  A({ id: 'ACH_093', name: 'Veterano de Guerra', rar: 'Lendária', milestone: '100 missões Difíceis concluídas', phrase: 'O desconforto se tornou seu aliado.', xp: 500, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 4, value: 100 } }),
  A({ id: 'ACH_094', name: 'Loucura Controlada', rar: 'Rara', milestone: '1 missão Insana concluída', phrase: 'Você fez algo que parecia impossível.', xp: 100, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 5, value: 1 } }),
  A({ id: 'ACH_095', name: 'Além dos Limites', rar: 'Lendária', milestone: '10 missões Insanas concluídas', phrase: 'Seus limites antigos ficaram para trás.', xp: 500, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 5, value: 10 } }),
  A({ id: 'ACH_096', name: 'Impossível Não Existe', rar: 'Mítica', milestone: '50 missões Insanas concluídas', phrase: 'Você se tornou uma exceção entre os homens.', xp: 800, area: 'Mental', icon: 'check_circle', req: { type: 'main_missions_by_difficulty', difficulty: 5, value: 50 } }),

  // Investimentos
  A({ id: 'ACH_097', name: 'Primeiro Aporte', rar: 'Comum', milestone: 'Primeiro aporte realizado', phrase: 'Todo patrimônio começa com uma decisão.', xp: 10, area: 'Financeira', icon: 'coins', req: { type: 'investments', value: 100 } }),
  A({ id: 'ACH_098', name: 'Construtor de Patrimônio', rar: 'Incomum', milestone: 'R$1.000 investidos', phrase: 'Você começou a plantar para o futuro.', xp: 30, area: 'Financeira', icon: 'coins', req: { type: 'investments', value: 1000 } }),
  A({ id: 'ACH_099', name: 'Patrimônio em Crescimento', rar: 'Rara', milestone: 'R$5.000 investidos', phrase: 'Seu patrimônio começou a crescer.', xp: 100, area: 'Financeira', icon: 'coins', req: { type: 'investments', value: 5000 } }),
  A({ id: 'ACH_100', name: 'Estrategista Financeiro', rar: 'Rara', milestone: 'R$10.000 investidos', phrase: 'Você está construindo riqueza conscientemente.', xp: 100, area: 'Financeira', icon: 'coins', req: { type: 'investments', value: 10000 } }),
  A({ id: 'ACH_101', name: 'Investidor', rar: 'Épica', milestone: 'R$25.000 investidos', phrase: 'Sua disciplina financeira já gera resultados.', xp: 200, area: 'Financeira', icon: 'coins', req: { type: 'investments', value: 25000 } }),
  A({ id: 'ACH_102', name: 'Arquiteto do Patrimônio', rar: 'Lendária', milestone: 'R$50.000 investidos', phrase: 'Você está construindo algo duradouro.', xp: 500, area: 'Financeira', icon: 'coins', req: { type: 'investments', value: 50000 } }),
  A({ id: 'ACH_103', name: 'Magnata', rar: 'Mítica', milestone: 'R$100.000 investidos', phrase: 'Seu patrimônio se tornou uma fortaleza.', xp: 800, area: 'Financeira', icon: 'coins', req: { type: 'investments', value: 100000 } }),

  // Nível
  A({ id: 'ACH_104', name: 'Primeiros Passos', rar: 'Comum', milestone: 'Nível 5 alcançado', phrase: 'Sua jornada começou a ganhar forma.', xp: 10, area: 'Profissional', icon: 'award', req: { type: 'level', value: 5 } }),
  A({ id: 'ACH_105', name: 'Guerreiro Experiente', rar: 'Incomum', milestone: 'Nível 10 alcançado', phrase: 'Você já percorreu mais do que a maioria das pessoas.', xp: 30, area: 'Profissional', icon: 'award', req: { type: 'level', value: 10 } }),
  A({ id: 'ACH_106', name: 'Veterano', rar: 'Rara', milestone: 'Nível 25 alcançado', phrase: 'Seus resultados começam a se tornar evidentes.', xp: 100, area: 'Profissional', icon: 'award', req: { type: 'level', value: 25 } }),
  A({ id: 'ACH_107', name: 'Elite', rar: 'Épica', milestone: 'Nível 50 alcançado', phrase: 'Seu comprometimento está acima da média.', xp: 200, area: 'Profissional', icon: 'award', req: { type: 'level', value: 50 } }),
  A({ id: 'ACH_108', name: 'Referência', rar: 'Lendária', milestone: 'Nível 100 alcançado', phrase: 'Outros guerreiros começam a notar sua evolução.', xp: 500, area: 'Profissional', icon: 'award', req: { type: 'level', value: 100 } }),
  A({ id: 'ACH_109', name: 'Reconstrutor Supremo', rar: 'Mítica', milestone: 'Nível 250 alcançado', phrase: 'Você concluiu uma jornada que transformou completamente sua vida.', xp: 800, area: 'Profissional', icon: 'award', req: { type: 'level', value: 250 } }),
];

export const RARITY_ORDER: Rarity[] = ['comum', 'incomum', 'rara', 'epica', 'lendaria', 'mitica'];

/**
 * Marco atingido — texto pré-definido em segunda pessoa (você).
 * Mantido como função para compatibilidade com callers, mas hoje simplesmente
 * retorna o valor já definido na conquista.
 */
export function getMilestoneText(_req: Requirement, milestone?: string): string {
  return milestone ?? 'Conquista desbloqueada';
}

export const RARITY_META: Record<Rarity, {
  label: string;
  stars: number;
  colorHex: string;
  ringClass: string;
  bgClass: string;
  textClass: string;
  glowClass: string;
}> = {
  comum:    { label: 'Comum',    stars: 1, colorHex: '#9ca3af', ringClass: 'ring-slate-400/50',   bgClass: 'bg-slate-500/10',   textClass: 'text-slate-300',  glowClass: 'shadow-[0_0_18px_rgba(148,163,184,0.35)]' },
  incomum:  { label: 'Incomum',  stars: 2, colorHex: '#22c55e', ringClass: 'ring-emerald-400/60', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-300', glowClass: 'shadow-[0_0_20px_rgba(34,197,94,0.45)]' },
  rara:     { label: 'Rara',     stars: 3, colorHex: '#3b82f6', ringClass: 'ring-sky-400/60',     bgClass: 'bg-sky-500/10',     textClass: 'text-sky-300',    glowClass: 'shadow-[0_0_22px_rgba(59,130,246,0.5)]' },
  epica:    { label: 'Épica',    stars: 4, colorHex: '#a855f7', ringClass: 'ring-purple-400/60',  bgClass: 'bg-purple-500/10',  textClass: 'text-purple-300', glowClass: 'shadow-[0_0_24px_rgba(168,85,247,0.55)]' },
  lendaria: { label: 'Lendária', stars: 5, colorHex: '#f59e0b', ringClass: 'ring-amber-400/70',   bgClass: 'bg-amber-500/10',   textClass: 'text-amber-300', glowClass: 'shadow-[0_0_28px_rgba(245,158,11,0.6)]' },
  mitica:   { label: 'Mítica',   stars: 6, colorHex: '#ef4444', ringClass: 'ring-red-400/80',     bgClass: 'bg-red-500/10',     textClass: 'text-red-300',   glowClass: 'shadow-[0_0_32px_rgba(239,68,68,0.7)]' },
};
