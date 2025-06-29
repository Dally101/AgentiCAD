import React, { useState } from 'react';
import { Send, Lightbulb, Mic, Image, AlertCircle } from 'lucide-react';
import { useUsage } from '../../hooks/useUsage';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface IdeaInputProps {
  userIdea: string;
  setUserIdea: (idea: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

const IdeaInput: React.FC<IdeaInputProps> = ({ userIdea, setUserIdea, onNext }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { canUseDesign, incrementDesignUsage } = useUsage();
  const { user } = useAuth();

  const [suggestions] = useState([
    "A foldable chair with a built-in cup holder",
    "A smart water bottle that tracks hydration",
    "A phone stand with wireless charging base",
    "A modular desk organizer system",
    "A portable laptop cooling pad with fans"
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdea.trim() || !user) return;

    // Check if user can create more designs
    if (!canUseDesign()) {
      setShowUpgradePrompt(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Increment design usage
      const canProceed = await incrementDesignUsage();
      
      if (!canProceed) {
        setShowUpgradePrompt(true);
        return;
      }

      // Save design session to database
      const { data, error } = await supabase
        .from('design_sessions')
        .insert({
          user_id: user.id,
          design_data: {
            idea: userIdea,
            step: 'idea_input',
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Store session ID for later use
      sessionStorage.setItem('currentDesignSessionId', data.id);
      
      onNext();
    } catch (error) {
      console.error('Error saving design session:', error);
      // Still allow progression even if save fails
      onNext();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setUserIdea(suggestion);
  };

  if (showUpgradePrompt) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Design Limit Reached</h3>
          <p className="text-gray-300 text-lg mb-8 leading-relaxed">
            You've reached your monthly design limit. Upgrade your plan to create more designs and unlock additional features.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowUpgradePrompt(false)}
              className="px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => {
                // This would trigger the subscription modal in the parent component
                window.dispatchEvent(new CustomEvent('openSubscriptionModal'));
              }}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Lightbulb className="w-8 h-8 text-yellow-400" />
          <h3 className="text-2xl font-bold text-white">What's Your Idea?</h3>
        </div>
        
        <p className="text-gray-300 mb-8 text-lg leading-relaxed">
          Describe your hardware product idea in simple terms. Don't worry about technical details - 
          our AI will handle the complexity. The more specific you are, the better we can help bring your vision to life.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <textarea
              value={userIdea}
              onChange={(e) => setUserIdea(e.target.value)}
              placeholder="Example: I want to create a foldable chair that's lightweight and has a cup holder. It should be easy to carry and set up quickly for outdoor activities..."
              className="w-full h-40 p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300"
              maxLength={1000}
              disabled={isSubmitting}
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsListening(!isListening)}
                disabled={isSubmitting}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  isListening ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-400 hover:text-white'
                } disabled:opacity-50`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="p-2 rounded-lg bg-white/10 text-gray-400 hover:text-white transition-all duration-300 disabled:opacity-50"
              >
                <Image className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">
              {userIdea.length}/1000 characters
            </span>
            <button
              type="submit"
              disabled={!userIdea.trim() || isSubmitting}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                userIdea.trim() && !isSubmitting
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-600 hover:to-purple-600 hover:scale-105'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Design
                  <Send className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Suggestions */}
        <div className="mt-12">
          <h4 className="text-lg font-semibold text-white mb-4">Need Inspiration? Try These Ideas:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isSubmitting}
                className="p-4 text-left rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/30 hover:bg-white/10 transition-all duration-300 text-gray-300 hover:text-white disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdeaInput;