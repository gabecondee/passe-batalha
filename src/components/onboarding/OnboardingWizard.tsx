import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, Upload, RefreshCw, Check, Loader2, Shield, Camera, Plus, Dumbbell, Brain, Sparkle, Briefcase, DollarSign, ArrowLeft, Mail, Lock, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { authService } from '@/services/auth';
import { StepIndicator } from './StepIndicator';
import hakimImage from '@/assets/hakim-mascot.png';
import hakimV2 from '@/assets/hakim-mascot-v2.jpeg';
import hakimV3 from '@/assets/hakim-mascot-v3.jpeg';
import hakimOwlRunesAsset from '@/assets/hakim-owl-runes.png.asset.json';
import hakim2 from '@/assets/hakim2.png';

import logoSrc from '@/assets/logo.png';
import hakimOwlMentor from '@/assets/hakim-owl-mentor.png';
import hakimOwlSkills from '@/assets/hakim-owl-skills.png';
import hakimOwlSummary from '@/assets/hakim-owl-summary.png';
import hakimSummaryOwlAsset from '@/assets/hakim-summary-owl.png.asset.json';
import { SkillsRadar } from '@/components/dashboard/SkillsRadar';
import { Star } from 'lucide-react';
import passeBatalhaLogo from '@/assets/passe-batalha-logo.png';
import curandeiroImg from '@/assets/class-curandeiro.png';
import warriorImg from '@/assets/class-warrior-v2.jpeg';
import mageImg from '@/assets/class-mage-v2.jpeg';
import rogueImg from '@/assets/class-rogue-v2.jpeg';
import paladinImg from '@/assets/class-paladin-v2.jpeg';
import useEmblaCarousel from 'embla-carousel-react';
import { useEffect } from 'react';

const TOTAL_STEPS = 6;
const SERIF = "'Cormorant Garamond', 'Cinzel', serif";




interface OnboardingWizardProps {
  onComplete: (data: { name: string; avatar: string | null; initialSkills?: Record<string, number>; class?: string }) => void;
}

type Screen = 'start' | 'meet' | 'name' | 'class' | 'character' | 'skills' | 'summary';

type ClassKey = 'warrior' | 'mage' | 'healer' | 'rogue' | 'paladin';

const CLASSES: { key: ClassKey; name: string; traits: string[]; img: string; glow: string }[] = [
  { key: 'healer', name: 'Curandeiro', traits: ['Lealdade', 'Empatia', 'Responsabilidade'], img: curandeiroImg, glow: 'shadow-[0_0_45px_rgba(34,197,94,0.55)]' },
  { key: 'mage', name: 'Mago', traits: ['Criatividade', 'Conhecimento', 'Visão'], img: mageImg, glow: 'shadow-[0_0_45px_rgba(139,92,246,0.55)]' },
  { key: 'warrior', name: 'Guerreiro', traits: ['Disciplina', 'Coragem', 'Esforço'], img: warriorImg, glow: 'shadow-[0_0_45px_rgba(239,68,68,0.6)]' },
  { key: 'rogue', name: 'Ladino', traits: ['Astúcia', 'Liberdade', 'Adaptabilidade'], img: rogueImg, glow: 'shadow-[0_0_45px_rgba(168,85,247,0.55)]' },
  { key: 'paladin', name: 'Paladino', traits: ['Honra', 'Fé', 'Propósito'], img: paladinImg, glow: 'shadow-[0_0_45px_rgba(234,179,8,0.65)]' },
];

const SKILL_CARDS = [
  { key: 'physical', title: 'Área Física', desc: 'Essa área representa sua força, resistência e saúde de maneira geral.' },
  { key: 'mental', title: 'Área Mental', desc: 'Essa área representa sua inteligência, disciplina e sociabilidade.' },
  { key: 'spiritual', title: 'Área Espiritual', desc: 'Essa área representa seu autocontrole, gratidão e conexão.' },
  { key: 'professional', title: 'Área Profissional', desc: 'Essa área representa sua técnica em algum assunto específico, liderança e estratégia.' },
  { key: 'financial', title: 'Área Financeira', desc: 'Essa área representa suas dívidas, investimentos e planejamento.' },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('start');
  const [authView, setAuthView] = useState<'intro' | 'login'>('intro');
  const [loginMode, setLoginMode] = useState<'firstAccess' | 'returning'>('returning');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [chosenClass, setChosenClass] = useState<ClassKey | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [skillValues, setSkillValues] = useState<Record<string, number>>({
    physical: 50, mental: 50, spiritual: 50, professional: 50, financial: 50,
  });
  const [skillIdx, setSkillIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const variants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setPhotoBase64(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const generateAvatar = async () => {
    if (!photoBase64 || !chosenClass) return;
    setGenerating(true);
    setGeneratedAvatar(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { photoBase64, className: chosenClass },
      });
      
      if (error) {
        console.error("Function Error:", error);
        throw error;
      }
      
      if (data?.avatarUrl) {
        setGeneratedAvatar(data.avatarUrl);
      } else {
        throw new Error(data?.error || 'Falha inesperada ao gerar avatar');
      }

    } catch (e: any) {
      toast.error('Erro ao gerar avatar: ' + (e?.message || e));
    } finally {
      setGenerating(false);
    }
  };

  const finishOnboarding = async () => {
    // localStorage.setItem('user_class', chosenClass || '');
    // localStorage.setItem('initial_skills', JSON.stringify(skillValues));

    const { data: authData } = await authService.getUser();
    
    if (authData?.user) {
      // Atualizar ou Inserir o profile com nome, classe, avatar e onboarding_completed
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        name: name.trim(),
        class: chosenClass,
        avatar_url: generatedAvatar || '/placeholder.svg',
        onboarding_completed: true
      });

      if (profileError) {
        toast.error('Aviso: Não foi possível atualizar o perfil.');
        console.error('Erro Supabase (Profile Update):', profileError);
      }

      // Inserir os atributos iniciais na tabela user_attributes
      const { error: attrError } = await supabase.from('user_attributes').upsert({
        user_id: authData.user.id,
        initial_xp: skillValues
      }, { onConflict: 'user_id' });

      if (attrError) {
        console.error('Erro Supabase (Attributes Upsert):', attrError);
      }
    }

    onComplete({ name: name.trim(), avatar: generatedAvatar, initialSkills: skillValues, class: chosenClass as string });
  };

  /** Traduz erros do Supabase para mensagens amigáveis em português */
  const translateAuthError = (message: string): string => {
    const msg = message.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid email or password'))
      return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
    if (msg.includes('email not confirmed'))
      return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.';
    if (msg.includes('user already registered') || msg.includes('already been registered'))
      return 'Este e-mail já possui uma conta. Faça login ou recupere sua senha.';
    if (msg.includes('password should be at least'))
      return 'A senha deve ter pelo menos 6 caracteres.';
    if (msg.includes('unable to validate email address'))
      return 'E-mail inválido. Verifique e tente novamente.';
    if (msg.includes('too many requests') || msg.includes('rate limit'))
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    if (msg.includes('network') || msg.includes('fetch'))
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    return 'Ocorreu um erro inesperado. Tente novamente.';
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!loginEmail || !loginPassword) {
      setAuthError('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setAuthLoading(true);
    try {
      if (loginMode === 'firstAccess') {
        const { error } = await authService.signUp({ email: loginEmail, password: loginPassword });
        
        if (error) {
          const friendly = translateAuthError(error.message);
          setAuthError(friendly);
          toast.error(friendly);
          return;
        }
        
        toast.success('Conta criada! Vamos construir seu personagem.');
        setTimeout(() => {
          setScreen('meet');
        }, 500);
        
      } else {
        const { error } = await authService.signIn({ email: loginEmail, password: loginPassword });
        
        if (error) {
          const friendly = translateAuthError(error.message);
          setAuthError(friendly);
          toast.error(friendly);
          return;
        }
        
        toast.success('Bem-vindo de volta, guerreiro!');
        
        // O Index.tsx vai escutar a mudança do usuário pelo AuthContext e verificar 
        // no banco se o onboarding já foi feito. Se sim, ele unmounta este componente
        // e renderiza o Dashboard.
        
        // Se não houver redirecionamento, assumimos que o onboarding está pendente
        // e vamos para a tela de introdução.
        setTimeout(() => {
          setScreen('meet');
        }, 1000);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleBack = () => {
    switch (screen) {
      case 'meet': setScreen('start'); break;
      case 'name': setScreen('meet'); break;
      case 'class': setScreen('name'); break;
      case 'character': setScreen('class'); break;
      case 'skills':
        if (skillIdx > 0) {
          setSkillIdx(prev => prev - 1);
        } else {
          setScreen('character');
        }
        break;
      case 'summary': setScreen('skills'); setSkillIdx(4); break;
      default: break;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, #0c1830 0%, #060b1a 55%, #02030a 100%)',
      }}
    >
      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[140px]" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[80px] h-[80px] rounded-full bg-amber-400/10 blur-[60px]" />
      </div>

      <AnimatePresence mode="wait">
        {screen === 'start' && (
          <motion.div key="start" variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className="relative w-full max-w-md px-6 py-10 flex flex-col items-center text-center min-h-screen justify-center overflow-hidden">
            <div className="relative w-full flex-1 flex items-center justify-center">
              <AnimatePresence mode="wait" initial={false}>
                {authView === 'intro' && (
                  <motion.div
                    key="intro"
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '-100%', opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    className="w-full flex flex-col items-center text-center"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="mb-4"
                    >
                      <img
                        src={logoSrc}
                        alt="Passe de Batalha"
                        className="w-[120px] h-[120px] object-contain drop-shadow-[0_0_25px_rgba(245,158,11,0.7)] rounded-full"
                      />
                    </motion.div>
                    <div
                      className="text-amber-500 text-[13px] tracking-[0.4em] uppercase mb-2"
                      style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
                    >
                      Passe de Batalha
                    </div>
                    <div className="flex items-center gap-2 mb-14">
                      <span className="block w-12 h-px bg-amber-500/50" />
                      <svg width="10" height="10" viewBox="0 0 10 10" className="text-amber-500"><path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" /></svg>
                      <span className="block w-12 h-px bg-amber-500/50" />
                    </div>

                    <h1 className="leading-[1.05] mb-5 font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      <span className="block text-amber-500 text-4xl sm:text-5xl drop-shadow-[0_0_18px_rgba(245,158,11,0.45)]">SUA JORNADA</span>
                      <span className="block text-white text-3xl sm:text-4xl mt-1">COMEÇA AGORA!</span>
                    </h1>
                    <p className="text-slate-400 text-sm sm:text-base mb-12 max-w-xs leading-relaxed">
                      A vida é como um jogo,<br/>apenas jogue...
                    </p>

                    <div className="flex flex-col gap-5 w-full max-w-xs items-center">
                      <Button
                        onClick={() => { setLoginMode('firstAccess'); setAuthView('login'); }}
                        className="w-full h-14 rounded-xl text-base tracking-[0.18em] font-bold text-[#1a1208] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.55)] border border-amber-300/60 justify-center items-center gap-2"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        PRIMEIRO ACESSO
                      </Button>

                      <button
                        type="button"
                        onClick={() => { setLoginMode('returning'); setAuthView('login'); }}
                        className="flex items-center gap-2 text-blue-400/90 hover:text-blue-300 text-xs tracking-[0.22em] uppercase font-semibold transition"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        <Shield className="w-4 h-4" />
                        Já tenho uma conta
                      </button>
                    </div>
                  </motion.div>
                )}

                {authView === 'login' && (
                  <motion.div
                    key="login"
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    className="w-full flex flex-col items-center text-center"
                  >
                    <button
                      type="button"
                      onClick={() => setAuthView('intro')}
                      aria-label="Voltar"
                      className="absolute left-4 top-4 flex items-center justify-center w-10 h-10 rounded-full text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="mb-6"
                    >
                      <img
                        src={logoSrc}
                        alt="Passe de Batalha"
                        className="w-[90px] h-[90px] object-contain drop-shadow-[0_0_25px_rgba(245,158,11,0.7)] rounded-full"
                      />
                    </motion.div>

                    <h1
                      className="text-white text-4xl sm:text-5xl font-bold mb-3 uppercase"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      {loginMode === 'firstAccess' ? 'CRIAR CONTA' : 'ENTRAR'}
                    </h1>
                    <p className="text-slate-400 text-sm sm:text-base mb-10 max-w-xs leading-relaxed">
                      {loginMode === 'firstAccess' ? (
                        <>
                          Utilize o e-mail informado na compra
                          <br />
                          para acessar sua conta.
                        </>
                      ) : (
                        'Bem-vindo de volta. Continue sua jornada.'
                      )}
                    </p>

                    <form
                      onSubmit={handleAuth}
                      className="flex flex-col gap-4 w-full max-w-xs items-center"
                    >
                      <div className="relative w-full">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                          <Mail className="w-5 h-5" />
                        </span>
                        <Input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => { setLoginEmail(e.target.value); setAuthError(null); }}
                          placeholder="E-mail"
                          autoComplete="email"
                          className="pl-12 h-14 rounded-xl bg-transparent border border-amber-500/50 focus-visible:border-amber-400 focus-visible:ring-0 text-white placeholder:text-slate-400/70 text-base"
                        />
                      </div>

                      <div className="relative w-full">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                          <Lock className="w-5 h-5" />
                        </span>
                        <Input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => { setLoginPassword(e.target.value); setAuthError(null); }}
                          placeholder="Senha"
                          autoComplete="current-password"
                          className={`pl-12 h-14 rounded-xl bg-transparent border focus-visible:ring-0 text-white placeholder:text-slate-400/70 text-base transition-colors ${
                            authError
                              ? 'border-red-500/70 focus-visible:border-red-400'
                              : 'border-amber-500/50 focus-visible:border-amber-400'
                          }`}
                        />
                      </div>

                      <AnimatePresence>
                        {authError && (
                          <motion.div
                            key="auth-error"
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.97 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="w-full flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm leading-snug"
                          >
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                            <span>{authError}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <Button
                        type="submit"
                        disabled={authLoading}
                        className="w-full h-14 rounded-xl text-base tracking-[0.18em] font-bold text-[#1a1208] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.55)] border border-amber-300/60 justify-center items-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        {authLoading ? (
                          <><Loader2 className="w-5 h-5 animate-spin" />{loginMode === 'firstAccess' ? 'Criando conta...' : 'Entrando...'}</>
                        ) : (
                          loginMode === 'firstAccess' ? 'CRIAR CONTA' : 'ENTRAR'
                        )}
                      </Button>

                      {loginMode === 'firstAccess' ? (
                        <div className="mt-4 text-center">
                          <span className="text-slate-400 text-sm">Já tem conta? </span>
                          <button
                            type="button"
                            onClick={() => { setLoginMode('returning'); setAuthError(null); }}
                            className="text-amber-400 hover:text-amber-300 font-semibold transition"
                          >
                            Faça Login
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-col items-center gap-4">
                          <button
                            type="button"
                            onClick={() => navigate('/forgot-password')}
                            className="text-slate-400 hover:text-slate-300 text-xs tracking-wider transition relative z-50 cursor-pointer"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                          >
                            Esqueci minha senha
                          </button>
                          <div className="text-center">
                            <span className="text-slate-400 text-sm">Ainda não tem conta? </span>
                            <button
                              type="button"
                              onClick={() => { setLoginMode('firstAccess'); setAuthError(null); }}
                              className="text-amber-400 hover:text-amber-300 font-semibold transition"
                            >
                              Criar conta
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="w-full px-6 flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (deferredPrompt) {
                              handleInstallClick();
                            } else {
                              const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
                              if (isIos) {
                                toast('Para instalar no iPhone: toque no ícone de Compartilhar ↗ no Safari e selecione "Adicionar à Tela de Início".', { duration: 6000 });
                              } else {
                                toast('App já instalado ou navegador não suporta PWA no momento.');
                              }
                            }
                          }}
                          className="flex items-center gap-2 text-slate-500 hover:text-amber-400 text-xs font-semibold tracking-wider transition-colors uppercase"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Instalar App
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {screen === 'meet' && (
          <motion.div key="meet" variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className="relative w-full max-w-md px-6 py-6 flex flex-col items-center text-center min-h-screen gap-1">
            <StepIndicator current={1} total={TOTAL_STEPS} />

            <div className="flex flex-col items-center gap-1">
              <h2
                className="text-3xl sm:text-[34px] text-white leading-tight"
                style={{ fontFamily: SERIF, fontWeight: 500, textTransform: 'none', letterSpacing: '0.01em' }}
              >
                Olá, meu nome é Hakim!
              </h2>
              <p className="text-slate-300/90 text-[15px] leading-snug max-w-xs">
                A partir de hoje, serei seu novo guia<br/>nessa fase de reconstrução.
              </p>
            </div>

            <div className="flex-none w-full flex items-start justify-center pt-0">
              <img
                src={hakim2}
                alt="Hakim, o mentor coruja"
                className="w-full max-w-[460px] h-auto max-h-[52vh] object-contain drop-shadow-[0_0_40px_rgba(59,130,246,0.35)]"
              />
            </div>

            <Button
              onClick={() => setScreen('name')}
              className="w-full max-w-sm h-14 rounded-xl text-base tracking-[0.18em] font-bold text-[#1a1208] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.55)] border border-amber-300/60 justify-center items-center gap-2"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              PRÓXIMO <ChevronRight className="w-5 h-5" />
            </Button>
          </motion.div>
        )}

        {screen === 'name' && (
          <motion.div key="name" variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className="relative w-full max-w-md px-6 py-6 flex flex-col items-center text-center min-h-screen gap-1">
            <StepIndicator current={2} total={TOTAL_STEPS} />

            <div className="flex flex-col items-center gap-1">
              <h2
                className="text-3xl sm:text-[34px] text-white leading-tight"
                style={{ fontFamily: SERIF, fontWeight: 500, textTransform: 'none', letterSpacing: '0.01em' }}
              >
                Vamos começar<br/>pelo básico.
              </h2>
              <p className="text-slate-300/90 text-[15px]">
                Qual é o seu nome?
              </p>
            </div>

            <div className="flex-none w-full flex items-start justify-center pt-0">
              <img
                src={hakim2}
                alt="Hakim, o mentor coruja"
                className="w-full max-w-[460px] h-auto max-h-[52vh] object-contain drop-shadow-[0_0_40px_rgba(59,130,246,0.35)]"
              />
            </div>

            <div className="w-full max-w-sm flex flex-col gap-3 items-center mt-3">
              <div className="relative w-full">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''))}
                  placeholder="Seu nome"
                  maxLength={24}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && name.trim().length >= 2) setScreen('class'); }}
                  className="pl-12 h-16 py-3 text-lg rounded-xl bg-transparent border border-amber-500/50 focus-visible:border-amber-400 focus-visible:ring-0 text-white placeholder:text-slate-400/70"
                />
              </div>
              <Button
                onClick={() => {
                  if (name.trim().length < 2) { toast.error('Digite seu nome para continuar.'); return; }
                  setScreen('class');
                }}
                disabled={name.trim().length < 2}
                className="w-full h-16 rounded-xl text-base tracking-[0.2em] font-bold text-[#1a1208] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] border border-amber-300/60 disabled:opacity-50 disabled:shadow-none"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                CONTINUAR <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <button
                type="button"
                onClick={handleBack}
                className="mt-3 text-xs tracking-widest font-semibold text-slate-500 hover:text-white transition-colors uppercase"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Voltar
              </button>
            </div>
          </motion.div>
        )}



        {screen === 'class' && (
          <motion.div key="class" variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="relative w-full max-w-md px-0 pb-10 flex flex-col items-center min-h-screen overflow-x-hidden">

            <div className="relative z-10 w-full px-6">
              <StepIndicator current={3} total={TOTAL_STEPS} />
            </div>

            {/* Owl + explanatory text row */}
            <div className="relative z-10 w-full px-6 mt-2 grid grid-cols-[42%_1fr] gap-3 items-center">
              <div className="relative">
                <img
                  src={hakim2}
                  alt="Hakim, o mentor coruja"
                  aria-hidden
                  className="w-full h-auto object-contain object-top pointer-events-none select-none"
                  style={{
                    WebkitMaskImage:
                      'linear-gradient(to bottom, #000 55%, rgba(0,0,0,0.6) 78%, transparent 100%)',
                    maskImage:
                      'linear-gradient(to bottom, #000 55%, rgba(0,0,0,0.6) 78%, transparent 100%)',
                  }}
                />
              </div>
              <p
                className="text-slate-200/95 text-[14px] leading-[1.55]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Maravilha {name.trim() || 'herói'}! Toda história começa com uma natureza dominante, essa natureza será sua classe. Ela representa a forma como você tende a enfrentar desafios, tomar decisões e buscar evolução.
              </p>
            </div>

            <div className="relative z-10 w-full px-6">
              {/* divider */}
              <div className="mt-8 flex items-center justify-center gap-2">
                <span className="block w-20 h-px bg-amber-500/40" />
                <svg width="10" height="8" viewBox="0 0 10 8" className="text-amber-500/80"><path d="M1 1 L5 7 L9 1 Z" fill="currentColor" /></svg>
                <span className="block w-20 h-px bg-amber-500/40" />
              </div>

              <h2
                className="mt-5 mb-6 text-center text-white text-4xl sm:text-[42px] leading-tight"
                style={{ fontFamily: SERIF, fontWeight: 500, textTransform: 'none' }}
              >
                Escolha sua classe:
              </h2>
            </div>

            <ClassCarousel
              chosenClass={chosenClass}
              onSelect={setChosenClass}
            />

            <div className="w-full px-6 mt-10 flex flex-col items-center gap-2">
              <Button
                onClick={() => {
                  if (!chosenClass) { toast.error('Selecione uma classe para continuar.'); return; }
                  setScreen('character');
                }}
                disabled={!chosenClass}
                className="w-full max-w-sm h-14 rounded-xl text-base tracking-[0.2em] font-bold text-[#1a1208] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.55)] border border-amber-300/60 disabled:opacity-40 disabled:shadow-none"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                CONTINUAR <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <button
                type="button"
                onClick={handleBack}
                className="mt-3 text-xs tracking-widest font-semibold text-slate-500 hover:text-white transition-colors uppercase"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Voltar
              </button>
            </div>
          </motion.div>
        )}




        {screen === 'character' && (
          <motion.div key="character" variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="relative w-full max-w-md px-0 pb-40 flex flex-col items-stretch min-h-screen overflow-x-hidden">

            {/* Hakim owl mentor – right side */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-2 -right-4 w-[55%] max-w-[260px] aspect-[3/4] z-0"
              style={{
                backgroundImage: `url(${hakim2})`,
                backgroundSize: 'cover',
                backgroundPosition: 'left center',
                WebkitMaskImage:
                  'radial-gradient(ellipse 80% 75% at 70% 45%, #000 35%, rgba(0,0,0,0.55) 65%, transparent 88%)',
                maskImage:
                  'radial-gradient(ellipse 80% 75% at 70% 45%, #000 35%, rgba(0,0,0,0.55) 65%, transparent 88%)',
                opacity: 0.85,
              }}
            />

            <div className="relative z-10 w-full px-6">
              <StepIndicator current={4} total={TOTAL_STEPS} />

              {/* Intro text / wow text – wow only shown when avatar is ready */}
              <div className="pr-[48%] mt-4 relative z-10">
                {!generatedAvatar ? (
                  <p
                    className="text-slate-200/95 text-[14px] leading-[1.6]"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    É isso aí, estamos entrando no jogo! Com sua classe definida, é hora de criarmos seu personagem. Selecione uma foto real e com boa iluminação.
                  </p>
                ) : (
                  <>
                    <h2
                      className="text-white text-[26px] leading-[1.15]"
                      style={{ fontFamily: SERIF, fontWeight: 500 }}
                    >
                      Uau... Seu personagem ficou insano!
                    </h2>
                    <p className="mt-3 text-slate-300/90 text-[15px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      O que achou?
                    </p>
                  </>
                )}
              </div>

              {/* divider */}
              <div className="mt-6 flex items-center gap-2">
                <span className="block flex-1 h-px bg-amber-500/40" />
                <svg width="10" height="8" viewBox="0 0 10 8" className="text-amber-500/80"><path d="M1 1 L5 7 L9 1 Z" fill="currentColor" /></svg>
                <span className="block flex-1 h-px bg-amber-500/40" />
              </div>

              {/* State A title (smaller, 2 lines, only first letter uppercase) */}
              {!generatedAvatar && (
                <h2
                  className="mt-6 text-white text-[26px] sm:text-[28px] leading-[1.15]"
                  style={{ fontFamily: SERIF, fontWeight: 500 }}
                >
                  Vamos dar vida a<br />sua nova versão:
                </h2>
              )}
            </div>

            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (!f.type.startsWith('image/')) { toast.error('Arquivo inválido. Envie uma imagem.'); return; }
                if (f.size > 8 * 1024 * 1024) { toast.error('Imagem muito grande (máx 8MB).'); return; }
                handleFile(f);
              }} />

            {/* ====== STATE A: upload card ====== */}
            {!generatedAvatar && (
              <div className="relative z-10 w-full px-6 mt-8">
                <div className="relative w-full rounded-3xl border border-amber-500/50 bg-black/40 backdrop-blur-sm p-8 shadow-[0_0_40px_rgba(245,158,11,0.18)] flex flex-col items-center">
                  {/* Camera circle */}
                  <div className="relative w-44 h-44 flex items-center justify-center mb-6">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="47" fill="none" stroke="rgb(245 158 11 / 0.6)" strokeWidth="0.8" strokeDasharray="3 3" />
                    </svg>
                    {generating ? (
                      <Loader2 className="w-14 h-14 text-amber-400 animate-spin" />
                    ) : photoBase64 ? (
                      <img src={photoBase64} alt="Sua foto" className="w-36 h-36 rounded-full object-cover border-2 border-amber-500/60" />
                    ) : (
                      <div className="relative">
                        <Camera className="w-16 h-16 text-amber-400" strokeWidth={1.5} />
                        <div className="absolute -bottom-1 -right-2 w-6 h-6 rounded-full border-2 border-amber-400 bg-transparent flex items-center justify-center">
                          <Plus className="w-3.5 h-3.5 text-amber-400" strokeWidth={2.5} />
                        </div>
                      </div>
                    )}
                  </div>

                  {generating ? (
                    <GeneratingPhrase />
                  ) : (
                    <>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-2 px-7 h-12 rounded-full border border-amber-500/70 text-amber-400 hover:bg-amber-500/10 transition tracking-[0.18em] text-sm font-semibold"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        <Upload className="w-4 h-4" />
                        {photoBase64 ? 'TROCAR FOTO' : 'ENVIAR FOTO'}
                      </button>

                      <p className="mt-5 text-center text-[12px] text-slate-400/90 leading-relaxed max-w-[240px]">
                        Sua foto será usada apenas<br />para gerar seu avatar.
                      </p>
                    </>
                  )}
                </div>

                {/* Action buttons below the upload box */}
                <div className="mt-8 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setScreen('skills')}
                    className="text-slate-300/80 hover:text-white text-sm transition"
                    style={{ fontFamily: SERIF }}
                  >
                    Pular
                  </button>
                  <Button
                    onClick={() => {
                      if (!photoBase64) { toast.error('Envie uma foto para continuar.'); return; }
                      generateAvatar();
                    }}
                    disabled={generating}
                    className="w-full max-w-sm h-14 rounded-xl text-[15px] tracking-[0.18em] font-bold text-[#1a1208] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.55)] border border-amber-300/60 disabled:opacity-50 disabled:shadow-none"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> FORJANDO...</> : <>CRIAR MEU PERSONAGEM <ChevronRight className="w-5 h-5 ml-2" /></>}
                  </Button>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-xs tracking-widest font-semibold text-slate-500 hover:text-white transition-colors uppercase"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            )}

            {/* ====== STATE B: avatar preview (no border, only AI-generated image in the box) ====== */}
            {generatedAvatar && (
              <div className="relative z-10 w-full px-6 mt-8">
                <div className="relative w-full aspect-square rounded-3xl overflow-hidden border border-amber-500/50 bg-black/40 shadow-[0_0_40px_rgba(245,158,11,0.18)]">
                  <img
                    src={generatedAvatar}
                    alt="Seu personagem"
                    className="w-full h-full object-cover"
                  />
                </div>

                <p className="mt-5 text-center text-[13px] text-slate-300/90" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Esta é a sua versão de batalha para iniciar a jornada.
                </p>

                {/* Action buttons below the avatar preview */}
                <div className="mt-8 flex flex-col items-center gap-3">
                  <Button
                    onClick={() => setScreen('skills')}
                    className="w-full max-w-sm h-14 rounded-xl text-[15px] tracking-[0.18em] font-bold text-[#1a1208] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.55)] border border-amber-300/60"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    CONFIRMAR PERSONAGEM <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                  <div className="w-full max-w-sm grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={generateAvatar}
                      disabled={generating}
                      className="h-11 rounded-xl bg-transparent border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 tracking-[0.08em] text-[10px] font-semibold"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      <RefreshCw className="w-4 h-4 mr-1.5" /> GERAR NOVAMENTE
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setGeneratedAvatar(null); fileRef.current?.click(); }}
                      className="h-11 rounded-xl bg-transparent border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 tracking-[0.12em] text-xs font-semibold"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      <Upload className="w-4 h-4 mr-2" /> OUTRA FOTO
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {screen === 'skills' && (
          <motion.div key="skills" variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="relative w-full max-w-md px-0 pb-32 flex flex-col items-stretch min-h-screen overflow-x-hidden">

            {/* Hakim owl - left side, feathered */}
            <div
              aria-hidden
              className="pointer-events-none absolute top-20 -left-4 w-[50%] max-w-[250px] aspect-[3/4] z-0"
              style={{
                backgroundImage: `url(${hakim2})`,
                backgroundSize: 'cover',
                backgroundPosition: 'right center',
                WebkitMaskImage:
                  'radial-gradient(ellipse 80% 75% at 30% 45%, #000 35%, rgba(0,0,0,0.55) 65%, transparent 88%)',
                maskImage:
                  'radial-gradient(ellipse 80% 75% at 30% 45%, #000 35%, rgba(0,0,0,0.55) 65%, transparent 88%)',
                opacity: 0.95,
              }}
            />

            <div className="relative z-10 w-full px-6">
              <StepIndicator current={5} total={TOTAL_STEPS} />

              {/* Intro text - right of the owl */}
              <div className="pl-[44%] pr-1 mt-6">
                <p
                  className="text-slate-200/95 text-[14px] leading-[1.55]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Boaaa {name.trim() || 'herói'}, agora só falta definir suas skills iniciais. Elas serão seu ponto de partida para definição das missões principais.
                </p>
              </div>

              {/* divider */}
              <div className="mt-8 flex items-center justify-center gap-2">
                <span className="block w-20 h-px bg-amber-500/40" />
                <svg width="10" height="8" viewBox="0 0 10 8" className="text-amber-500/80"><path d="M1 1 L5 7 L9 1 Z" fill="currentColor" /></svg>
                <span className="block w-20 h-px bg-amber-500/40" />
              </div>

              <h2
                className="mt-5 mb-6 text-white text-4xl sm:text-[42px] leading-[1.05]"
                style={{ fontFamily: SERIF, fontWeight: 500, textTransform: 'none' }}
              >
                Classifique<br/>Suas Skills:
              </h2>

              {/* Question card */}
              <AnimatePresence mode="wait">
                <motion.div key={skillIdx}
                  initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="relative rounded-2xl border border-amber-500/50 bg-black/40 backdrop-blur-sm p-6 shadow-[0_0_30px_rgba(245,158,11,0.18)]">
                  <div className="text-[13px] tracking-widest text-amber-400 mb-3" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    {skillIdx + 1} / {SKILL_CARDS.length}
                  </div>
                  <h3 className="text-white text-[18px] sm:text-[19px] leading-[1.2] mb-2 uppercase" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.02em' }}>
                    De 0 a 100, o quão boa está sua {SKILL_CARDS[skillIdx].title.toLowerCase()}?
                  </h3>
                  <p className="text-[13px] text-slate-400 leading-relaxed mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {SKILL_CARDS[skillIdx].desc}
                  </p>

                  <div className="text-center mb-2">
                    <span className="text-amber-400 text-6xl drop-shadow-[0_0_18px_rgba(245,158,11,0.5)]" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
                      {skillValues[SKILL_CARDS[skillIdx].key]}
                    </span>
                  </div>

                  <Slider value={[skillValues[SKILL_CARDS[skillIdx].key]]} min={0} max={100} step={1}
                    onValueChange={([v]) => setSkillValues((p) => ({ ...p, [SKILL_CARDS[skillIdx].key]: v }))} />

                  <div className="flex justify-between text-[11px] text-slate-400 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <span>0</span><span>100</span>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Pagination dots */}
              <div className="mt-6 flex justify-center gap-2">
                {SKILL_CARDS.map((_, i) => (
                  <button key={i} onClick={() => setSkillIdx(i)}
                    className={`h-2 rounded-full transition-all ${i === skillIdx ? 'w-6 bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.7)]' : 'w-2 bg-amber-500/30'}`} />
                ))}
              </div>
            </div>

            <div className="fixed bottom-6 left-0 right-0 px-6 flex flex-col items-center gap-2 z-20">
              <Button
                onClick={() => {
                  if (skillIdx < SKILL_CARDS.length - 1) setSkillIdx((i) => i + 1);
                  else setScreen('summary');
                }}
                className="w-full max-w-sm h-14 rounded-xl text-base tracking-[0.2em] font-bold text-[#1a1208] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.55)] border border-amber-300/60"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {skillIdx < SKILL_CARDS.length - 1 ? 'PRÓXIMA' : 'CONTINUAR'} <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <button
                type="button"
                onClick={handleBack}
                className="mt-3 text-xs tracking-widest font-semibold text-slate-500 hover:text-white transition-colors uppercase"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Voltar
              </button>
            </div>
          </motion.div>
        )}


        {screen === 'summary' && (
          <SummaryScreen
            key="summary"
            variants={variants}
            name={name}
            chosenClass={chosenClass}
            avatar={generatedAvatar}
            skillValues={skillValues}
            onFinish={finishOnboarding}
            onBack={handleBack}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RunicCircle() {
  return (
    <motion.div
      initial={{ opacity: 0, rotate: -20 }}
      animate={{ opacity: 1, rotate: 0 }}
      transition={{ duration: 1.4, ease: 'easeOut' }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ width: 320, height: 320, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
    >
      <motion.svg
        viewBox="0 0 320 320"
        width="320"
        height="320"
        className="opacity-50"
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      >
        <defs>
          <radialGradient id="runeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(96,165,250,0.25)" />
            <stop offset="70%" stopColor="rgba(59,130,246,0.05)" />
            <stop offset="100%" stopColor="rgba(2,6,23,0)" />
          </radialGradient>
        </defs>
        <circle cx="160" cy="160" r="150" fill="url(#runeGlow)" />
        <circle cx="160" cy="160" r="120" fill="none" stroke="rgba(96,165,250,0.45)" strokeWidth="1" strokeDasharray="2 6" />
        <circle cx="160" cy="160" r="100" fill="none" stroke="rgba(96,165,250,0.30)" strokeWidth="1" />
        <circle cx="160" cy="160" r="138" fill="none" stroke="rgba(96,165,250,0.18)" strokeWidth="1" />
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const x = 160 + Math.cos(a) * 110;
          const y = 160 + Math.sin(a) * 110;
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(147,197,253,0.55)"
              fontSize="11"
              fontFamily="serif"
              transform={`rotate(${(a * 180) / Math.PI + 90} ${x} ${y})`}
            >
              {['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ'][i]}
            </text>
          );
        })}
      </motion.svg>
    </motion.div>
  );
}

function HakimV2({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-72 h-72 sm:w-80 sm:h-80' : 'w-56 h-56 sm:w-64 sm:h-64';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
      className="relative mt-8"
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-3/4 h-3/4 rounded-full bg-blue-500/40 blur-[70px]" />
      </motion.div>
      <motion.div
        className={`relative z-10 ${dim} rounded-full overflow-hidden`}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(30,64,175,0.35), rgba(2,6,23,0) 70%)',
        }}
      >
        <img
          src={hakimV2}
          alt="Hakim, mascote guia"
          className="w-full h-full object-cover"
          style={{
            maskImage: 'radial-gradient(circle at 50% 45%, #000 55%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 45%, #000 55%, transparent 78%)',
          }}
        />
      </motion.div>
    </motion.div>
  );
}

function GeneratingPhrase() {
  const phrases = [
    'Analisando traços faciais',
    'Forjando sua nova versão',
    'Aplicando os toques finais',
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % phrases.length), 1800);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="h-12 flex items-center justify-center px-4">
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className="text-amber-400 text-[13px] tracking-[0.14em] text-center"
          style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
        >
          {phrases[idx]}...
        </motion.p>
      </AnimatePresence>
    </div>
  );
}



function ChecklistAnimated() {
  const items = [
    'Analisando traços faciais',
    'Aplicando estilo de personagem',
    'Ajustando detalhes da classe',
    'Preparando revelação final',
  ];
  return (
    <ul className="w-full space-y-1.5">
      {items.map((it, i) => (
        <motion.li key={it}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.6 }}
          className="flex items-center gap-2 text-xs text-foreground/80">
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.6 + 0.3 }}
            className="w-4 h-4 rounded-full bg-primary/30 border border-primary flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-primary" />
          </motion.span>
          {it}
        </motion.li>
      ))}
    </ul>
  );
}

function HakimBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative max-w-sm mb-8"
    >
      <div className="relative bg-card/95 backdrop-blur-md border border-primary/30 rounded-2xl px-5 py-4 shadow-[0_0_30px_hsl(195_100%_50%/0.15)]">
        <div className="absolute -top-3 left-6 px-3 py-0.5 bg-primary/20 border border-primary/40 rounded-full">
          <span className="text-xs font-display tracking-wider text-primary">HAKIM</span>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed font-medium">{text}</p>
      </div>
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card/95 border-b border-r border-primary/30 rotate-45" />
    </motion.div>
  );
}

function HakimMascot({ small = false }: { small?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
      className="relative"
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-40 h-40 rounded-full bg-primary/30 blur-[60px]" />
      </motion.div>
      <motion.img
        src={hakimImage}
        alt="Hakim, mascote guia"
        className={`relative z-10 ${small ? 'w-40' : 'w-56'} h-auto drop-shadow-[0_0_25px_hsl(var(--primary)/0.5)]`}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

const CLASS_LABELS: Record<ClassKey, string> = {
  warrior: 'Guerreiro', mage: 'Mago', healer: 'Curandeiro',
  rogue: 'Ladino', paladin: 'Paladino',
};

const SKILL_LABELS: Record<string, string> = {
  physical: 'Física', mental: 'Mental', spiritual: 'Espiritual',
  professional: 'Profissional', financial: 'Financeira',
};

interface SummaryProps {
  variants: any;
  name: string;
  chosenClass: ClassKey | null;
  avatar: string | null;
  skillValues: Record<string, number>;
  onFinish: () => void;
  onBack?: () => void;
}

function SummaryScreen({ variants, name, chosenClass, avatar, skillValues, onFinish, onBack }: SummaryProps) {
  const className = chosenClass ? CLASS_LABELS[chosenClass] : '—';
  // Only consider the five skill keys chosen on step 5 (defensive against stray keys).
  const SKILL_KEYS = ['physical', 'mental', 'spiritual', 'professional', 'financial'] as const;
  const entries = SKILL_KEYS.map((k) => [k, Number(skillValues[k]) || 0] as [string, number]);
  const top = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const low = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  // Show the raw value the user picked (0-100), no rescale.
  const scaled = (v: number) => v;

  return (
    <motion.div
      variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="relative w-full max-w-md px-0 pb-10 flex flex-col items-stretch min-h-screen overflow-x-hidden overflow-y-auto"
    >
      {/* Hakim owl - right side, feathered */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-16 right-0 w-[52%] max-w-[260px] aspect-[3/4] z-0"
        style={{
          backgroundImage: `url(${hakim2})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left center',
          WebkitMaskImage:
            'radial-gradient(ellipse 75% 75% at 60% 45%, #000 40%, rgba(0,0,0,0.55) 70%, transparent 92%)',
          maskImage:
            'radial-gradient(ellipse 75% 75% at 60% 45%, #000 40%, rgba(0,0,0,0.55) 70%, transparent 92%)',
          opacity: 0.95,
        }}
      />

      <div className="relative z-10 w-full px-5">
        <StepIndicator current={6} total={TOTAL_STEPS} />

        {/* Intro text - left of owl */}
        <div className="pr-[44%] mt-6">
          <p
            className="text-slate-200/95 text-[14px] leading-[1.55]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Agora sim já temos tudo o que precisamos para começar! Você poderá alterar essas informações no menu de configurações.
          </p>
        </div>

        {/* divider */}
        <div className="mt-6 mb-4 flex items-center gap-2 max-w-[55%]">
          <span className="block flex-1 h-px bg-amber-500/40" />
          <svg width="10" height="8" viewBox="0 0 10 8" className="text-amber-500/80"><path d="M1 1 L5 7 L9 1 Z" fill="currentColor" /></svg>
          <span className="block flex-1 h-px bg-amber-500/40" />
        </div>

        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative flex flex-col items-center mt-4"
        >
          <div className="relative">
            {avatar ? (
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                <img
                  src={avatar}
                  alt="Seu personagem"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: 'center 12%', transform: 'scale(1.35)', transformOrigin: 'center 20%' }}
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-black/40 border-2 border-amber-400/60 flex items-center justify-center text-4xl text-slate-400/50">?</div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-amber-400 text-[13px]" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
            <Star size={14} className="fill-amber-400" />
            <span>Level 1</span>
          </div>

          <div className="mt-2 text-center">
            <div className="text-white text-[28px] leading-tight" style={{ fontFamily: SERIF, fontWeight: 500 }}>{name || 'Herói'}</div>
            <div className="text-amber-400 text-[12px] mt-0.5 tracking-[0.18em]" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>CLASSE: {className.toUpperCase()}</div>
          </div>
        </motion.div>

        {/* Radar card */}
        <div className="mt-5 rounded-2xl border border-amber-500/40 bg-black/40 p-4 shadow-[0_0_30px_rgba(245,158,11,0.12)]">
          <div className="text-center text-cyan-300 text-[13px] tracking-[0.32em] font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            ÁRVORE DE HABILIDADES
          </div>
          <SkillsRadar
            attributes={(['physical','mental','spiritual','professional','financial'] as const).map((t) => {
              const v = Number(skillValues[t]) || 0;
              return { type: t, name: t, xp: v, level: 1, currentXP: 0, xpToNextLevel: 100, icon: '' };
            })}
          />
        </div>

        {/* Summary card */}
        <div className="mt-3 rounded-2xl border border-amber-500/40 bg-black/40 p-5 shadow-[0_0_25px_rgba(245,158,11,0.1)]">
          <div className="text-[12px] tracking-[0.22em] text-amber-400 mb-3" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>RESUMO INICIAL</div>
          <div className="space-y-2 text-[14px]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="flex justify-between"><span className="text-slate-300">Classe</span><span className="text-white font-semibold">{className}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Área dominante</span><span className="font-semibold" style={{ color: SKILL_COLORS[top[0]] }}>{SKILL_LABELS[top[0]]} ({scaled(top[1])})</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Fraqueza</span><span className="text-amber-400 font-semibold">{SKILL_LABELS[low[0]]} ({scaled(low[1])})</span></div>
          </div>
        </div>

        <div className="mt-6 px-1 flex flex-col items-center gap-2">
          <Button onClick={onFinish}
            className="w-full max-w-sm h-14 rounded-xl text-base tracking-[0.18em] font-bold text-[#1a1208] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.6)] border border-amber-300/60"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            INICIAR MINHA JORNADA!
          </Button>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mt-4 text-xs tracking-widest font-semibold text-slate-500 hover:text-white transition-colors uppercase"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Voltar
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}



const SKILL_COLORS: Record<string, string> = {
  physical: '#3b82f6',      // blue
  mental: '#a855f7',        // purple
  spiritual: '#facc15',     // yellow/gold
  professional: '#22c55e',  // green
  financial: '#f59e0b',     // amber/orange
};

const SKILL_ICONS: Record<string, typeof Dumbbell> = {
  physical: Dumbbell,
  mental: Brain,
  spiritual: Sparkle,
  professional: Briefcase,
  financial: DollarSign,
};

function RadarChart({ values }: { values: Record<string, number> }) {
  const order = ['physical', 'mental', 'spiritual', 'professional', 'financial'];
  const size = 320;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const radius = 95;
  const angleFor = (i: number) => (Math.PI * 2 * i) / order.length - Math.PI / 2;

  const [hovered, setHovered] = useState<number | null>(null);

  const point = (i: number, v: number) => {
    const a = angleFor(i);
    const r = (v / 100) * radius;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const axisPoint = (i: number, r = radius) => {
    const a = angleFor(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };

  const polygonPoints = order.map((k, i) => point(i, values[k] ?? 0).join(',')).join(' ');
  const ringPoints = (frac: number) =>
    order.map((_, i) => axisPoint(i, radius * frac).join(',')).join(' ');

  // label positions per axis - matches image 5
  const labelMeta: { anchor: 'start' | 'middle' | 'end'; dy: number; offset: number }[] = [
    { anchor: 'middle', dy: -14, offset: 32 }, // top - Física
    { anchor: 'start', dy: -4, offset: 26 },   // top-right - Mental
    { anchor: 'start', dy: 16, offset: 22 },   // bottom-right - Espiritual
    { anchor: 'end', dy: 16, offset: 22 },     // bottom-left - Profissional
    { anchor: 'end', dy: -4, offset: 26 },     // top-left - Financeira
  ];

  return (
    <svg viewBox={`0 0 ${size} ${size + 10}`} className="w-full h-auto">
      {/* concentric pentagons - dashed */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ringPoints(f)} fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth={0.8} strokeDasharray="3 3" />
      ))}
      {/* axes */}
      {order.map((_, i) => {
        const [x, y] = axisPoint(i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(148,163,184,0.18)" strokeWidth={0.8} />;
      })}

      {/* value polygon - cyan */}
      <motion.polygon
        points={polygonPoints}
        fill="rgba(34,211,238,0.12)"
        stroke="#22d3ee"
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
        style={{ transformOrigin: `${cx}px ${cy}px`, filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.6))' }}
      />

      {/* central pentagon marker */}
      <polygon points={ringPoints(0.12)} fill="none" stroke="#22d3ee" strokeWidth={1.2} opacity={0.7} />

      {/* axis nodes (icon circles) at the vertex - hoverable */}
      {order.map((k, i) => {
        const [x, y] = axisPoint(i);
        const color = SKILL_COLORS[k];
        const Icon = SKILL_ICONS[k];
        return (
          <g
            key={k}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onTouchStart={() => setHovered(i)}
            onTouchEnd={() => setHovered(null)}
          >
            <circle cx={x} cy={y} r={18} fill="transparent" />
            <circle cx={x} cy={y} r={16} fill="#05080f" stroke={color} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 8px ${color}cc)` }} />
            <foreignObject x={x - 10} y={y - 10} width={20} height={20} style={{ pointerEvents: 'none' }}>
              <div style={{ color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                <Icon size={14} />
              </div>
            </foreignObject>

            {/* tooltip */}
            {hovered === i && (
              <g pointerEvents="none">
                <rect x={x - 34} y={y - 42} width={68} height={22} rx={6} fill="#05080f" stroke={color} strokeWidth={1} />
                <text x={x} y={y - 27} textAnchor="middle" fill={color} fontSize="11" fontFamily="Inter, sans-serif" fontWeight={700}>
                  {values[k] ?? 0} XP
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* axis labels (no numbers) */}
      {order.map((k, i) => {
        const meta = labelMeta[i];
        const [x, y] = axisPoint(i, radius + meta.offset);
        const color = SKILL_COLORS[k];
        return (
          <text
            key={`l-${k}`}
            x={x}
            y={y + meta.dy}
            textAnchor={meta.anchor}
            fill={color}
            fontSize="11"
            fontFamily="Inter, sans-serif"
            fontWeight={700}
            letterSpacing="0.8"
          >
            {SKILL_LABELS[k].toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}


function ClassCarousel({
  chosenClass,
  onSelect,
}: {
  chosenClass: ClassKey | null;
  onSelect: (k: ClassKey) => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    loop: true,
    skipSnaps: false,
    containScroll: false,
  });
  const [selected, setSelected] = useState(2); // start on Guerreiro

  useEffect(() => {
    if (!emblaApi) return;
    const onSel = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSel);
    emblaApi.on('reInit', onSel);
    onSel();
    // jump to initial slide
    emblaApi.scrollTo(2, true);
    return () => {
      emblaApi.off('select', onSel);
      emblaApi.off('reInit', onSel);
    };
  }, [emblaApi]);

  // Sync external chosenClass when user lands on a slide
  useEffect(() => {
    const c = CLASSES[selected];
    if (c) onSelect(c.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="relative w-full z-10">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex items-center">
          {CLASSES.map((c, i) => {
            const isActive = i === selected;
            return (
              <div
                key={c.key}
                className="shrink-0 grow-0 basis-[58%] sm:basis-[42%] px-2 flex justify-center"
              >
                <motion.button
                  type="button"
                  onClick={() => emblaApi?.scrollTo(i)}
                  animate={{
                    scale: isActive ? 1 : 0.78,
                    opacity: isActive ? 1 : 0.55,
                    y: isActive ? 0 : 8,
                  }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={`relative w-full rounded-2xl overflow-hidden text-left bg-gradient-to-b from-[#0a1428] via-[#0a0f1e] to-[#05080f] border ${
                    isActive
                      ? 'border-amber-400/80 ' + c.glow
                      : 'border-amber-500/30'
                  }`}
                  style={{ aspectRatio: '3/5' }}
                >
                  <div className="relative h-[55%] w-full overflow-hidden">
                    <img
                      src={c.img}
                      alt={c.name}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#05080f] via-[#05080f]/70 to-transparent" />
                  </div>
                  <div className="px-4 pt-2 pb-3">
                    <div
                      className={`text-center mb-3 tracking-[0.18em] ${
                        isActive ? 'text-amber-400' : 'text-amber-500/70'
                      }`}
                      style={{
                        fontFamily: 'Orbitron, sans-serif',
                        fontWeight: 700,
                        fontSize: isActive ? 18 : 14,
                        textShadow: isActive ? '0 0 18px rgba(245,158,11,0.55)' : 'none',
                      }}
                    >
                      {c.name.toUpperCase()}
                    </div>
                    <ul className="space-y-1.5">
                      {c.traits.map((t) => (
                        <li
                          key={t}
                          className="flex items-center gap-2 text-slate-200/95 text-[13px]"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" className="text-amber-400 shrink-0">
                            <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
                          </svg>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots */}
      <div className="mt-5 flex justify-center gap-2">
        {CLASSES.map((c, i) => (
          <button
            key={c.key}
            aria-label={`Ir para ${c.name}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-2 rounded-full transition-all ${
              i === selected ? 'bg-amber-400 w-6 shadow-[0_0_10px_rgba(245,158,11,0.7)]' : 'bg-amber-500/30 w-2'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

