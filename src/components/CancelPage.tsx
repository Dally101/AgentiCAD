import React from 'react'
import { XCircle, ArrowLeft, RefreshCw, Home } from 'lucide-react'

const CancelPage: React.FC = () => {
  const handleBackToApp = () => {
    // Clear the URL and navigate to home
    window.history.replaceState({}, '', '/')
    // Force a page reload to ensure clean state
    window.location.reload()
  }

  const handleTryAgain = () => {
    // Clear the URL and navigate to home, then open subscription modal
    window.history.replaceState({}, '', '/')
    // Use a small delay to ensure URL is updated before opening modal
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('openSubscriptionModal'))
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 w-full max-w-md text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">Payment Cancelled</h1>
        
        <div className="mb-8">
          <p className="text-gray-300 mb-4">
            Your payment was cancelled. No charges were made to your account.
          </p>
          <p className="text-gray-400 text-sm">
            You can try again anytime or continue using the free plan with 2 design generations and 5 refinement chats per month.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleTryAgain}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          
          <button
            onClick={handleBackToApp}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <Home className="w-5 h-5" />
            Continue with Free Plan
          </button>
        </div>
      </div>
    </div>
  )
}

export default CancelPage