import React, { useState, useEffect, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface UserProfile {
  id: string
  email: string
  subscription_tier: 'free' | 'plus' | 'pro'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string | null
  updated_at: string | null
}

// Global auth state to prevent multiple initializations
let globalAuthInitialized = false;
let globalAuthSubscription: any = null;

export function useAuth() {
  const hookId = React.useRef(Math.random().toString(36).substr(2, 9)).current
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  
  // Refs to track state and prevent multiple operations
  const mountedRef = useRef(true)
  const profileFetchingRef = useRef(false)
  const initializingRef = useRef(false)
  const profileSubscriptionRef = useRef<any>(null)
  const authSubscriptionRef = useRef<any>(null)
  const initializeCalledRef = useRef(false)
  const userRef = useRef<User | null>(null)
  const globalEventHandlerRef = useRef<any>(null)

  // Keep user ref in sync
  useEffect(() => {
    userRef.current = user
  }, [user])

  // Get fresh session token - critical for checkout requests
  const getFreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting fresh session:', error)
        return null
      }
      return session
    } catch (error) {
      console.error('Error in getFreshSession:', error)
      return null
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    if (!mountedRef.current || profileFetchingRef.current) {
      console.log(`⚠️ [${hookId}] Skipping profile fetch - mounted: ${mountedRef.current}, fetching: ${profileFetchingRef.current}`)
      return
    }

    profileFetchingRef.current = true

    try {
      console.log(`🔄 [${hookId}] Fetching profile for user:`, userId)
      
      // Add timeout to catch hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      })

      const fetchPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

      console.log(`🔍 [${hookId}] Profile fetch result:`, { data: !!data, error: error?.message || 'none' })

      if (error && error.code !== 'PGRST116') {
        console.error(`❌ [${hookId}] Error fetching profile:`, error)
        if (mountedRef.current) {
          setProfile(null)
        }
        return
      }

      console.log(`✅ [${hookId}] Profile fetched successfully:`, {
        found: !!data,
        tier: data?.subscription_tier || 'No profile',
        status: data?.subscription_status || 'No status',
        email: data?.email || 'No email',
        mounted: mountedRef.current
      })
      
      if (mountedRef.current) {
        console.log(`📝 [${hookId}] Setting profile data in state:`, data)
        setProfile(data)
        console.log(`✅ [${hookId}] Profile state updated successfully`)
      } else {
        console.log(`⚠️ [${hookId}] Component not mounted, skipping profile update`)
      }
    } catch (error) {
      console.error(`❌ [${hookId}] Error in fetchProfile:`, error)
      if (mountedRef.current) {
        setProfile(null)
      }
    } finally {
      console.log(`🏁 [${hookId}] Profile fetch completed, resetting fetch flag`)
      profileFetchingRef.current = false
    }
  }, [hookId]) // Add hookId as dependency

  // Force refresh profile with direct database query
  const forceRefreshProfile = useCallback(async () => {
    const currentUser = userRef.current
    if (!currentUser || !mountedRef.current) return

    try {
      console.log('Force refreshing profile for user:', currentUser.id)
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (error) {
        console.error('Error force refreshing profile:', error)
        return
      }

      console.log('Force refresh result:', {
        tier: data.subscription_tier,
        status: data.subscription_status,
        updated: data.updated_at
      })

      if (mountedRef.current) {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error in forceRefreshProfile:', error)
    }
  }, []) // No dependencies - use userRef instead

  // Setup profile real-time subscription
  const setupProfileSubscription = useCallback((userId: string) => {
    // Clean up existing subscription
    if (profileSubscriptionRef.current) {
      console.log('Cleaning up existing profile subscription')
      profileSubscriptionRef.current.unsubscribe()
      profileSubscriptionRef.current = null
    }

    console.log('Setting up profile subscription for user:', userId)
    
    // Create new subscription with better error handling
    const subscription = supabase
      .channel(`profile-changes-${userId}-${Date.now()}`) // Add timestamp to make unique
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`
        },
        (payload: any) => {
          console.log('📡 Profile updated via real-time:', payload.new)
          if (mountedRef.current) {
            setProfile(payload.new as UserProfile)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`
        },
        (payload: any) => {
          console.log('📡 Profile created via real-time:', payload.new)
          if (mountedRef.current) {
            setProfile(payload.new as UserProfile)
          }
        }
      )
      .subscribe((status: any, err: any) => {
        console.log('📡 Profile subscription status:', status)
        if (err) {
          console.error('📡 Profile subscription error:', err)
          
          // Retry subscription setup after error
          setTimeout(() => {
            if (mountedRef.current) {
              console.log('📡 Retrying profile subscription...')
              setupProfileSubscription(userId)
            }
          }, 5000)
        }
      })

    profileSubscriptionRef.current = subscription
  }, [])

  // Single useEffect to handle all auth initialization and state changes
  useEffect(() => {
    console.log(`🚀 Initializing auth hook [${hookId}]...`)
    
    // Prevent multiple auth hooks from running simultaneously
    if (globalAuthInitialized) {
      console.log(`⚠️ [${hookId}] Global auth already initialized, syncing current state...`)
      
      const syncCurrentSession = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          console.log(`📡 [${hookId}] Syncing session:`, session?.user?.email || 'No session')
          
          if (mountedRef.current) {
            setSession(session)
            setUser(session?.user ?? null)
            
            if (session?.user) {
              console.log(`👤 [${hookId}] Syncing profile for existing session...`)
              await fetchProfile(session.user.id)
              setupProfileSubscription(session.user.id)
            }
            
            setLoading(false)
            setInitialized(true)
          }
        } catch (error) {
          console.error(`❌ [${hookId}] Error syncing current session:`, error)
          if (mountedRef.current) {
            setLoading(false)
            setInitialized(true)
          }
        }
      }
      
      syncCurrentSession()
      
      // Listen for auth state changes from primary hook
      const handleGlobalAuthChange = async (e: any) => {
        const { event, session, hookId: sourceHookId } = e.detail
        
        // Skip if this is from our own hook
        if (sourceHookId === hookId) return
        
        if (!mountedRef.current) return
        
        console.log(`🔄 [${hookId}] Received auth change from [${sourceHookId}]:`, event, session?.user?.email || 'No user')
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          // Clear all user data on sign out
          console.log(`🚪 [${hookId}] Clearing user data on sign out/no session`)
          
          if (profileSubscriptionRef.current) {
            profileSubscriptionRef.current.unsubscribe()
            profileSubscriptionRef.current = null
          }
          
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
          
          console.log(`✅ [${hookId}] User data cleared successfully`)
        } else if (session?.user) {
          // Update auth state for authenticated users
          setSession(session)
          setUser(session.user)
          
          console.log(`👤 [${hookId}] Updating state for authenticated user:`, event, 'User ID:', session.user.id)
          
          // Handle different auth events
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            console.log(`🔄 [${hookId}] User signed in or token refreshed, fetching profile...`)
            await fetchProfile(session.user.id)
            setupProfileSubscription(session.user.id)
          } else if (event === 'INITIAL_SESSION') {
            console.log(`⏭️ [${hookId}] Initial session - profile fetch handled during initialization`)
          } else {
            console.log(`🔄 [${hookId}] Other auth event, fetching profile...`)
            await fetchProfile(session.user.id)
            setupProfileSubscription(session.user.id)
          }
          setLoading(false)
        }
      }

      globalEventHandlerRef.current = handleGlobalAuthChange
      window.addEventListener('authStateChange', handleGlobalAuthChange)
      
      return
    }
    
    // Mark as globally initialized
    globalAuthInitialized = true
    initializingRef.current = true
    mountedRef.current = true

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
        }

        console.log('Initial session check:', session?.user?.email || 'No session')
        
        if (mountedRef.current) {
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            await fetchProfile(session.user.id)
            setupProfileSubscription(session.user.id)
          }
          
          setLoading(false)
          setInitialized(true)
          console.log('✅ Auth initialization completed')
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mountedRef.current) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
          setInitialized(true)
        }
      } finally {
        initializingRef.current = false
      }
    }

    // Set up auth state listener for this component instance
    const setupAuthListener = () => {
      // Only the primary auth hook should set up the global subscription
      if (globalAuthSubscription) {
        console.log(`⚠️ [${hookId}] Global auth subscription already exists, reusing...`)
        authSubscriptionRef.current = globalAuthSubscription
        return
      }

      console.log(`🔗 [${hookId}] Setting up global auth state listener (primary hook)`)
      try {
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange(async (event: any, session: Session | null) => {
          console.log(`🔔 [${hookId}] Auth state changed:`, event, session?.user?.email || 'No session')
          
          // Broadcast to all auth hook instances
          window.dispatchEvent(new CustomEvent('authStateChange', { 
            detail: { event, session, hookId }
          }))
          
          // Update local state for primary hook
          if (mountedRef.current) {
            console.log(`🔄 [${hookId}] Updating local auth state for event:`, event)
            
                          if (event === 'SIGNED_OUT' || !session?.user) {
                console.log(`🚪 [${hookId}] Clearing user data on sign out/no session`)
                
                // Clean up subscriptions
                if (profileSubscriptionRef.current) {
                  profileSubscriptionRef.current.unsubscribe()
                  profileSubscriptionRef.current = null
                }
                
                // Clear all state
                setSession(null)
                setUser(null)
                setProfile(null)
                setLoading(false)
                
                console.log(`✅ [${hookId}] User data cleared successfully`)
                          } else if (session?.user) {
                // Update auth state for authenticated users
                setSession(session)
                setUser(session.user)
                
                console.log(`👤 [${hookId}] Updating state for authenticated user:`, event, 'User ID:', session.user.id)
                
                // Handle different auth events
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                  console.log(`🔄 [${hookId}] User signed in or token refreshed, fetching profile...`)
                  await fetchProfile(session.user.id)
                  setupProfileSubscription(session.user.id)
                } else if (event === 'INITIAL_SESSION') {
                  console.log(`⏭️ [${hookId}] Initial session - profile fetch handled during initialization`)
                } else {
                  // Handle any other auth events that might need profile sync
                  console.log(`🔄 [${hookId}] Other auth event, fetching profile...`)
                  await fetchProfile(session.user.id)
                  setupProfileSubscription(session.user.id)
                }
                setLoading(false)
            }
          }
        })

        authSubscriptionRef.current = authSubscription
        globalAuthSubscription = authSubscription
        console.log(`✅ [${hookId}] Global auth listener set up successfully`)
      } catch (error) {
        console.error('❌ Error setting up auth listener:', error)
      }
    }

    // Set up auth listener first, then initialize
    setupAuthListener()
    
    // Then initialize auth state
    initializeAuth()

    // Cleanup function
    return () => {
      console.log(`🧹 [${hookId}] Cleaning up auth hook`)
      mountedRef.current = false
      
      if (profileSubscriptionRef.current) {
        profileSubscriptionRef.current.unsubscribe()
        profileSubscriptionRef.current = null
      }
      
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe()
        authSubscriptionRef.current = null
      }
      
      // Note: Global event listeners will be cleaned up when page unloads
      }
  }, []) // No dependencies - run only once!

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) throw error

      return { data, error: null }
    } catch (error: any) {
      console.error('Sign up error:', error)
      return { data: null, error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Starting sign in process for:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('❌ Supabase sign in error:', error)
        throw error
      }

      console.log('✅ Sign in successful:', {
        user: data.user?.email,
        session: !!data.session
      })

      return { data, error: null }
    } catch (error: any) {
      console.error('❌ Sign in error:', error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      console.log('🚪 Starting sign out process...')
      
      // Clean up profile subscription before signing out
      if (profileSubscriptionRef.current) {
        console.log('🧹 Cleaning up profile subscription before sign out')
        profileSubscriptionRef.current.unsubscribe()
        profileSubscriptionRef.current = null
      }
      
      // Clear local state immediately
      if (mountedRef.current) {
        setUser(null)
        setProfile(null)
        setSession(null)
        setLoading(false)
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Supabase sign out error:', error)
        throw error
      }
      
      console.log('✅ Sign out completed successfully')
    } catch (error) {
      console.error('❌ Sign out error:', error)
      throw error
    }
  }

  const refreshProfile = useCallback(async () => {
    const currentUser = userRef.current
    if (currentUser) {
      await fetchProfile(currentUser.id)
    }
  }, [fetchProfile]) // Only depend on fetchProfile which is stable

  // Add method to ensure fresh authentication for critical operations
  const ensureFreshAuth = useCallback(async () => {
    const currentUser = userRef.current
    if (!currentUser) return null
    
    const freshSession = await getFreshSession()
    if (!freshSession) {
      throw new Error('Unable to get fresh authentication session')
    }
    
    return freshSession
  }, [getFreshSession]) // Only depend on getFreshSession which is stable

  return {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    forceRefreshProfile,
    ensureFreshAuth,
    getFreshSession
  }
}