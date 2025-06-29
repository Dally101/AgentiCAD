import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  onAuthRequired: () => void
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, onAuthRequired }) => {
  const { user, loading } = useAuth()
  const hasTriggeredAuth = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showAuthRequired, setShowAuthRequired] = useState(false)

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Reset states when user becomes available
    if (user) {
      hasTriggeredAuth.current = false
      setShowAuthRequired(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      return
    }

    // Only trigger auth required when we're not loading and there's no user
    if (!loading && !user && !hasTriggeredAuth.current) {
      // Add a delay to prevent race conditions and allow auth state to settle
      timeoutRef.current = setTimeout(() => {
        if (!user && !hasTriggeredAuth.current && !loading) {
          console.log('ProtectedRoute: Triggering auth required')
          hasTriggeredAuth.current = true
          setShowAuthRequired(true)
          onAuthRequired()
        }
      }, 500) // Increased delay to allow auth state to settle
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [loading, user, onAuthRequired])

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading...</p>
          <p className="text-gray-500 text-sm mt-2">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // If user is authenticated, render children
  if (user) {
    return <>{children}</>
  }

  // Show auth required state only after we've triggered the auth modal
  if (showAuthRequired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Authentication required</p>
          <p className="text-gray-500 text-sm mt-2">Please sign in to continue...</p>
        </div>
      </div>
    )
  }

  // Default loading state while waiting for auth check
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-300">Checking authentication...</p>
      </div>
    </div>
  )
}

export default ProtectedRoute