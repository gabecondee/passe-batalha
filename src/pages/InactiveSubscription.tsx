import React from 'react';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

const InactiveSubscription = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c1830] p-4 text-center">
      <div className="w-full max-w-md bg-[#05080f]/90 p-8 rounded-3xl border border-red-500/20 shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <Lock className="w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-bold text-red-500 mb-4 tracking-wider drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          ASSINATURA INATIVA
        </h1>
        
        <p className="text-slate-400 mb-8 leading-relaxed text-sm">
          Sua conta não possui uma assinatura ativa no momento. Para continuar acessando o Passe de Batalha, 
          regularize sua assinatura através da Cakto ou entre em contato com o suporte.
        </p>

        <Button 
          onClick={() => window.location.href = 'https://cakto.com.br'} 
          className="w-full h-14 rounded-xl text-sm sm:text-base tracking-[0.1em] font-bold text-white bg-gradient-to-b from-red-500 via-red-600 to-red-700 hover:from-red-400 hover:to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-400/50 justify-center items-center transition-all"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          REGULARIZAR ASSINATURA
        </Button>
      </div>
    </div>
  );
};

export default InactiveSubscription;
