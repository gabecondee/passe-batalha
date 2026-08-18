import React from 'react';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const InactiveSubscription = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c1830] p-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-xs flex flex-col items-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
        >
          <Lock className="w-10 h-10" />
        </motion.div>
        
        <h1 
          className="text-2xl sm:text-3xl font-bold text-red-500 mb-4 tracking-wider drop-shadow-[0_0_10px_rgba(239,68,68,0.4)] uppercase" 
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Assinatura Inativa
        </h1>
        
        <p className="text-slate-400 text-sm sm:text-base mb-10 max-w-xs leading-relaxed">
          Sua conta não possui uma assinatura ativa no momento. Para continuar acessando o Passe de Batalha, regularize sua assinatura através da Cakto.
        </p>

        <Button 
          onClick={() => window.location.href = 'https://cakto.com.br'} 
          className="w-full h-14 rounded-xl text-sm sm:text-base tracking-[0.1em] font-bold text-white bg-gradient-to-b from-red-500 via-red-600 to-red-700 hover:from-red-400 hover:to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-400/50 justify-center items-center transition-all"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          REGULARIZAR ASSINATURA
        </Button>
      </motion.div>
    </div>
  );
};

export default InactiveSubscription;
