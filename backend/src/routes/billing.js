import { Router } from 'express'
import Stripe from 'stripe'
import { requireAuth } from '../middleware/auth.js'
import { query } from '../db.js'

export const billingRouter = Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')

const PLANS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    price: 39,
  },
  business: {
    name: 'Business',
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID,
    price: 89,
  },
  agency: {
    name: 'Agency',
    priceId: process.env.STRIPE_AGENCY_PRICE_ID,
    price: 199,
  },
}

// Statut de l'abonnement actuel
billingRouter.get('/billing/status', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.plan, u.stripe_customer_id,
              s.stripe_subscription_id, s.status, s.current_period_end
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status IN ('active','trialing')
       WHERE u.id = $1`,
      [req.userId]
    )
    const row = result.rows[0]
    res.json({
      plan: row?.plan ?? 'free',
      stripe_customer_id: row?.stripe_customer_id ?? null,
      subscription: row?.stripe_subscription_id
        ? {
            id: row.stripe_subscription_id,
            status: row.status,
            current_period_end: row.current_period_end,
          }
        : null,
    })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Créer une session de checkout Stripe
billingRouter.post('/billing/checkout', requireAuth, async (req, res) => {
  const { plan } = req.body
  if (!PLANS[plan]) return res.status(400).json({ error: 'Plan invalide' })
  if (!PLANS[plan].priceId) {
    return res.status(503).json({ error: 'Billing non configuré' })
  }

  try {
    const userResult = await query(
      'SELECT email, stripe_customer_id FROM users WHERE id = $1',
      [req.userId]
    )
    const user = userResult.rows[0]

    // Créer ou réutiliser le customer Stripe
    let customerId = user.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: req.userId },
      })
      customerId = customer.id
      await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.userId])
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
      success_url: `${frontendUrl}/?checkout=success`,
      cancel_url: `${frontendUrl}/pricing?checkout=cancelled`,
      metadata: { user_id: req.userId, plan },
      allow_promotion_codes: true,
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err.message)
    res.status(500).json({ error: 'Erreur lors de la création du paiement' })
  }
})

// Portail client Stripe (gérer / annuler l'abonnement)
billingRouter.post('/billing/portal', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.userId]
    )
    const customerId = result.rows[0]?.stripe_customer_id
    if (!customerId) return res.status(400).json({ error: 'Aucun abonnement actif' })

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${frontendUrl}/dashboard`,
    })
    res.json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal error:', err.message)
    res.status(500).json({ error: 'Erreur portail Stripe' })
  }
})

// Webhook Stripe — reçoit les événements de paiement
// Note: requiert le body brut, géré via express.raw() dans server.js
billingRouter.post(
  '/billing/webhook',
  async (req, res) => {
    const sig = req.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event
    try {
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
      } else {
        // Mode dev sans signature (ne jamais faire ça en prod)
        event = req.body
      }
    } catch (err) {
      return res.status(400).json({ error: `Webhook Error: ${err.message}` })
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object
          const userId = session.metadata?.user_id
          const plan = session.metadata?.plan
          if (!userId || !plan) break

          // Mettre à jour le plan utilisateur
          await query('UPDATE users SET plan = $1 WHERE id = $2', [plan, userId])

          // Enregistrer l'abonnement
          if (session.subscription) {
            const sub = await stripe.subscriptions.retrieve(session.subscription)
            await query(
              `INSERT INTO subscriptions (user_id, stripe_subscription_id, plan, status, current_period_end)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (stripe_subscription_id)
               DO UPDATE SET status = $4, current_period_end = $5`,
              [userId, sub.id, plan, sub.status, new Date(sub.current_period_end * 1000)]
            )
          }
          break
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object
          await query(
            `UPDATE subscriptions
             SET status = $1, current_period_end = $2
             WHERE stripe_subscription_id = $3`,
            [sub.status, new Date(sub.current_period_end * 1000), sub.id]
          )
          break
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object
          await query(
            `UPDATE subscriptions SET status = 'cancelled' WHERE stripe_subscription_id = $1`,
            [sub.id]
          )
          // Rétrograder au plan gratuit
          const result = await query(
            'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
            [sub.id]
          )
          if (result.rows[0]) {
            await query("UPDATE users SET plan = 'free' WHERE id = $1", [result.rows[0].user_id])
          }
          break
        }
      }
    } catch (err) {
      console.error('Webhook handler error:', err)
      // On répond 200 quand même pour éviter les retry Stripe
    }

    res.json({ received: true })
  }
)
