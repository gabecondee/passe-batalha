import re

with open(r'src/components/onboarding/OnboardingWizard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State removal
content = content.replace(
    "const [loginMode, setLoginMode] = useState<'firstAccess' | 'returning'>('returning');",
    "const loginMode = 'returning';"
)
content = content.replace(
    "const [loginMode, setLoginMode] = useState<'firstAccess' | 'returning'>('firstAccess');",
    "const loginMode = 'returning';"
)

# 2. Intro view buttons
intro_search = """                      <div className="flex flex-col gap-5 w-full max-w-xs items-center">
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
                          Fazer login
                        </button>
                      </div>"""
intro_replace = """                      <div className="flex flex-col gap-5 w-full max-w-xs items-center">
                        <Button
                          onClick={() => { setAuthView('login'); }}
                          className="w-full h-14 rounded-xl text-base tracking-[0.18em] font-bold text-[#1a1208] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.55)] border border-amber-300/60 justify-center items-center gap-2"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          ENTRAR
                        </Button>
                      </div>"""
content = content.replace(intro_search, intro_replace)

# 3. Login view headers
login_header_search = """                        {loginMode === 'firstAccess' ? 'CRIAR CONTA' : 'ENTRAR'}
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
                      </p>"""
login_header_replace = """                        ENTRAR
                      </h1>
                      <p className="text-slate-400 text-sm sm:text-base mb-10 max-w-xs leading-relaxed">
                        Bem-vindo de volta. Continue sua jornada.
                        <br/><br/>
                        <span className="text-amber-500/80 text-xs">Recebeu um convite? Verifique seu e-mail e clique no link para acessar.</span>
                      </p>"""
content = content.replace(login_header_search, login_header_replace)

# 4. Form button text
form_btn_search = """                          {authLoading ? (
                            <><Loader2 className="w-5 h-5 animate-spin" />{loginMode === 'firstAccess' ? 'Criando conta...' : 'Entrando...'}</>
                          ) : (
                            loginMode === 'firstAccess' ? 'CRIAR CONTA' : 'ENTRAR'
                          )}"""
form_btn_replace = """                          {authLoading ? (
                            <><Loader2 className="w-5 h-5 animate-spin" />Entrando...</>
                          ) : (
                            'ENTRAR'
                          )}"""
content = content.replace(form_btn_search, form_btn_replace)

# 5. Form toggle text
toggle_search_regex = r"\{loginMode === 'firstAccess' \? \([\s\S]*?\) : \([\s\S]*?<button[^>]*onClick=\{[^>]*navigate\('/forgot-password'\)[\s\S]*?>[\s\S]*?Esqueci minha senha[\s\S]*?</button>[\s\S]*?<div className=\"text-center\">[\s\S]*?<span className=\"text-slate-400 text-sm\">Ainda n[^<]* tem conta\? </span>[\s\S]*?<button[^>]*onClick=\{[^>]*setLoginMode\('firstAccess'\)[\s\S]*?>[\s\S]*?Criar conta[\s\S]*?</button>[\s\S]*?</div>[\s\S]*?</div>[\s\S]*?\)\}"
toggle_replace = """                      <div className="mt-4 flex flex-col items-center gap-4">
                        <button
                          type="button"
                          onClick={() => navigate('/forgot-password')}
                          className="text-slate-400 hover:text-slate-300 text-xs tracking-wider transition relative z-50 cursor-pointer"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          Esqueci minha senha
                        </button>
                      </div>"""
content = re.sub(toggle_search_regex, toggle_replace, content)

# 6. handleAuth signUp logic removal
regex_handleauth = r"try \{\s*if \(loginMode === 'firstAccess'\) \{[\s\S]*?setTimeout\(\(\) => \{\s*setScreen\('meet'\);\s*\}, 500\);\s*\} else \{([\s\S]*?toast\.success\('Bem-vindo de volta, guerreiro!'\);[\s\S]*?)\}\s*\}\s*catch"
replacement_handleauth = r"try {\1} catch"
content = re.sub(regex_handleauth, replacement_handleauth, content)

with open(r'src/components/onboarding/OnboardingWizard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
