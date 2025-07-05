import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, Zap, Eye, Users, Search, ArrowRight, User, LogOut, ChevronDown, Crown } from 'lucide-react';
import LandingPage from './components/LandingPage';
import ProcessWizard from './components/ProcessWizard';
import AuthModal from './components/AuthModal';
import SubscriptionModal from './components/SubscriptionModal';
import SuccessPage from './components/SuccessPage';
import CancelPage from './components/CancelPage';
import UsageIndicator from './components/UsageIndicator';
import ProtectedRoute from './components/ProtectedRoute';
import BoltBadge from './components/BoltBadge';

import { useAuth } from './hooks/useAuth';
import { getProductByTier } from './stripe-config';
import { supabase } from './lib/supabase';

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'wizard' | 'success' | 'cancel'>('landing');
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'signin' | 'signup' }>({
    isOpen: false,
    mode: 'signin'
  });
  const [subscriptionModal, setSubscriptionModal] = useState(false);
  const [authRequested, setAuthRequested] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showUsageDropdown, setShowUsageDropdown] = useState(false);
  
  const { user, profile, signOut, loading, refreshProfile, forceRefreshProfile, ensureFreshAuth } = useAuth();

  // Debug: Track user state changes to ensure UI updates
  useEffect(() => {
    console.log('🎯 App: User state changed:', user ? `✅ ${user.email}` : '❌ null');
  }, [user]);

  // Debug: Track profile state changes  
  useEffect(() => {
    console.log('👤 App: Profile state changed:', profile ? `✅ ${profile.email} (${profile.subscription_tier})` : '❌ null');
  }, [profile]);

  // Memoize callback to prevent re-renders
  const handleUpgradeClick = React.useCallback(() => {
    setSubscriptionModal(true);
    setShowUsageDropdown(false); // Close dropdown when upgrade is clicked
  }, []);

  // Navigation logic
  useEffect(() => {
    if (isNavigating) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get('success') === 'true') {
      setCurrentView('success');
    } else if (url.searchParams.get('canceled') === 'true') {
      setCurrentView('cancel');
    }
  }, [isNavigating]);

  // Handle OAuth callback (Google, Apple, Microsoft sign-in redirect)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const url = new URL(window.location.href);
      
      // Check for OAuth hash fragments or query parameters (all providers)
      const hasOAuthCallback = url.hash.includes('access_token') || 
                              url.hash.includes('id_token') ||
                              url.searchParams.get('code') ||
                              url.searchParams.get('state');
      
      if (hasOAuthCallback) {
        console.log('🔐 OAuth callback detected (Google/Apple/Microsoft), processing...');
        
        // Close any open auth modal since OAuth is completing
        setAuthModal({ isOpen: false, mode: 'signin' });
        
        // Enhanced session detection with longer retry period for all OAuth providers
        let sessionCheckAttempts = 0;
        const maxAttempts = 15; // Increased for slower providers
        
        const checkForSession = async (): Promise<boolean> => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              console.log('✅ OAuth session established:', session.user.email, 'Provider:', session.user.app_metadata?.provider);
              return true;
            }
            return false;
          } catch (error) {
            console.error('Error checking session:', error);
            return false;
          }
        };
        
        const waitForSession = async () => {
          // First, wait a bit for Supabase to process the OAuth callback
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          while (sessionCheckAttempts < maxAttempts) {
            sessionCheckAttempts++;
            console.log(`🔍 Checking for OAuth session (attempt ${sessionCheckAttempts}/${maxAttempts})...`);
            
            const hasSession = await checkForSession();
            if (hasSession) {
              // Session established successfully
              console.log('🎉 OAuth session confirmed, proceeding...');
              break;
            }
            
            // Progressive delay - start fast, then slow down
            const delay = sessionCheckAttempts < 5 ? 500 : 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          // Clean up URL regardless of session status
          const cleanUrl = new URL(window.location.href);
          cleanUrl.hash = '';
          cleanUrl.searchParams.delete('code');
          cleanUrl.searchParams.delete('state');
          cleanUrl.searchParams.delete('session_state'); // For Microsoft
          window.history.replaceState({}, '', cleanUrl.toString());
          
          // If user was trying to access the wizard, navigate them there after OAuth completes
          if (authRequested) {
            console.log('🚀 OAuth completed, user requested wizard access, navigating...');
            setIsNavigating(true);
            setCurrentView('wizard');
            setAuthRequested(false);
          }
        };
        
        waitForSession();
      }
    };

    handleOAuthCallback();
  }, [authRequested]);

  // Simplified auth state change handler - only handle navigation logic
  useEffect(() => {
    if (authRequested && user) {
      console.log('✅ Auth request fulfilled, clearing request and closing modal');
      setAuthRequested(false);
      setAuthModal({ isOpen: false, mode: 'signin' });
    }
  }, [user, authRequested]);

  // Handle custom events for opening modals
  useEffect(() => {
    const handleOpenSubscriptionModal = () => {
      setSubscriptionModal(true);
    };

    window.addEventListener('openSubscriptionModal', handleOpenSubscriptionModal);
    return () => {
      window.removeEventListener('openSubscriptionModal', handleOpenSubscriptionModal);
    };
  }, []);

  const handleGetStarted = () => {
    if (!user) {
      setAuthRequested(true);
      setAuthModal({ isOpen: true, mode: 'signup' });
    } else {
      setIsNavigating(true);
      setCurrentView('wizard');
    }
  };

  const handleSignIn = () => {
    setAuthModal({ isOpen: true, mode: 'signin' });
  };

  const handleSignUp = () => {
    setAuthModal({ isOpen: true, mode: 'signup' });
  };

  const handleAuthSuccess = async () => {
    console.log('✅ App: Auth success callback triggered');
      
    // Close modal immediately
    setAuthModal({ isOpen: false, mode: 'signin' });
    
    // Handle navigation if user requested auth
    if (authRequested) {
      console.log('🚀 App: User requested auth, navigating to wizard');
      setIsNavigating(true);
      setCurrentView('wizard');
      setAuthRequested(false);
    }
  };

  const handleAuthClose = () => {
    console.log('🚪 App: Closing auth modal via handleAuthClose');
    setAuthModal({ isOpen: false, mode: 'signin' });
    setAuthRequested(false);
  };

  const handleBackToLanding = () => {
    setIsNavigating(true);
      setCurrentView('landing');
      
    // Clear URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('success');
    url.searchParams.delete('canceled');
    window.history.replaceState({}, '', url.toString());
  };

  const handleSignOut = async () => {
    if (isSigningOut) {
      console.log('⚠️ Sign out already in progress, ignoring...');
      return;
    }
    
    try {
      setIsSigningOut(true);
      setShowUsageDropdown(false); // Close dropdown immediately
      
      await signOut();
      
      // Ensure we navigate back to landing page
      setCurrentView('landing');
      setIsNavigating(false);
      
      // Clear any URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('canceled');
      window.history.replaceState({}, '', url.toString());
      
    } catch (error) {
      console.error('❌ App: Error signing out:', error);
      // Even if sign out fails, clear local state
      setCurrentView('landing');
    }
    
    // Always clear the signing out state, regardless of success/failure
    setIsSigningOut(false);
  };

  const handleSubscriptionModalClose = async () => {
    setSubscriptionModal(false);
    console.log('🔄 SubscriptionModal closed, forcing profile refresh...');
    await forceRefreshProfile();
  };

  const getSubscriptionDisplayName = (tier: string) => {
    const product = getProductByTier(tier);
    if (product) {
      return product.name.split(' ')[0]; // Returns 'Pro' or 'Plus'
    }
    return 'Free';
  };

  // Reset sign out state when user changes (fix stuck spinner)
  useEffect(() => {
    if (user) {
      setIsSigningOut(false); // Clear sign out state when user is present
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-profile-dropdown')) {
        setShowUsageDropdown(false);
      }
    };

    if (showUsageDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
  }
  }, [showUsageDropdown]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header with Auth - Only show on landing page */}
      {currentView === 'landing' && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-4">
          {user ? (
            <div 
              className="relative user-profile-dropdown"
              onMouseLeave={() => {
                // Delay closing to allow moving to dropdown
                setTimeout(() => {
                  const profileHover = document.querySelector('.user-profile-dropdown:hover');
                  if (!profileHover) {
                    setShowUsageDropdown(false);
                  }
                }, 200);
              }}
            >
              <div 
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 cursor-pointer hover:bg-white/15 transition-all duration-300"
                                 onClick={(e) => {
                   e.stopPropagation();
                   setShowUsageDropdown(!showUsageDropdown);
                 }}
                 onMouseEnter={() => setShowUsageDropdown(true)}
              >
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  <span className="text-white text-sm max-w-32 truncate">{user?.email}</span>
                  {profile && profile.subscription_tier !== 'pro' && (
                    <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full capitalize">
                      {getSubscriptionDisplayName(profile.subscription_tier)}
                    </span>
                  )}
                  {!profile && (
                    <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">
                      Loading...
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showUsageDropdown ? 'rotate-180' : ''}`} />
                {profile?.subscription_tier === 'pro' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubscriptionModal(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-full hover:from-yellow-500/30 hover:to-amber-500/30 hover:border-yellow-500/40 transition-all duration-300"
                    title="Manage subscription"
                  >
                    <Crown className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-yellow-400 font-medium">Pro</span>
                  </button>
                ) : (
                <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubscriptionModal(true);
                    }}
                  className="text-xs bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-3 py-1 rounded-full hover:from-cyan-600 hover:to-purple-600 transition-all duration-300"
                >
                  {profile ? 'Upgrade' : 'Loading...'}
                </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSigningOut) {
                      handleSignOut();
                    }
                  }}
                  disabled={isSigningOut}
                  className={`text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 ${isSigningOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isSigningOut ? "Signing out..." : "Sign Out"}
                >
                  <LogOut className={`w-5 h-5 ${isSigningOut ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Usage Dropdown */}
              {showUsageDropdown && (
                <div 
                  className="absolute top-full right-0 mt-2 w-80 z-[100]"
                  onMouseEnter={() => setShowUsageDropdown(true)}
                  onMouseLeave={() => setShowUsageDropdown(false)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="transform transition-all duration-300 ease-out animate-in slide-in-from-top-2 fade-in">
                    <UsageIndicator onUpgradeClick={handleUpgradeClick} />
                    {/* Debug content - can be removed once everything works perfectly */}
                    {/* 
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mt-2">
                      <div className="text-white text-sm">
                        🔍 Debug: Dropdown is visible
                        <br />
                        showUsageDropdown: {showUsageDropdown.toString()}
                      </div>
                    </div>
                    */}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSignIn}
                className="text-white hover:text-cyan-400 transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
              >
                Sign In
              </button>
              <button
                onClick={handleSignUp}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-6 py-2 rounded-lg font-semibold hover:from-cyan-600 hover:to-purple-600 transition-all duration-300"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      {currentView === 'landing' && (
        <LandingPage onGetStarted={handleGetStarted} />
      )}

      {currentView === 'wizard' && (
        <ProtectedRoute onAuthRequired={() => setAuthModal({ isOpen: true, mode: 'signin' })}>
          <ProcessWizard onBack={handleBackToLanding} />
        </ProtectedRoute>
      )}

      {currentView === 'success' && (
        <SuccessPage 
          user={user}
          profile={profile}
          refreshProfile={refreshProfile}
          forceRefreshProfile={forceRefreshProfile}
        />
      )}

      {currentView === 'cancel' && (
        <CancelPage />
      )}

      {/* Modals */}
      <AuthModal
        isOpen={authModal.isOpen}
        mode={authModal.mode}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
        onModeChange={(mode) => setAuthModal(prev => ({ ...prev, mode }))}
      />

      <SubscriptionModal
        isOpen={subscriptionModal}
        onClose={handleSubscriptionModalClose}
        user={user}
        profile={profile}
        ensureFreshAuth={ensureFreshAuth}
      />

      {/* Bolt Badge - Appears on all pages */}
      <BoltBadge />


    </div>
  );
}

export default App;