import React, { memo } from 'react'
import { BarChart3, MessageCircle, Eye } from 'lucide-react'
import { useUsage } from '../hooks/useUsage'
import { useAuth } from '../hooks/useAuth'
import { getProductByTier } from '../stripe-config'

interface UsageIndicatorProps {
  onUpgradeClick: () => void
}

const UsageIndicator: React.FC<UsageIndicatorProps> = ({ onUpgradeClick }) => {
  const { usage, loading, getUsageLimits } = useUsage()
  const { profile } = useAuth()
  
  // Debug the re-render issue
  console.log('📊 UsageIndicator render:', { 
    hasUsage: !!usage, 
    hasProfile: !!profile, 
    loading,
    usageId: usage?.id
  })

  // Debug logging - can be removed once everything works perfectly
  // console.log('📊 UsageIndicator render:', { 
  //   hasUsage: !!usage, 
  //   hasProfile: !!profile, 
  //   loading,
  //   profileTier: profile?.subscription_tier 
  // })

  // Show loading state if profile doesn't exist
  if (!profile) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Loading...</h3>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  // Use fallback usage data if not loaded yet
  const currentUsage = usage || {
    id: 'temp',
    designs_used: 0,
    refine_chats_used: 0,
    period_start: new Date().toISOString(),
    period_end: new Date().toISOString()
  }

  const limits = getUsageLimits(profile.subscription_tier)
  const designsPercent = (currentUsage.designs_used / limits.designs) * 100
  const chatsPercent = (currentUsage.refine_chats_used / limits.refine_chats) * 100

  const getSubscriptionDisplayName = (tier: string) => {
    const product = getProductByTier(tier)
    if (product) {
      return product.name.split(' ')[0] // Returns 'Pro' or 'Plus'
    }
    return 'Free'
  }

  const getUpgradeText = () => {
    if (profile.subscription_tier === 'free') {
      return 'Upgrade Plan'
    } else if (profile.subscription_tier === 'plus') {
      return 'Upgrade to Pro'
    }
    return 'Manage Plan'
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-cyan-400" />
        <h3 className="font-semibold text-white">Usage This Month</h3>
        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
          {getSubscriptionDisplayName(profile.subscription_tier)}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">Designs</span>
            </div>
            <span className="text-sm text-white">
              {currentUsage.designs_used} / {limits.designs}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                designsPercent >= 100 ? 'bg-red-500' : designsPercent >= 80 ? 'bg-yellow-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(designsPercent, 100)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">Refine Chats</span>
            </div>
            <span className="text-sm text-white">
              {currentUsage.refine_chats_used} / {limits.refine_chats}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                chatsPercent >= 100 ? 'bg-red-500' : chatsPercent >= 80 ? 'bg-yellow-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(chatsPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {(designsPercent >= 80 || chatsPercent >= 80) && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm mb-2">
            {designsPercent >= 100 || chatsPercent >= 100 
              ? 'Usage limit reached!' 
              : 'Approaching usage limit'
            }
          </p>
          <button
            onClick={onUpgradeClick}
            className="text-xs bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-3 py-1 rounded-full hover:from-cyan-600 hover:to-purple-600 transition-all duration-300"
          >
            {getUpgradeText()}
          </button>
        </div>
      )}

      {/* Always show upgrade option for free users */}
      {profile.subscription_tier === 'free' && designsPercent < 80 && chatsPercent < 80 && (
        <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <p className="text-cyan-400 text-sm mb-2">
            Get more designs and chats with a premium plan
          </p>
          <button
            onClick={onUpgradeClick}
            className="text-xs bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-3 py-1 rounded-full hover:from-cyan-600 hover:to-purple-600 transition-all duration-300"
          >
            Upgrade Plan
          </button>
        </div>
      )}
    </div>
  )
}

export default memo(UsageIndicator)