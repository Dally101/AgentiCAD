import React, { useState } from 'react';
import { MessageCircle, Send, Wand2, Undo, CheckCircle, AlertCircle } from 'lucide-react';
import { useUsage } from '../../hooks/useUsage';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface DesignIterationProps {
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

const DesignIteration: React.FC<DesignIterationProps> = ({ onNext }) => {
  const [feedback, setFeedback] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      type: 'ai',
      message: "I've created your foldable chair with a cup holder! What adjustments would you like to make?"
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { canUseRefine, incrementRefineUsage } = useUsage();
  const { user } = useAuth();

  const suggestions = [
    "Make the seat wider",
    "Add armrests",
    "Change material to carbon fiber",
    "Make it more compact when folded",
    "Add a small table attachment"
  ];

  const handleSendFeedback = async (message: string) => {
    if (!message.trim() || !user) return;

    // Check if user can use more refine chats
    if (!canUseRefine()) {
      setShowUpgradePrompt(true);
      return;
    }

    const newHistory = [...chatHistory, { type: 'user', message }];
    setChatHistory(newHistory);
    setFeedback('');
    setIsProcessing(true);

    try {
      // Increment refine usage
      const canProceed = await incrementRefineUsage();
      
      if (!canProceed) {
        setShowUpgradePrompt(true);
        setIsProcessing(false);
        return;
      }

      // Save refine chat to database
      const designSessionId = sessionStorage.getItem('currentDesignSessionId');
      
      if (designSessionId) {
        await supabase
          .from('refine_chats')
          .insert({
            user_id: user.id,
            design_session_id: designSessionId,
            message: message,
            response: null // Will be updated when AI responds
          });
      }

      // Simulate AI processing
      setTimeout(async () => {
        const aiResponse = `Great suggestion! I've updated the design to ${message.toLowerCase()}. The new model maintains structural integrity while incorporating your requested changes. Would you like to make any other adjustments?`;
        
        setChatHistory([...newHistory, { type: 'ai', message: aiResponse }]);
        
        // Update the database with AI response
        if (designSessionId) {
          const { data: lastChat } = await supabase
            .from('refine_chats')
            .select('id')
            .eq('user_id', user.id)
            .eq('design_session_id', designSessionId)
            .eq('message', message)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastChat) {
            await supabase
              .from('refine_chats')
              .update({ response: aiResponse })
              .eq('id', lastChat.id);
          }
        }
        
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving refine chat:', error);
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendFeedback(feedback);
  };

  if (showUpgradePrompt) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Refine Chat Limit Reached</h3>
          <p className="text-gray-300 text-lg mb-8 leading-relaxed">
            You've reached your monthly limit for design refinement chats. Upgrade your plan to continue refining your design.
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
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <MessageCircle className="w-6 h-6 text-cyan-400" />
              <h3 className="text-xl font-bold text-white">Design Conversation</h3>
            </div>

            {/* Chat History */}
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {chatHistory.map((chat, index) => (
                <div
                  key={index}
                  className={`flex ${chat.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      chat.type === 'user'
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                        : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    <p className="text-sm">{chat.message}</p>
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white/10 text-gray-300 px-4 py-3 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <span className="ml-2 text-sm">AI is updating your design...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell me what you'd like to change..."
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300"
                disabled={isProcessing}
              />
              <button
                type="submit"
                disabled={!feedback.trim() || isProcessing}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  feedback.trim() && !isProcessing
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-600 hover:to-purple-600'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>

            {/* Quick Suggestions */}
            <div className="mt-6">
              <p className="text-sm text-gray-400 mb-3">Quick suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendFeedback(suggestion)}
                    disabled={isProcessing}
                    className="px-3 py-1 text-sm bg-white/5 border border-white/10 rounded-full text-gray-300 hover:text-white hover:border-cyan-400/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Design Preview & Controls */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Updated Design</h3>
            
            {/* Mock updated 3D preview */}
            <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-white/10 flex items-center justify-center mb-4">
              <div className="w-24 h-32 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg shadow-2xl transform rotate-12">
                <div className="w-full h-full bg-white/10 rounded-lg"></div>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Design updated</span>
              </div>
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400">AI optimized</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Version History</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-cyan-500/20 border border-cyan-500/30 rounded-lg">
                <div>
                  <div className="text-white font-medium text-sm">Current</div>
                  <div className="text-cyan-400 text-xs">With wider seat</div>
                </div>
                <button className="p-1 text-cyan-400 hover:text-white transition-colors">
                  <CheckCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                <div>
                  <div className="text-gray-300 font-medium text-sm">Version 1</div>
                  <div className="text-gray-400 text-xs">Original design</div>
                </div>
                <button className="p-1 text-gray-400 hover:text-white transition-colors">
                  <Undo className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={onNext}
            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300"
          >
            Find Manufacturers
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesignIteration;