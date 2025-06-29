import React, { useState, useEffect } from 'react'
import { X, Mail, Lock, User, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'signin' | 'signup'
  onModeChange: (mode: 'signin' | 'signup') => void
  onSuccess?: () => void
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, mode, onModeChange, onSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { signIn, signUp } = useAuth()

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  const parseSupabaseError = (error: any): string => {
    // Handle AuthApiError objects specifically
    if (error && error.__isAuthError && error.name === 'AuthApiError') {
      return handleAuthApiError(error)
    }

    // Handle errors with body property containing JSON
    if (error.body && typeof error.body === 'string') {
      try {
        const parsedBody = JSON.parse(error.body)
        if (parsedBody.code || parsedBody.message) {
          return handleErrorCode(parsedBody.code, parsedBody.message)
        }
      } catch (parseError) {
        // If body parsing fails, continue with other methods
        console.warn('Failed to parse error body:', parseError)
      }
    }

    // Handle errors with direct code property
    if (error.code) {
      return handleErrorCode(error.code, error.message)
    }

    // Handle errors with message property
    if (error.message) {
      return handleErrorMessage(error.message)
    }

    // Handle string errors
    if (typeof error === 'string') {
      return handleErrorMessage(error)
    }

    // Fallback for unknown error formats
    return 'An unexpected error occurred. Please try again.'
  }

  const handleAuthApiError = (error: any): string => {
    // Extract the core message from AuthApiError
    const message = error.message || ''
    
    // Check for specific patterns in the message
    if (message.toLowerCase().includes('user already registered')) {
      return 'An account with this email already exists. Please sign in instead.'
    }
    
    if (message.toLowerCase().includes('invalid login credentials')) {
      return 'Invalid email or password. Please double-check your credentials and try again.'
    }
    
    if (message.toLowerCase().includes('email not confirmed')) {
      return 'Please check your email and click the confirmation link before signing in.'
    }
    
    // Check the status code for additional context
    if (error.status === 422) {
      return 'An account with this email already exists. Please sign in instead.'
    }
    
    if (error.status === 400) {
      return 'Invalid request. Please check your email and password format.'
    }
    
    if (error.status === 401) {
      return 'Invalid email or password. Please double-check your credentials and try again.'
    }
    
    // Return the original message if no specific pattern matches
    return message || 'Authentication failed. Please try again.'
  }

  const handleErrorCode = (code: string, message?: string): string => {
    switch (code) {
      case 'user_already_exists':
        return 'An account with this email already exists. Please sign in instead.'
      case 'invalid_credentials':
      case 'invalid_login_credentials':
        return 'Invalid email or password. Please double-check your credentials and try again.'
      case 'email_not_confirmed':
        return 'Please check your email and click the confirmation link before signing in.'
      case 'weak_password':
        return 'Password must be at least 6 characters long and contain a mix of letters and numbers.'
      case 'signup_disabled':
        return 'New account registration is currently disabled. Please contact support.'
      case 'email_rate_limit_exceeded':
        return 'Too many requests. Please wait a moment before trying again.'
      case 'invalid_email':
        return 'Please enter a valid email address.'
      case 'password_too_short':
        return 'Password must be at least 6 characters long.'
      default:
        return message || 'An error occurred during authentication. Please try again.'
    }
  }

  const handleErrorMessage = (message: string): string => {
    const lowerMessage = message.toLowerCase()
    
    // Handle "user already registered" variations
    if (lowerMessage.includes('user already registered') || 
        lowerMessage.includes('user_already_exists') ||
        lowerMessage.includes('user already exists')) {
      return 'An account with this email already exists. Please sign in instead.'
    }
    
    // Handle invalid credentials variations
    if (lowerMessage.includes('invalid login credentials') || 
        lowerMessage.includes('invalid_credentials') ||
        lowerMessage.includes('invalid credentials')) {
      return 'Invalid email or password. Please double-check your credentials and try again.'
    }
    
    // Handle email confirmation
    if (lowerMessage.includes('email not confirmed') ||
        lowerMessage.includes('email_not_confirmed')) {
      return 'Please check your email and click the confirmation link before signing in.'
    }
    
    // Handle password requirements
    if (lowerMessage.includes('password should be at least') ||
        lowerMessage.includes('password must be at least')) {
      return 'Password must be at least 6 characters long.'
    }
    
    // Handle network/connection errors
    if (lowerMessage.includes('supabase request failed') ||
        lowerMessage.includes('failed to fetch') ||
        lowerMessage.includes('network error')) {
      return 'Unable to connect to our servers. Please check your internet connection and try again.'
    }
    
    // Handle timeout errors
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return 'Request timed out. Please try again.'
    }
    
    // Handle rate limiting
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
      return 'Too many requests. Please wait a moment before trying again.'
    }
    
    // Handle server errors
    if (lowerMessage.includes('internal server error') || lowerMessage.includes('500')) {
      return 'Server error. Please try again in a moment.'
    }
    
    // Return a cleaned version of the original message if no specific pattern is matched
    // Remove technical details but keep the core message
    if (message.length > 100) {
      return 'Authentication failed. Please check your credentials and try again.'
    }
    
    return message
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submission
    if (loading) {
      console.log('⚠️ AuthModal: Form submission already in progress, ignoring...')
      return
    }
    
    console.log('🔑 AuthModal: Form submitted for', mode, 'with email:', email)
    
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'signup') {
        console.log('📝 AuthModal: Attempting sign up...')
        const { error } = await signUp(email, password)
        if (error) throw error
        setSuccess('Account created successfully! You can now sign in.')
        // Auto switch to signin mode after successful signup
        setTimeout(() => {
          onModeChange('signin')
          setSuccess('')
        }, 2000)
      } else {
        console.log('🔐 AuthModal: Attempting sign in...')
        const { error } = await signIn(email, password)
        if (error) {
          console.error('❌ AuthModal: Sign in failed:', error)
          throw error
        }
        
        console.log('✅ AuthModal: Sign in successful, closing modal and calling success callback')
        
        // Prevent double-submission by immediately setting loading state
        setLoading(false)
        
        // Close modal immediately
        onClose()
        
        // Call success callback after a short delay to ensure modal is closed
        setTimeout(() => {
          onSuccess?.()
        }, 100)
      }
    } catch (error: any) {
      console.error('❌ AuthModal: Authentication error:', error)
      
      // Use the enhanced error parsing
      const userFriendlyMessage = parseSupabaseError(error)
      setError(userFriendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setError('')
    setSuccess('')
    setLoading(false)
  }

  const handleModeChange = (newMode: 'signin' | 'signup') => {
    resetForm()
    onModeChange(newMode)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-md relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          disabled={loading}
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-400">
            {mode === 'signup' 
              ? 'Start prototyping your ideas today' 
              : 'Sign in to continue your projects'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 disabled:opacity-50"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 disabled:opacity-50"
                placeholder="Enter your password"
                required
                minLength={6}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {mode === 'signup' ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              mode === 'signup' ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => handleModeChange(mode === 'signup' ? 'signin' : 'signup')}
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {mode === 'signup' ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        {mode === 'signup' && (
          <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <h4 className="text-cyan-400 font-medium mb-2">Free Tier Includes:</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• 2 design generations per month</li>
              <li>• 5 design refinement chats</li>
              <li>• Full access to all features</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthModal