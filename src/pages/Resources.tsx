import { ArrowLeft, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { ResourceBag } from '@/components/inventory/ResourceBag';

export default function Resources() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <PageTransition>
        <div className="min-h-screen p-4 pb-24 max-w-3xl mx-auto">
          {/* Back button (top-left) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventory')}
              className="w-11 h-11 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm flex items-center justify-center hover:bg-card/80 transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-sm text-muted-foreground">Voltar</span>
          </div>

          {/* Title + description (centered) */}
          <div className="mt-8 mb-6 text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <Wallet className="w-8 h-8 text-primary" />
              <h1 className="font-display text-3xl md:text-4xl tracking-[0.2em] uppercase text-primary">
                Finanças
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Gerencie suas finanças — entradas, saídas e investimentos.
            </p>
          </div>

          <ResourceBag />
        </div>
      </PageTransition>
    </MainLayout>
  );
}
