import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface UsageData {
  id: string
  designs_used: number
  refine_chats_used: number
  period_start: string
  period_end: string
}

export interface UsageLimits {
  designs: number
  refine_chats: number
}

export function useUsage() {
  const { user, profile } = useAuth()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  const getUsageLimits = (tier: string): UsageLimits => {
    switch (tier) {
      case 'plus':
        return { designs: 10, refine_chats: 100 }
      case 'pro':
        return { designs: 100, refine_chats: 1000 }
      default:
        return { designs: 2, refine_chats: 5 }
    }
  }

  useEffect(() => {
    if (user && profile) {
      fetchCurrentUsage()
    } else {
      setLoading(false)
    }
  }, [user, profile])

  const fetchCurrentUsage = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Get current month period
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_start', periodStart.toISOString().split('T')[0])
        .eq('period_end', periodEnd.toISOString().split('T')[0])
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) {
        // Create new usage record for this period
        const newUsage = {
          user_id: user.id,
          designs_used: 0,
          refine_chats_used: 0,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
        }

        const { data: created, error: createError } = await supabase
          .from('usage_tracking')
          .insert(newUsage)
          .select()
          .single()

        if (createError) throw createError
        setUsage(created)
      } else {
        setUsage(data)
      }
    } catch (error) {
      console.error('Error fetching usage:', error)
    } finally {
      setLoading(false)
    }
  }

  const incrementDesignUsage = async () => {
    if (!user || !usage || !profile) return false

    const limits = getUsageLimits(profile.subscription_tier)
    
    if (usage.designs_used >= limits.designs) {
      return false // Usage limit exceeded
    }

    try {
      const { error } = await supabase
        .from('usage_tracking')
        .update({ 
          designs_used: usage.designs_used + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', usage.id)

      if (error) throw error

      setUsage(prev => prev ? { ...prev, designs_used: prev.designs_used + 1 } : null)
      return true
    } catch (error) {
      console.error('Error incrementing design usage:', error)
      return false
    }
  }

  const incrementRefineUsage = async () => {
    if (!user || !usage || !profile) return false

    const limits = getUsageLimits(profile.subscription_tier)
    
    if (usage.refine_chats_used >= limits.refine_chats) {
      return false // Usage limit exceeded
    }

    try {
      const { error } = await supabase
        .from('usage_tracking')
        .update({ 
          refine_chats_used: usage.refine_chats_used + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', usage.id)

      if (error) throw error

      setUsage(prev => prev ? { ...prev, refine_chats_used: prev.refine_chats_used + 1 } : null)
      return true
    } catch (error) {
      console.error('Error incrementing refine usage:', error)
      return false
    }
  }

  const canUseDesign = () => {
    if (!usage || !profile) return false
    const limits = getUsageLimits(profile.subscription_tier)
    return usage.designs_used < limits.designs
  }

  const canUseRefine = () => {
    if (!usage || !profile) return false
    const limits = getUsageLimits(profile.subscription_tier)
    return usage.refine_chats_used < limits.refine_chats
  }

  return {
    usage,
    loading,
    getUsageLimits,
    incrementDesignUsage,
    incrementRefineUsage,
    canUseDesign,
    canUseRefine,
    refreshUsage: fetchCurrentUsage,
  }
}