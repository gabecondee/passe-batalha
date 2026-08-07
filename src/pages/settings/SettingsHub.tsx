import { Palette, Link2, HelpCircle, Users, ScrollText, DoorOpen, Star, Pencil, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { useGame } from '@/contexts/GameContext';

const CLASS_LABEL: Record<string, string> = {
  warrior: 'GUERREIRO',
  guardian: 'GUARDIÃO',
  rogue: 'LADINO',
  mage: 'MAGO',
  monk: 'MONGE',
  paladin: 'PALADINO',
};

export default function SettingsHub() {
  const { user } = useGame();
  const navigate = useNavigate();

  const savedClass = typeof window !== 'undefined' ? localStorage.getItem('user_class') : null;
  const classLabel = savedClass ? (CLASS_LABEL[savedClass] || savedClass.toUpperCase()) : 'GUERREIRO';

  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl mx-auto pb-8">
        <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-3">
            <Settings
              className="w-9 h-9 md:w-10 md:h-10"
              style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.55))' }}
            />
            <h1
              className="font-display text-2xl md:text-3xl tracking-[0.18em] font-bold"
              style={{
                background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              CONFIGURAÇÕES
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2 px-6">
            Personalize sua jornada e gerencie sua conta.
          </p>
        </div>


        {/* Profile Card — layout matches image 6 */}
        <div className="fantasy-card p-5 md:p-6">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="relative shrink-0">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border-2 border-primary/70 shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <h2 className="font-display text-xl md:text-2xl font-bold truncate">
                {user.name || 'Guerreiro'}
              </h2>
              <p className="font-display uppercase tracking-widest text-primary text-sm">
                {classLabel}
              </p>
              <div className="inline-block px-3 py-0.5 rounded border border-primary/60 text-primary text-xs font-display tracking-wider">
                NÍVEL {user.level}
              </div>
              <div className="pt-1">
                <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">
                  XP Total
                </p>
                <p className="flex items-center gap-1.5 text-primary font-display text-lg md:text-xl">
                  <Star className="w-4 h-4 fill-primary" />
                  {user.totalXP.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/settings/profile')}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-primary/60 text-primary text-sm font-display tracking-wider hover:bg-primary/10 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            EDITAR PERFIL
          </button>
        </div>

        {/* Menu options */}
        <div className="space-y-3">
          <SettingsCard icon={Palette} title="Aparência" description="Escolha o tema que mais combina com a sua jornada." to="/settings/appearance" />
          <SettingsCard icon={Link2} title="Integrações" description="Conecte suas ferramentas favoritas ao Passe de Batalha." to="/settings/integrations" />
          <SettingsCard icon={HelpCircle} title="Suporte" description="Reportar bugs, sugestões e dúvidas." onClick={() => window.open('https://wa.me/43999817625', '_blank')} />
          <SettingsCard icon={Users} title="Comunidade" description="Interaja com os outros membros da guilda." onClick={() => window.open('https://passedebatalha.circle.so/feed', '_blank')} />
          <SettingsCard icon={ScrollText} title="Documentos Legais" description="Termos de uso e política de privacidade da plataforma." to="/settings/legal" />
          <SettingsCard icon={DoorOpen} title="Conta" description="Gerencie sua conta e segurança" to="/settings/account" danger />
        </div>
      </div>
    </MainLayout>
  );
}
