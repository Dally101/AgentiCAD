import React, { useEffect, useState } from 'react'
import { CheckCircle, ArrowLeft, Sparkles, Zap, AlertTriangle } from 'lucide-react'
import { getProductByTier } from '../stripe-config'
import type { UserProfile } from '../hooks/useAuth'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface SuccessPageProps {
  user: User | null
  profile: UserProfile | null
  refreshProfile: () => Promise<void>
  forceRefreshProfile: () => Promise<void>
}

const SuccessPage: React.FC<SuccessPageProps> = ({ 
  user, 
  profile, 
  refreshProfile, 
  forceRefreshProfile 
}) => {
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(10)
  const [refreshAttempted, setRefreshAttempted] = useState(false)

  // Initial profile refresh - only run once when component mounts
  useEffect(() => {
    if (!user || refreshAttempted) return

    console.log('SuccessPage: Starting profile refresh process')
    setRefreshAttempted(true)

    const refreshData = async () => {
      try {
        // Give webhooks time to process (increased delay)
        console.log('SuccessPage: Waiting for webhook processing...')
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Try multiple refresh strategies
        console.log('SuccessPage: Attempting standard profile refresh')
        await refreshProfile()
        
        // Wait and check if we got an update
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // If still free tier, try force refresh
        if (!profile || profile.subscription_tier === 'free') {
          console.log('SuccessPage: Profile still free, attempting force refresh')
          await forceRefreshProfile()
          
          // Wait and try direct database query if still not updated
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          if (!profile || profile.subscription_tier === 'free') {
            console.log('SuccessPage: Attempting direct database sync')
            await attemptDirectDatabaseSync()

            // Final backup: call manual sync endpoint
            await new Promise(resolve => setTimeout(resolve, 1000))
            if (!profile || profile.subscription_tier === 'free') {
              console.log('SuccessPage: Attempting manual sync API call')
              await attemptManualSync()
            }
          }
        }
        
      } catch (error) {
        console.error('SuccessPage: Error in refresh process:', error)
      } finally {
        // Always stop loading after 10 seconds max
        setTimeout(() => {
          console.log('SuccessPage: Force stopping loading after timeout')
          setLoading(false)
        }, 10000)
      }
    }

    refreshData()
  }, [user]) // Only depend on user, run once when user is available

  // Additional function to directly sync from database
  const attemptDirectDatabaseSync = async () => {
    if (!user) return

    try {
      console.log('SuccessPage: Attempting direct database sync for user:', user.id)
      
      // First, let's check our subscription sync debug view
      const { data: debugInfo } = await supabase
        .from('subscription_sync_debug')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (debugInfo) {
        console.log('SuccessPage: Debug info:', debugInfo)
        
        if (debugInfo.sync_status === 'MISMATCH') {
          console.log('SuccessPage: Detected profile/subscription mismatch')
          
          // If there's no actual Stripe subscription but profile shows paid tier
          if (!debugInfo.stripe_subscription_id && debugInfo.profile_tier !== 'free') {
            console.log('SuccessPage: No Stripe subscription found, checking for recent payments')
            
            // Check if there might be a very recent Stripe subscription we missed
            // First try to trigger a manual sync
            try {
              const { data: syncResult } = await supabase.rpc('manual_sync_user_subscription', {
                user_uuid: user.id
              })
              
              console.log('SuccessPage: Manual sync result:', syncResult)
              
              // Wait and check again
              await new Promise(resolve => setTimeout(resolve, 2000))
              await forceRefreshProfile()
              
            } catch (syncError) {
              console.error('SuccessPage: Error in manual sync:', syncError)
            }
          }
        }
      }

      // Direct query to check current profile state
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (currentProfile) {
        console.log('SuccessPage: Current profile state:', {
          tier: currentProfile.subscription_tier,
          status: currentProfile.subscription_status,
          updated: currentProfile.updated_at
        })

        // Check for any recent subscription
        const { data: subscription } = await supabase
          .from('stripe_subscriptions')
          .select('*')
          .eq('customer_id', currentProfile.stripe_customer_id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (subscription && subscription.status === 'active' && subscription.price_id) {
          console.log('SuccessPage: Found active subscription, checking if profile needs update')
          
          let expectedTier = 'free'
          if (subscription.price_id === 'price_1ReRffQlr7BhgPjLRYQKCMwi') {
            expectedTier = 'plus'
          } else if (subscription.price_id === 'price_1ReRgCQlr7BhgPjLzPv64mSG') {
            expectedTier = 'pro'
          }

          if (currentProfile.subscription_tier !== expectedTier) {
            console.log('SuccessPage: Profile tier mismatch, forcing update')

            // Force update the profile
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
                subscription_tier: expectedTier,
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

            if (!updateError) {
              console.log('SuccessPage: Successfully updated profile tier to:', expectedTier)
              // Trigger a final refresh to update the UI
              await forceRefreshProfile()
            } else {
              console.error('SuccessPage: Error updating profile:', updateError)
            }
          }
        } else {
          console.log('SuccessPage: No active subscription found, checking if profile needs correction')
          
          // If no active subscription but profile shows paid tier, this is likely an error
          if (currentProfile.subscription_tier !== 'free') {
            console.warn('SuccessPage: User has paid tier but no active subscription - this may indicate a sync issue')
            // Don't automatically downgrade - this could be a temporary sync issue
            // Instead, try the manual sync endpoint as a last resort
          }
        }
      }
    } catch (error) {
      console.error('SuccessPage: Error in direct database sync:', error)
    }
  }

  // Manual sync function as final backup
  const attemptManualSync = async () => {
    if (!user) return
    
    try {
      console.log('SuccessPage: Calling manual sync endpoint')
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('SuccessPage: No session token for manual sync')
        return
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manual-sync-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('SuccessPage: Manual sync result:', result)
        
        if (result.updated) {
          console.log('SuccessPage: Manual sync updated profile, refreshing')
          await forceRefreshProfile()
        }
      } else {
        console.error('SuccessPage: Manual sync failed:', response.status)
      }
    } catch (error) {
      console.error('SuccessPage: Error in manual sync:', error)
    }
  }

  // Check if profile has been updated
  useEffect(() => {
    if (profile && profile.subscription_tier !== 'free') {
      console.log('SuccessPage: Profile updated to:', profile.subscription_tier)
      setLoading(false)
    }
  }, [profile?.subscription_tier]) // Only depend on the tier changing

  // Force stop loading and auto-correct inconsistent profiles
  useEffect(() => {
    const forceCorrectInconsistentProfile = async () => {
      if (!user) return

      try {
        // Check for sync mismatches
        const { data: debugInfo } = await supabase
          .from('subscription_sync_debug')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (debugInfo && debugInfo.sync_status === 'MISMATCH') {
          console.log('SuccessPage: Detected profile mismatch, auto-correcting:', debugInfo)
        
          // If user has paid tier but no subscription, reset to free
          if (debugInfo.profile_tier !== 'free' && !debugInfo.stripe_subscription_id) {
            console.log('SuccessPage: Resetting invalid paid tier to free')
            
            // Use service role to force the update
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manual-sync-profile`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'reset_inconsistent_profile',
                userId: user.id
              })
            })

            if (response.ok) {
              console.log('SuccessPage: Profile reset successful')
              await forceRefreshProfile()
            }
          }
        }
      } catch (error) {
        console.error('SuccessPage: Error checking profile consistency:', error)
      } finally {
        // Always ensure loading stops
        setTimeout(() => setLoading(false), 3000)
      }
    }

    forceCorrectInconsistentProfile()
  }, [user])

  // Force complete loading after 15 seconds
  useEffect(() => {
    const forceTimer = setTimeout(() => {
      console.log('SuccessPage: Force completing after 15 seconds')
      setLoading(false)
    }, 15000)

    return () => clearTimeout(forceTimer)
  }, [])

  // Auto-redirect countdown
  useEffect(() => {
    if (!loading && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      handleBackToApp()
    }
  }, [loading, countdown])

  const handleBackToApp = () => {
    // Clear the URL and navigate to home
    window.history.replaceState({}, '', '/')
    // Force a page reload to ensure clean state
    window.location.reload()
  }

  const handleStartDesigning = () => {
    // Clear the URL and navigate to home, then trigger wizard
    window.history.replaceState({}, '', '/')
    // Use a small delay to ensure URL is updated before navigation
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('navigateToWizard'))
    }, 100)
  }

  const handleManualRefresh = async () => {
    console.log('Manual refresh button clicked')
    setLoading(true)
    
    try {
      // Try all refresh methods
      await refreshProfile()
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await forceRefreshProfile()
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await attemptDirectDatabaseSync()
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await attemptManualSync()
      
    } catch (error) {
      console.error('Error in manual refresh:', error)
    } finally {
      setTimeout(() => setLoading(false), 2000)
    }
  }

  const getSubscriptionDisplayName = (tier: string) => {
    const product = getProductByTier(tier)
    return product ? product.name : 'Free Plan'
  }

  const getSubscriptionFeatures = (tier: string) => {
    switch (tier) {
      case 'plus':
        return [
          '10 design generations per month',
          '100 design refinement chats',
          'Priority processing',
          'Email support',
          'Advanced export options'
        ]
      case 'pro':
        return [
          '100 design generations per month',
          '1000 design refinement chats',
          'Fastest processing',
          'Priority support',
          'Advanced analytics',
          'API access',
          'Custom integrations'
        ]
      default:
        return ['2 design generations per month', '5 design refinement chats']
    }
  }

  const getSubscriptionPrice = (tier: string) => {
    const product = getProductByTier(tier)
    return product ? `$${product.price}/month` : 'Free'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 w-full max-w-lg text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">Payment Successful!</h1>
        
        {loading ? (
          <div className="mb-8">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-300">Updating your account...</p>
            <p className="text-gray-500 text-sm mt-2">Processing payment confirmation</p>
            <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-400 text-xs">
                This may take a few moments while we sync your subscription...
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <p className="text-gray-300 mb-6">
              Thank you for your subscription! Your account has been upgraded successfully.
            </p>
            
            {profile && profile.subscription_tier !== 'free' ? (
              <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                  <span className="text-cyan-400 font-bold text-lg">
                    {getSubscriptionDisplayName(profile.subscription_tier)} Active
                  </span>
                </div>
                <div className="text-center mb-4">
                  <span className="text-2xl font-bold text-white">
                    {getSubscriptionPrice(profile.subscription_tier)}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-gray-300 text-sm mb-3 text-center">Your new benefits include:</p>
                  <ul className="text-gray-300 text-sm space-y-2">
                    {getSubscriptionFeatures(profile.subscription_tier).map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <p className="text-green-400 font-medium">Payment Processed Successfully</p>
                </div>
                <p className="text-green-300 text-sm">
                  Your subscription is active! You can now access all premium features.
                </p>
              </div>
            )}
            
            {/* Auto-redirect notice */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-blue-400 text-sm">
                Automatically redirecting in {countdown} seconds...
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleStartDesigning}
            className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105"
          >
            <Zap className="w-5 h-5" />
            Start Designing Now
          </button>
          
          {/* Show refresh button if profile hasn't updated and not loading */}
          {!loading && profile && profile.subscription_tier === 'free' && (
            <button
              onClick={handleManualRefresh}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Refresh Subscription Status
            </button>
          )}
          
          <button
            onClick={handleBackToApp}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to AgentiCAD
          </button>
        </div>
      </div>
    </div>
  )
}

export default SuccessPage