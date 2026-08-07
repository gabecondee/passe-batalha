import { Link2, Calendar, Wallet, Phone, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { useAgenda } from '@/hooks/useAgenda';
import { Button } from '@/components/ui/button';

export default function IntegrationsSettings() {
  const {
    googleConnected,
    googleSyncing,
    googleError,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
  } = useAgenda();

  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl mx-auto pb-8">
        <SettingsHeader
          icon={Link2}
          title="Integrações"
          backTo="/settings"
          subtitle="Conecte suas ferramentas favoritas ao Passe de Batalha."
        />

        <div className="space-y-4">
          {/* Google Agenda */}
          <div className="fantasy-card p-4 md:p-5 flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display uppercase tracking-wider text-sm flex items-center gap-2">
                  Google Agenda
                  {googleConnected && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 normal-case font-sans">
                      Conectado
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sincronize seus compromissos e lembretes com sua conta Google.
                </p>
              </div>
              <div>
                {googleConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectGoogleCalendar}
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs"
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={connectGoogleCalendar}
                    disabled={googleSyncing}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
                  >
                    {googleSyncing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      'Conectar'
                    )}
                  </Button>
                )}
              </div>
            </div>
            {googleError && (
              <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                {googleError}
              </p>
            )}
          </div>

          {/* Open Finance - Temporariamente desabilitado */}
          <div className="fantasy-card p-4 md:p-5 flex items-center gap-4 opacity-50">
            <div className="w-12 h-12 rounded-lg bg-muted border border-border/40 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display uppercase tracking-wider text-sm text-muted-foreground">
                Open Finance
              </p>
              <p className="text-xs text-muted-foreground">
                Conecte suas contas bancárias para automação financeira.
              </p>
            </div>
            <span className="text-[10px] md:text-xs px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground font-display uppercase tracking-wider whitespace-nowrap bg-muted/30">
              Em Breve
            </span>
          </div>

          {/* WhatsApp - Temporariamente desabilitado */}
          <div className="fantasy-card p-4 md:p-5 flex items-center gap-4 opacity-50">
            <div className="w-12 h-12 rounded-lg bg-muted border border-border/40 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display uppercase tracking-wider text-sm text-muted-foreground">
                WhatsApp
              </p>
              <p className="text-xs text-muted-foreground">
                Receba lembretes e notificações diretamente no seu WhatsApp.
              </p>
            </div>
            <span className="text-[10px] md:text-xs px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground font-display uppercase tracking-wider whitespace-nowrap bg-muted/30">
              Em Breve
            </span>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
