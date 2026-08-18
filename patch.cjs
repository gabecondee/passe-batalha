const fs = require('fs');

let content = fs.readFileSync('src/components/onboarding/OnboardingWizard.tsx', 'utf-8');
content = content.replace(/\r\n/g, '\n');

// 1. State removal
content = content.replace(
    "const [loginMode, setLoginMode] = useState<'firstAccess' | 'returning'>('returning');",
    "const loginMode = 'returning';"
);
content = content.replace(
    "const [loginMode, setLoginMode] = useState<'firstAccess' | 'returning'>('firstAccess');",
    "const loginMode = 'returning';"
);

// 2. Intro view buttons
const introRegex = /<Button\s+onClick=\{\(\) => \{ setLoginMode\('firstAccess'\); setAuthView\('login'\); \}\}\s+className="[^"]+"\s+style=\{\{ fontFamily: 'Inter, sans-serif' \}\}\s*>\s*PRIMEIRO ACESSO\s*<\/Button>\s*<button\s+type="button"\s+onClick=\{\(\) => \{ setLoginMode\('returning'\); setAuthView\('login'\); \}\}\s+className="[^"]+"\s+style=\{\{ fontFamily: 'Inter, sans-serif' \}\}\s*>\s*Fazer login\s*<\/button>/g;

const introReplace = `<Button
                          onClick={() => { setAuthView('login'); }}
                          className="w-full h-14 rounded-xl text-base tracking-[0.18em] font-bold text-[#1a1208] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.55)] border border-amber-300/60 justify-center items-center gap-2"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          ENTRAR
                        </Button>`;
content = content.replace(introRegex, introReplace);

// 3. Login view headers
const loginHeaderRegex = /\{loginMode === 'firstAccess' \? 'CRIAR CONTA' : 'ENTRAR'\}\s*<\/h1>\s*<p className="text-slate-400 text-sm sm:text-base mb-10 max-w-xs leading-relaxed">\s*\{loginMode === 'firstAccess' \? \([\s\S]*?\) : \([\s\S]*?\)\}\s*<\/p>/g;
const loginHeaderReplace = `ENTRAR
                      </h1>
                      <p className="text-slate-400 text-sm sm:text-base mb-10 max-w-xs leading-relaxed">
                        Bem-vindo de volta. Continue sua jornada.
                        <br/><br/>
                        <span className="text-amber-500/80 text-xs">Recebeu um convite? Verifique seu e-mail e clique no link para acessar.</span>
                      </p>`;
content = content.replace(loginHeaderRegex, loginHeaderReplace);

// 4. Form button text
const formBtnRegex = /\{loginMode === 'firstAccess' \? 'Criando conta\.\.\.' : 'Entrando\.\.\.'\}<\/>\s*\) : \(\s*loginMode === 'firstAccess' \? 'CRIAR CONTA' : 'ENTRAR'\s*\)/g;
const formBtnReplace = `Entrando...</>
                          ) : (
                            'ENTRAR'
                          )`;
content = content.replace(formBtnRegex, formBtnReplace);

// 5. Form toggle text
const toggleRegex = /\{loginMode === 'firstAccess' \? \([\s\S]*?\) : \([\s\S]*?<button[^>]*onClick=\{[^>]*navigate\('\/forgot-password'\)[\s\S]*?>[\s\S]*?Esqueci minha senha[\s\S]*?<\/button>[\s\S]*?<div className="text-center">[\s\S]*?<span className="text-slate-400 text-sm">Ainda n[^<]* tem conta\? <\/span>[\s\S]*?<button[^>]*onClick=\{[^>]*setLoginMode\('firstAccess'\)[\s\S]*?>[\s\S]*?Criar conta[\s\S]*?<\/button>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\)\}/;
const toggleReplace = `<div className="mt-4 flex flex-col items-center gap-4">
                        <button
                          type="button"
                          onClick={() => navigate('/forgot-password')}
                          className="text-slate-400 hover:text-slate-300 text-xs tracking-wider transition relative z-50 cursor-pointer"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          Esqueci minha senha
                        </button>
                      </div>`;
content = content.replace(toggleRegex, toggleReplace);

// 6. handleAuth signUp logic removal
const authRegex = /try \{\s*if \(loginMode === 'firstAccess'\) \{[\s\S]*?setTimeout\(\(\) => \{\s*setScreen\('meet'\);\s*\}, 500\);\s*\} else \{([\s\S]*?toast\.success\('Bem-vindo de volta, guerreiro!'\);[\s\S]*?)\}\s*\}\s*catch/g;
const authReplace = `try {$1} catch`;
content = content.replace(authRegex, authReplace);

fs.writeFileSync('src/components/onboarding/OnboardingWizard.tsx', content, 'utf-8');
console.log('Done!');
