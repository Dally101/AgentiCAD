import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, MessageCircle, Eye, Wrench, Users, Search, CheckCircle, Hand, AlertCircle, Lock } from 'lucide-react';
import IdeaInput from './steps/IdeaInput';
import CADViewer from './steps/CADViewer';
import ARVisualization from './steps/ARVisualization';
import DesignIteration from './steps/DesignIteration';
import ManufacturingConnect from './steps/ManufacturingConnect';
import PatentSearch from './steps/PatentSearch';
import CompletionCelebration from './CompletionCelebration';

interface ProcessWizardProps {
  onBack: () => void;
}

const ProcessWizard: React.FC<ProcessWizardProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userIdea, setUserIdea] = useState('');
  const [cadModel, setCadModel] = useState<any>(null);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false, false, false]);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [clickedLockedStep, setClickedLockedStep] = useState<number | null>(null);

  const steps = [
    { id: 'idea', title: 'Describe Idea', icon: <MessageCircle className="w-5 h-5" />, component: IdeaInput },
    { id: 'cad', title: 'View CAD Model', icon: <Eye className="w-5 h-5" />, component: CADViewer },
    { id: 'ar', title: 'AR Visualization', icon: <Hand className="w-5 h-5" />, component: ARVisualization },
    { id: 'iterate', title: 'Refine Design', icon: <Wrench className="w-5 h-5" />, component: DesignIteration },
    { id: 'manufacture', title: 'Find Manufacturers', icon: <Users className="w-5 h-5" />, component: ManufacturingConnect },
    { id: 'patent', title: 'Patent Search', icon: <Search className="w-5 h-5" />, component: PatentSearch }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      // Mark current step as completed
      const newCompletedSteps = [...completedSteps];
      newCompletedSteps[currentStep] = true;
      setCompletedSteps(newCompletedSteps);
      setCurrentStep(currentStep + 1);
    } else {
      // Complete the journey
      const newCompletedSteps = [...completedSteps];
      newCompletedSteps[currentStep] = true;
      setCompletedSteps(newCompletedSteps);
      setShowCompletion(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    const isAccessible = stepIndex <= currentStep || completedSteps[stepIndex];
    
    if (isAccessible) {
      setCurrentStep(stepIndex);
      setShowAlert(false);
      setShowCompletion(false); // Allow returning from completion page
      setClickedLockedStep(null);
    } else {
      // Show clicked locked step feedback
      setClickedLockedStep(stepIndex);
      setShowAlert(true);
      setTimeout(() => {
        setShowAlert(false);
        setClickedLockedStep(null);
      }, 3000);
    }
  };

  const handleStepHover = (stepIndex: number) => {
    const isAccessible = stepIndex <= currentStep || completedSteps[stepIndex];
    if (!isAccessible) {
      setHoveredStep(stepIndex);
    } else {
      setHoveredStep(stepIndex);
    }
  };

  const getTooltipText = (stepIndex: number) => {
    if (completedSteps[stepIndex] || stepIndex <= currentStep) {
      return steps[stepIndex].title;
    } else {
      return "Complete all preceding steps to access this page";
    }
  };

  const isStepAccessible = (stepIndex: number) => {
    return stepIndex <= currentStep || completedSteps[stepIndex];
  };

  if (showCompletion) {
    return (
      <CompletionCelebration 
        onBack={onBack} 
        onStepClick={handleStepClick}
        completedSteps={completedSteps}
        steps={steps}
      />
    );
  }

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen">
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
          <div className="text-white font-semibold">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>
      </header>

      {/* Enhanced Alert for restricted access */}
      {showAlert && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/95 backdrop-blur-sm text-white px-6 py-4 rounded-xl shadow-2xl border border-red-400/30 animate-pulse">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5" />
            <div>
              <div className="font-semibold">Access Restricted</div>
              <div className="text-sm opacity-90">Complete all preceding steps to access this page</div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center relative">
                <div className="relative">
                  <button
                    onClick={() => handleStepClick(index)}
                    onMouseEnter={() => handleStepHover(index)}
                    onMouseLeave={() => setHoveredStep(null)}
                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 relative ${
                      completedSteps[index]
                        ? 'bg-green-500 border-green-500 text-white cursor-pointer hover:scale-110 shadow-lg shadow-green-500/25'
                        : index === currentStep
                        ? 'bg-cyan-500 border-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                        : isStepAccessible(index)
                        ? 'border-gray-400 text-gray-400 cursor-pointer hover:border-gray-300 hover:text-gray-300 hover:scale-105'
                        : 'border-gray-600 text-gray-500 cursor-not-allowed bg-gray-800/50 backdrop-blur-sm'
                    } ${
                      clickedLockedStep === index ? 'animate-shake border-red-400 bg-red-500/20' : ''
                    }`}
                    disabled={false} // Remove disabled to allow click handling
                  >
                    {completedSteps[index] ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : !isStepAccessible(index) ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      step.icon
                    )}
                    
                    {/* Lock overlay for inaccessible steps */}
                    {!isStepAccessible(index) && !completedSteps[index] && index !== currentStep && (
                      <div className="absolute inset-0 bg-gray-900/30 rounded-full flex items-center justify-center">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </button>
                  
                  {/* Enhanced Tooltip */}
                  {hoveredStep === index && (
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 rounded-xl shadow-2xl text-sm whitespace-nowrap z-20 border ${
                      isStepAccessible(index)
                        ? 'bg-gray-800 text-white border-gray-600'
                        : 'bg-red-500 text-white border-red-400 animate-pulse'
                    }`}>
                      <div className="font-medium">
                        {getTooltipText(index)}
                      </div>
                      {!isStepAccessible(index) && (
                        <div className="text-xs mt-1 opacity-90">
                          🔒 Complete steps {Array.from({length: index}, (_, i) => i + 1).filter(i => !completedSteps[i - 1] && i - 1 !== currentStep).join(', ')} first
                        </div>
                      )}
                      <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                        isStepAccessible(index) ? 'border-t-gray-800' : 'border-t-red-500'
                      }`}></div>
                    </div>
                  )}
                  
                  {/* Step title below */}
                  <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-xs text-center w-20 ${
                    completedSteps[index] 
                      ? 'text-green-400 font-medium' 
                      : index === currentStep 
                      ? 'text-cyan-400 font-medium' 
                      : isStepAccessible(index)
                      ? 'text-gray-300'
                      : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-1 mx-4 transition-all duration-500 ${
                      completedSteps[index] 
                        ? 'bg-green-500 shadow-sm shadow-green-500/50' 
                        : index < currentStep 
                        ? 'bg-cyan-500 shadow-sm shadow-cyan-500/50' 
                        : 'bg-gray-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center mb-8 mt-12">
            <h2 className="text-3xl font-bold text-white mb-2">{steps[currentStep].title}</h2>
            <p className="text-gray-300">
              {currentStep === 0 && "Tell us about your hardware idea in your own words"}
              {currentStep === 1 && "Review the AI-generated 3D model of your concept"}
              {currentStep === 2 && "See how your prototype looks in the real world"}
              {currentStep === 3 && "Make adjustments and improvements to your design"}
              {currentStep === 4 && "Connect with manufacturers to bring your idea to life"}
              {currentStep === 5 && "Ensure your idea is unique and patentable"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <CurrentStepComponent
            userIdea={userIdea}
            setUserIdea={setUserIdea}
            cadModel={cadModel}
            setCadModel={setCadModel}
            onNext={handleNext}
            onPrevious={handlePrevious}
            canGoNext={currentStep < steps.length - 1}
            canGoPrevious={currentStep > 0}
          />
        </div>
      </main>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm border-t border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`flex items-center px-6 py-2 rounded-lg transition-all duration-300 ${
              currentStep === 0
                ? 'text-gray-500 cursor-not-allowed'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Previous
          </button>
          <button
            onClick={handleNext}
            className="flex items-center px-6 py-2 rounded-lg transition-all duration-300 bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-600 hover:to-purple-600"
          >
            {currentStep === steps.length - 1 ? 'Complete Journey' : 'Next'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcessWizard;