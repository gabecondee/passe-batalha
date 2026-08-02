-- Tabela de Assinaturas (Gerenciada via Webhook da Stripe)
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', etc.
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
-- Usuário só pode LER a sua própria assinatura.
-- Inserções e Atualizações devem ser feitas pelo servidor (Service Role) através dos Webhooks da Stripe.
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
