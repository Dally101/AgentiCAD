import React, { useState, useEffect } from 'react'
import { X, Check, Zap, Crown, Loader2, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { stripeProducts } from '../stripe-config'
import type { UserProfile } from '../hooks/useAuth'
import type { User } from '@supabase/supabase-js'

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  profile: UserProfile | null
  ensureFreshAuth: () => Promise<any>
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  profile, 
  ensureFreshAuth 
}) => {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Safety mechanism: Clear loading state after 60 seconds to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timeoutId = setTimeout(() => {
        console.warn('Loading state stuck, clearing after timeout')
        setLoading(null)
        setError('Request timed out. Please try again.')
      }, 60000) // 60 seconds

      return () => clearTimeout(timeoutId)
    }
  }, [loading])

  const currentTier = profile?.subscription_tier || 'free'
  const isPaidUser = currentTier !== 'free'

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      icon: <Zap className="w-6 h-6" />,
      priceId: null,
      features: [
        '2 design generations per month',
        '5 design refinement chats',
        'Full access to all features',
        'Community support'
      ],
      current: currentTier === 'free',
      buttonText: currentTier === 'free' ? 'Current Plan' : 'Cancel Subscription',
      disabled: currentTier === 'free',
      isUpgrade: false,
      isDowngrade: isPaidUser,
      greyedOut: isPaidUser, // New property to grey out for paid users
      isCancel: isPaidUser // This is a cancellation for paid users
    },
    ...stripeProducts.map(product => {
      const tier = product.name.includes('Pro') ? 'pro' : 'plus'
      const isCurrent = currentTier === tier
      const isUpgrade = (currentTier === 'free') || (currentTier === 'plus' && tier === 'pro')
      const isDowngrade = (currentTier === 'pro' && tier === 'plus')
      
      return {
        id: product.id,
        name: product.name,
        price: `$${product.price}`,
        period: 'per month',
        icon: product.name.includes('Pro') ? <Crown className="w-6 h-6" /> : product.name.includes('Plus') ? <Star className="w-6 h-6" /> : <Zap className="w-6 h-6" />,
        priceId: product.priceId,
        features: product.name.includes('Pro') ? [
          '100 design generations per month',
          '1000 design refinement chats',
          'Fastest processing',
          'Priority support',
          'Advanced analytics',
          'API access',
          'Custom integrations'
        ] : [
          '10 design generations per month',
          '100 design refinement chats',
          'Priority processing',
          'Email support',
          'Advanced export options'
        ],
        current: isCurrent,
        buttonText: isCurrent ? 'Current Plan' : isDowngrade ? `Downgrade to ${product.name.split(' ')[0]}` : `Upgrade to ${product.name.split(' ')[0]}`,
        disabled: isCurrent,
        isUpgrade: isUpgrade,
        isDowngrade: isDowngrade,
        greyedOut: false,
        isCancel: false
      }
    })
  ]

  const handleSubscribe = async (plan: any) => {
    // Don't allow subscribing to current plan
    if (plan.disabled && plan.current) {
      console.log('Cannot subscribe to current plan')
      return
    }

    // Handle cancellation for paid users wanting to go to free
    if (plan.isCancel && plan.id === 'free') {
      // For now, redirect to Stripe Customer Portal for cancellation
      // This is safer than implementing custom cancellation logic
      console.log('Redirecting to customer portal for cancellation')
      // TODO: Implement customer portal redirect or custom cancellation flow
      setError('Please contact support to cancel your subscription, or manage it through your account settings.')
      return
    }

    // Don't allow subscribing to free plan for non-cancellation cases
    if (plan.id === 'free' || !plan.priceId) {
      console.log('Subscription blocked:', { 
        isFree: plan.id === 'free', 
        hasPriceId: !!plan.priceId,
        planId: plan.id,
        planName: plan.name
      })
      return
    }

    // Check if user is authenticated
    if (!user) {
      console.error('User not authenticated when trying to subscribe')
      setError('Please sign in to upgrade your subscription')
      return
    }

    // Prevent multiple simultaneous requests
    if (loading) {
      console.log('Already processing a subscription request')
      return
    }

    console.log('=== Starting subscription process ===')
    console.log('Plan:', plan.name, plan.priceId)
    console.log('User:', user.email)

    setLoading(plan.id)
    setError(null)
    
    try {
      // Simple session check - get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication session expired. Please refresh the page and try again.')
      }

      console.log('Creating checkout session...')

      // Create checkout session with simpler request
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: plan.priceId,
          mode: 'subscription',
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/cancel`,
        })
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`
        
        try {
          const errorData = await response.json()
          console.error('Error response:', errorData)
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          console.error('Failed to parse error response')
          errorMessage = response.statusText || errorMessage
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('Checkout session created:', data)
      
      if (data.url) {
        console.log('Redirecting to checkout...')
        // Close modal and redirect
        onClose()
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
      
    } catch (error: any) {
      console.error('Subscription error:', error)
      
      // Set user-friendly error message
      let errorMessage = error.message
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        errorMessage = 'Connection failed. Please check your internet and try again.'
      } else if (errorMessage.includes('session') || errorMessage.includes('auth')) {
        errorMessage = 'Session expired. Please refresh the page and try again.'
      } else if (errorMessage.includes('500')) {
        errorMessage = 'Server error. Please try again in a moment.'
      }
      
      setError(errorMessage)
    } finally {
      // Always clear loading state
      console.log('Clearing loading state')
      setLoading(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          disabled={!!loading}
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          {profile?.subscription_tier === 'pro' ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-3">
                <Crown className="w-6 h-6 text-yellow-400" />
                <h2 className="text-3xl font-bold text-white">Premium Member</h2>
                <Crown className="w-6 h-6 text-yellow-400" />
              </div>
              <p className="text-gray-400">
                You're enjoying our highest tier with unlimited access to all features
              </p>
              <p className="text-yellow-400 text-sm mt-2 font-medium">
                ✨ Thank you for being a Pro subscriber!
              </p>
            </>
          ) : (
            <>
          <h2 className="text-3xl font-bold text-white mb-2">Choose Your Plan</h2>
          <p className="text-gray-400">
            Unlock more designs and refinements to bring your ideas to life
          </p>
          {profile && (
            <p className="text-cyan-400 text-sm mt-2">
              Current plan: {profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1)}
            </p>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm text-center">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-300 hover:text-red-200 text-xs underline block mx-auto"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                plan.current
                  ? plan.name.includes('Pro')
                    ? 'border-yellow-400 bg-yellow-500/10 ring-2 ring-yellow-400/20' // Pro plan highlighting
                    : plan.name.includes('Plus')
                    ? 'border-green-400 bg-green-500/10 ring-2 ring-green-400/20' // Plus plan highlighting
                    : 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-400/20' // Free plan highlighting
                  : plan.greyedOut
                  ? 'border-gray-600 bg-gray-800/20 opacity-60 cursor-not-allowed' // Greyed out for paid users
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              {plan.current && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className={`px-3 py-1 text-white text-sm font-medium rounded-full ${
                    plan.name.includes('Pro')
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                      : plan.name.includes('Plus')
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-cyan-500'
                  }`}>
                    {plan.name.includes('Pro') ? '👑 Current Plan' : 'Current Plan'}
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  plan.name.includes('Pro') 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-400' 
                    : plan.name.includes('Plus')
                    ? 'bg-gradient-to-r from-green-400 to-emerald-400' 
                    : 'bg-gradient-to-r from-cyan-400 to-purple-400'
                }`}>
                  {plan.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 ml-1">/{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      plan.greyedOut ? 'text-gray-500' : 'text-green-400'
                    }`} />
                    <span className={`text-sm ${
                      plan.greyedOut ? 'text-gray-500' : 'text-gray-300'
                    }`}>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.greyedOut && (
                <div className="mb-4 p-2 bg-gray-700/30 border border-gray-600 rounded-lg">
                  <p className="text-gray-400 text-xs text-center">
                    Cancel your current subscription to return to this plan
                  </p>
                </div>
              )}

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={plan.disabled || loading === plan.id}
                className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  plan.disabled && plan.current
                    ? plan.name.includes('Pro')
                      ? 'bg-gradient-to-r from-yellow-500/50 to-orange-500/50 text-yellow-200 cursor-not-allowed'
                      : plan.name.includes('Plus')
                      ? 'bg-gradient-to-r from-green-500/50 to-emerald-500/50 text-green-200 cursor-not-allowed'
                      : 'bg-cyan-500/50 text-cyan-200 cursor-not-allowed'
                    : plan.isCancel
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                    : plan.isDowngrade && !plan.isCancel
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700'
                    : plan.greyedOut
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                    : plan.name.includes('Pro')
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600'
                    : plan.name.includes('Plus')
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                    : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-600 hover:to-purple-600'
                }`}
              >
                {loading === plan.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  plan.buttonText
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            All plans include access to our full feature set. Cancel anytime.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Secure payments powered by Stripe
          </p>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionModal