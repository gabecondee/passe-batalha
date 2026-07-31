import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@^14.0.0";
import { createClient } from "npm:@supabase/supabase-js@^2.39.0";

// Inicialização do cliente Stripe (Edge Functions usam fetch)
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// Inicialização do Supabase ignorando o RLS com a Service Role Key
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  // Validação básica de segurança
  if (!signature || !webhookSecret) {
    return new Response("Requisição inválida: Ausência de assinatura ou secret.", { status: 400 });
  }

  try {
    const body = await req.text();
    // Valida e constrói o evento autenticado de forma segura usando a biblioteca oficial da Stripe
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        
        const customerId = session.customer as string;
        const userId = session.client_reference_id; // UUID do auth.users passado no checkout
        const subscriptionId = session.subscription as string;

        if (userId && customerId) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .upsert({
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: "active",
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

          if (error) throw error;
        } else {
          console.warn("Sessão concluída sem client_reference_id (user_id) ou customerId.");
        }
        break;
      }
      
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const planId = subscription.items.data[0]?.price.id;
        
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: subscription.status,
            plan_id: planId,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) throw error;
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) throw error;
        break;
      }

      default:
        console.log(`Evento ignorado: ${event.type}`);
    }

    // Sucesso absoluto na transação
    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error(`Erro no Webhook: ${err.message}`);
    return new Response(`Erro no Webhook: ${err.message}`, { status: 400 });
  }
});
