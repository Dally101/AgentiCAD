import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, MessageCircle, Send, Eye, Wrench, Users, Search, Download, Share2, CheckCircle, Hand } from 'lucide-react';

interface CompletionCelebrationProps {
  onBack: () => void;
  onStepClick: (stepIndex: number) => void;
  completedSteps: boolean[];
  steps: Array<{
    id: string;
    title: string;
    icon: React.ReactNode;
    component: React.ComponentType<any>;
  }>;
}

const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({ 
  onBack, 
  onStepClick, 
  completedSteps, 
  steps 
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      type: 'ai',
      message: "🎉 Congratulations! You've successfully completed your prototype journey! I'm here to help you take the next steps. What would you like to know more about?"
    }
  ]);

  useEffect(() => {
    // Hide confetti after 5 seconds
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const quickActions = [
    { icon: <Eye className="w-4 h-4" />, text: "Review my CAD model", action: "cad" },
    { icon: <Users className="w-4 h-4" />, text: "Find more manufacturers", action: "manufacturers" },
    { icon: <Search className="w-4 h-4" />, text: "Patent guidance", action: "patents" },
    { icon: <Download className="w-4 h-4" />, text: "Download files", action: "download" },
    { icon: <Share2 className="w-4 h-4" />, text: "Share my design", action: "share" },
    { icon: <Wrench className="w-4 h-4" />, text: "Make design changes", action: "iterate" }
  ];

  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;

    const newHistory = [...chatHistory, { type: 'user', message }];
    setChatHistory(newHistory);
    setChatMessage('');

    // Simulate AI response based on message content
    setTimeout(() => {
      let aiResponse = '';
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('cad') || lowerMessage.includes('model') || lowerMessage.includes('design')) {
        aiResponse = "I can help you review your CAD model! Your foldable chair design is ready for download in multiple formats (STL, OBJ, STEP). Would you like me to show you the technical specifications or help you make modifications?";
      } else if (lowerMessage.includes('manufacturer') || lowerMessage.includes('production') || lowerMessage.includes('quote')) {
        aiResponse = "Great question! Based on your design, I recommend reaching out to TechForge Manufacturing for precision work, or Global Prototype Solutions for cost-effective production. Would you like me to help you prepare a detailed quote request?";
      } else if (lowerMessage.includes('patent') || lowerMessage.includes('legal') || lowerMessage.includes('protect')) {
        aiResponse = "For patent protection, I recommend consulting with a patent attorney. Your design has medium risk due to similar existing patents, but your unique folding mechanism could be differentiating. Would you like me to provide a list of patent attorneys or help you document your unique features?";
      } else if (lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('budget')) {
        aiResponse = "Based on your design, manufacturing costs range from $65-$140 per unit depending on materials and quantity. For 100 units in aluminum, expect around $85-$95 each. Would you like a detailed cost breakdown or help optimizing for lower costs?";
      } else if (lowerMessage.includes('timeline') || lowerMessage.includes('time') || lowerMessage.includes('when')) {
        aiResponse = "Your prototype timeline depends on the manufacturer: TechForge (2-3 weeks), Precision Parts Pro (1-2 weeks), or Global Prototype Solutions (3-4 weeks). This includes manufacturing and shipping. Would you like me to help expedite the process?";
      } else {
        aiResponse = "I'm here to help with any aspect of your prototype journey! I can assist with design modifications, manufacturing guidance, patent research, cost optimization, or technical questions. What specific area would you like to explore?";
      }

      setChatHistory([...newHistory, { type: 'ai', message: aiResponse }]);
    }, 1000);
  };

  const handleQuickAction = (action: string) => {
    const actionMessages = {
      cad: "Show me my CAD model details and download options",
      manufacturers: "Help me find the best manufacturers for my project",
      patents: "Guide me through patent protection for my design",
      download: "What files can I download for my prototype?",
      share: "How can I share my design with others?",
      iterate: "I want to make changes to my design"
    };

    handleSendMessage(actionMessages[action as keyof typeof actionMessages]);
  };

  const handleStepNavigation = (stepIndex: number) => {
    onStepClick(stepIndex);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <div className={`w-2 h-2 rounded-full ${
                ['bg-cyan-400', 'bg-purple-400', 'bg-yellow-400', 'bg-green-400', 'bg-pink-400'][Math.floor(Math.random() * 5)]
              }`}></div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </button>
          <div className="flex items-center gap-2 text-white font-semibold">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Journey Complete!
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Celebration Header */}
          <div className="text-center mb-12">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              🎉 Congratulations! 🎉
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-6">
              You've successfully completed your prototype journey with AgentiCAD!
            </p>
            <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 rounded-2xl p-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-white mb-2">Your Foldable Chair Prototype</h3>
              <p className="text-gray-300">
                From idea to manufacturable design in 6 simple steps. Your prototype is ready for production!
              </p>
            </div>
          </div>

          {/* AI Assistant Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <MessageCircle className="w-6 h-6 text-cyan-400" />
                  <h3 className="text-xl font-bold text-white">Your AgentiCAD Assistant</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
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
                </div>

                {/* Input Form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(chatMessage);
                  }} 
                  className="flex gap-3"
                >
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask me anything about your prototype..."
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300"
                  />
                  <button
                    type="submit"
                    disabled={!chatMessage.trim()}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      chatMessage.trim()
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-600 hover:to-purple-600'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>

                {/* Quick Actions */}
                <div className="mt-6">
                  <p className="text-sm text-gray-400 mb-3">Quick actions:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickAction(action.action)}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:border-cyan-400/30 transition-all duration-300"
                      >
                        {action.icon}
                        {action.text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Panel */}
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Journey Summary</h3>
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <button
                      key={step.id}
                      onClick={() => handleStepNavigation(index)}
                      className="w-full flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-300 group-hover:text-white transition-colors text-left">
                        {step.title}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Click any step above to review or make changes
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Next Steps</h3>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Request quotes from manufacturers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Consider patent protection</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Download CAD files for production</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Share your design with stakeholders</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 rounded-2xl p-6 text-center">
                <h4 className="font-semibold text-white mb-2">Ready for Production!</h4>
                <p className="text-sm text-gray-300 mb-4">
                  Your prototype is manufacturable and ready for the next phase.
                </p>
                <div className="text-2xl">🚀</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompletionCelebration;