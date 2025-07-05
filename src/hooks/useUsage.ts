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
  const [hasInitialized, setHasInitialized] = useState(false)

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
    // Only fetch ONCE when we have both user AND profile AND haven't initialized yet
    if (user && profile && !hasInitialized) {
      console.log('📊 UseUsage: Fetching usage for first time')
      setHasInitialized(true)
      fetchCurrentUsage()
    } else if (!user || !profile) {
      // Clear usage when no user/profile but don't reset hasInitialized
      setUsage(null)
      setLoading(false)
    } else if (user && profile && hasInitialized && !loading) {
      // We have data and have already initialized, so we're good
      console.log('📊 UseUsage: Already initialized, no fetch needed')
    }
  }, [user?.id, profile?.id, hasInitialized]) // Removed usage and loading from dependencies

  const fetchCurrentUsage = async () => {
    if (!user) {
      console.log('📊 UseUsage: No user, skipping fetch')
      setLoading(false)
      return
    }

    try {
      console.log('📊 UseUsage: Starting usage fetch for user:', user.id)
      setLoading(true)
      
      // Get current month period to match database records
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() // 0-based month
      
      // Create month boundaries to match how database creates records
      // Database uses: DATE_TRUNC('month', NOW()) for period_start
      const currentMonthStart = new Date(Date.UTC(year, month, 1))
      const currentMonthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))
      
      console.log('🔍 Looking for usage record for month starting:', currentMonthStart.toISOString())

      // Look for usage record where current date falls within the period range
      const { data, error } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .lte('period_start', now.toISOString()) // period_start <= now
        .gte('period_end', now.toISOString())   // period_end >= now
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle() // Use maybeSingle instead of single to avoid errors when no data

      if (error) {
        console.error('❌ Usage tracking table error:', error)
        
        // If table doesn't exist or access is denied, create a default usage object
        if (error.code === 'PGRST301' || error.message?.includes('relation') || error.code === '42P01') {
          console.log('📊 Usage tracking table not available, using default limits')
          setUsage({
            id: 'default',
            designs_used: 0,
            refine_chats_used: 0,
            period_start: currentMonthStart.toISOString(),
            period_end: currentMonthEnd.toISOString(),
          })
          return
        }
        
        throw error
      }

      if (!data) {
        console.log('📊 No usage record found, creating new one')
        // Create new usage record for this period
        const newUsage = {
          user_id: user.id,
          designs_used: 0,
          refine_chats_used: 0,
          period_start: currentMonthStart.toISOString(),
          period_end: currentMonthEnd.toISOString(),
        }

        const { data: created, error: createError } = await supabase
          .from('usage_tracking')
          .insert(newUsage)
          .select()
          .single()

        if (createError) {
          console.error('❌ Error creating usage record:', createError)
          // Fall back to default usage object
          setUsage({
            id: 'default',
            designs_used: 0,
            refine_chats_used: 0,
            period_start: currentMonthStart.toISOString(),
            period_end: currentMonthEnd.toISOString(),
          })
          return
        }
        
        console.log('✅ Created new usage record:', created)
        setUsage(created)
      } else {
        console.log('✅ Found existing usage record:', data)
        setUsage(data)
      }
    } catch (error) {
      console.error('❌ Error fetching usage:', error)
      
      // Provide default usage limits as fallback
      const nowFallback = new Date()
      const fallbackStart = new Date(Date.UTC(nowFallback.getFullYear(), nowFallback.getMonth(), 1))
      const fallbackEnd = new Date(Date.UTC(nowFallback.getFullYear(), nowFallback.getMonth() + 1, 0, 23, 59, 59, 999))
      
      setUsage({
        id: 'default',
        designs_used: 0,
        refine_chats_used: 0,
        period_start: fallbackStart.toISOString(),
        period_end: fallbackEnd.toISOString(),
      })
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

    // If using default usage (table not available), just update local state
    if (usage.id === 'default') {
      console.log('📊 Using default usage tracking, updating locally')
      setUsage(prev => prev ? { ...prev, designs_used: prev.designs_used + 1 } : null)
      return true
    }

    try {
      const { error } = await supabase
        .from('usage_tracking')
        .update({ 
          designs_used: usage.designs_used + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', usage.id)

      if (error) {
        console.error('❌ Error incrementing design usage:', error)
        // Still increment locally if database fails
        setUsage(prev => prev ? { ...prev, designs_used: prev.designs_used + 1 } : null)
        return true
      }

      setUsage(prev => prev ? { ...prev, designs_used: prev.designs_used + 1 } : null)
      return true
    } catch (error) {
      console.error('❌ Error incrementing design usage:', error)
      // Still increment locally if database fails
      setUsage(prev => prev ? { ...prev, designs_used: prev.designs_used + 1 } : null)
      return true
    }
  }

  const incrementRefineUsage = async () => {
    if (!user || !usage || !profile) return false

    const limits = getUsageLimits(profile.subscription_tier)
    
    if (usage.refine_chats_used >= limits.refine_chats) {
      return false // Usage limit exceeded
    }

    // If using default usage (table not available), just update local state
    if (usage.id === 'default') {
      console.log('📊 Using default usage tracking, updating locally')
      setUsage(prev => prev ? { ...prev, refine_chats_used: prev.refine_chats_used + 1 } : null)
      return true
    }

    try {
      const { error } = await supabase
        .from('usage_tracking')
        .update({ 
          refine_chats_used: usage.refine_chats_used + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', usage.id)

      if (error) {
        console.error('❌ Error incrementing refine usage:', error)
        // Still increment locally if database fails
        setUsage(prev => prev ? { ...prev, refine_chats_used: prev.refine_chats_used + 1 } : null)
        return true
      }

      setUsage(prev => prev ? { ...prev, refine_chats_used: prev.refine_chats_used + 1 } : null)
      return true
    } catch (error) {
      console.error('❌ Error incrementing refine usage:', error)
      // Still increment locally if database fails
      setUsage(prev => prev ? { ...prev, refine_chats_used: prev.refine_chats_used + 1 } : null)
      return true
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