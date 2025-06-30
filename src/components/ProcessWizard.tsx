import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, MessageCircle, Eye, Wrench, Users, Search, CheckCircle, Hand, AlertCircle, Lock, Layers, Move3D } from 'lucide-react';
import MultimodalInputPanel from './MultimodalInputPanel';
import ModelViewer3D from './ModelViewer3D';
import ManufacturingConnect from './steps/ManufacturingConnect';
import PatentSearch from './steps/PatentSearch';
import CompletionCelebration from './CompletionCelebration';
import { architecturalAI } from '../services/architecturalAI';
import type { 
  MultimodalInput, 
  ArchitecturalModel, 
  GenerationRequest,
  GenerationResponse 
} from '../types/architectural';

interface ProcessWizardProps {
  onBack: () => void;
}

// Step 1: Multimodal Input Component
const MultimodalDesignInput: React.FC<{
  onComplete: (model: ArchitecturalModel) => void;
}> = ({ onComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleInputSubmit = async (input: MultimodalInput) => {
    setIsProcessing(true);
    setError(null);
    setProcessingSteps([]);

    try {
      const request: GenerationRequest = {
        inputs: input,
        preferences: {
          style: 'modern',
          units: 'metric',
          complexity: 'detailed'
        }
      };

      // Simulate processing steps
      setProcessingSteps(['Analyzing your product concept...']);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProcessingSteps(prev => [...prev, 'Generating product design...']);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setProcessingSteps(prev => [...prev, 'Creating 3D prototype...']);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProcessingSteps(prev => [...prev, 'Optimizing for manufacturing...']);
      
      const response: GenerationResponse = await architecturalAI.generateModel(request);
      
      setProcessingSteps(prev => [...prev, 'Complete!']);
      onComplete(response.model);
      
    } catch (error) {
      console.error('Error generating model:', error);
      setError('Failed to generate product model. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">Describe Your Product</h2>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Use any combination of text, voice, sketches, or photos to describe your product idea. 
          Our AI will transform your concept into a detailed 3D prototype.
        </p>
      </div>

      <MultimodalInputPanel 
        onSubmit={handleInputSubmit}
        isProcessing={isProcessing}
        className="max-w-6xl mx-auto"
      />

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <h3 className="text-xl font-semibold text-white mb-4">Generating Your Product Design</h3>
              <div className="space-y-2">
                {processingSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3 text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-gray-400">
                {processingSteps.length === 0 && "Starting product generation..."}
                {processingSteps.length > 0 && processingSteps.length < 4 && "This may take a few moments..."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-6xl mx-auto p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-400 font-medium">Product Generation Error</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
              <p className="text-gray-400 text-xs mt-2">
                💡 Tip: Try describing a simple product like "a wireless phone charger" or "a kitchen utensil holder"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Step 2: 3D Model Viewer Component
const ThreeDModelViewer: React.FC<{
  model: ArchitecturalModel | null;
  onModelUpdate?: (model: ArchitecturalModel) => void;
}> = ({ model, onModelUpdate }) => {
  const [viewMode, setViewMode] = useState<'3d' | 'ar'>('3d');

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">3D Prototype Viewer</h2>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Explore your product design in full 3D. Navigate around the prototype, 
          examine details, and prepare for AR visualization.
        </p>
      </div>

      <ModelViewer3D 
        model={model}
        onARModeToggle={(enabled) => setViewMode(enabled ? 'ar' : '3d')}
        onModelUpdate={onModelUpdate}
        className="max-w-6xl mx-auto h-[600px]"
      />

      {/* Model Information Panel */}
      {model && (
        <div className="max-w-6xl mx-auto bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            {model.productSpecs?.name || model.name}
          </h3>
          
          {/* Show AI-generated product specs if available */}
          {model.productSpecs ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-cyan-400 font-medium mb-2">Components ({model.productSpecs.components.length})</h4>
                <ul className="text-gray-300 space-y-2">
                  {model.productSpecs.components.map((component: any, index: number) => (
                    <li key={index} className="text-sm border-l-2 border-cyan-500/30 pl-3">
                      <div className="font-medium text-white">{component.name}</div>
                      <div className="text-xs text-gray-400">{component.material}</div>
                      <div className="text-xs">
                        {component.dimensions.width}×{component.dimensions.length}×{component.dimensions.height}cm
                      </div>
                      <div className="text-xs text-cyan-300">{component.function}</div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-cyan-400 font-medium mb-2">Manufacturing</h4>
                <ul className="text-gray-300 space-y-1">
                  <li className="text-sm"><span className="text-white">Method:</span> {model.productSpecs.manufacturing?.method}</li>
                  <li className="text-sm"><span className="text-white">Materials:</span> {model.productSpecs.manufacturing?.materials?.join(', ')}</li>
                  <li className="text-sm"><span className="text-white">Complexity:</span> {model.productSpecs.manufacturing?.complexity}</li>
                  <li className="text-sm"><span className="text-white">Cost:</span> {model.productSpecs.manufacturing?.estimated_cost}</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-cyan-400 font-medium mb-2">Specifications</h4>
                <ul className="text-gray-300 space-y-1">
                  <li className="text-sm"><span className="text-white">Weight:</span> {model.productSpecs.specifications?.weight}</li>
                  <li className="text-sm"><span className="text-white">Volume:</span> {model.productSpecs.totalVolume} cm³</li>
                  <li className="text-sm"><span className="text-white">Style:</span> {model.productSpecs.style}</li>
                  <li className="text-sm"><span className="text-white">Durability:</span> {model.productSpecs.specifications?.durability}</li>
                </ul>
                
                <div className="mt-4 space-y-2">
                  <button className="w-full px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm">
                    Export STL
                  </button>
                  <button className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm">
                    Send to Manufacturer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Fallback to old format if no product specs
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-cyan-400 font-medium mb-2">Components ({model.rooms.length})</h4>
                <ul className="text-gray-300 space-y-1">
                  {model.rooms.map(room => (
                    <li key={room.id} className="text-sm">
                      {room.name.replace('_', ' ')} - {room.dimensions.width}cm × {room.dimensions.length}cm × {room.dimensions.height}cm
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-cyan-400 font-medium mb-2">Specifications</h4>
                <ul className="text-gray-300 space-y-1">
                  <li className="text-sm">{model.rooms.length} components</li>
                  <li className="text-sm">{model.totalArea} cm³ volume</li>
                  <li className="text-sm capitalize">{model.style} style</li>
                  <li className="text-sm">Prototype ready</li>
                </ul>
              </div>
              <div>
                <h4 className="text-cyan-400 font-medium mb-2">Actions</h4>
                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm">
                    Export STL
                  </button>
                  <button className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm">
                    Send to Manufacturer
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Product Description */}
          {model.productSpecs?.description && (
            <div className="mt-6 pt-6 border-t border-white/20">
              <h4 className="text-cyan-400 font-medium mb-2">Product Description</h4>
              <p className="text-gray-300 text-sm leading-relaxed">{model.productSpecs.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Step 3: AR Visualization Component (Enhanced)
const ARVisualizationStep: React.FC<{
  model: ArchitecturalModel | null;
}> = ({ model }) => {
  const [arSupported, setArSupported] = useState(false);
  const [arActive, setArActive] = useState(false);

  React.useEffect(() => {
    // Check AR support
    const checkARSupport = async () => {
      if ('xr' in navigator) {
        try {
          const supported = await (navigator as any).xr.isSessionSupported('immersive-ar');
          setArSupported(supported);
        } catch (error) {
          setArSupported(false);
        }
      }
    };

    checkARSupport();
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">AR Product Preview</h2>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Experience your product in augmented reality. Place the prototype in your real environment 
          to see how it looks and fits in the real world.
        </p>
      </div>

      {!arSupported ? (
        <div className="max-w-4xl mx-auto bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">AR Not Available</h3>
          <p className="text-gray-300 mb-4">
            AR visualization requires a compatible device and browser. You can still view your model in 3D.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Return to 3D View
          </button>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <ModelViewer3D 
            model={model}
            onARModeToggle={setArActive}
            className="h-[600px]"
          />
          
          {/* AR Instructions */}
          <div className="mt-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">AR Instructions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-cyan-400 font-medium mb-2">Getting Started</h4>
                <ol className="text-gray-300 space-y-2 text-sm">
                  <li>1. Click "AR View" button above</li>
                  <li>2. Allow camera access when prompted</li>
                  <li>3. Point device at a flat surface</li>
                  <li>4. Tap to place your model</li>
                </ol>
              </div>
              <div>
                <h4 className="text-cyan-400 font-medium mb-2">Controls</h4>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Pinch to scale model size</li>
                  <li>• Tap to reposition model</li>
                  <li>• Walk around to explore</li>
                  <li>• Use measurement tools</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Step 4: Design Iteration Component (Enhanced)
const DesignIterationStep: React.FC<{
  model: ArchitecturalModel | null;
  onModelUpdate: (model: ArchitecturalModel) => void;
}> = ({ model, onModelUpdate }) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [modifications, setModifications] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleModification = async () => {
    if (!model || !modifications.trim()) return;

    setIsProcessing(true);
    try {
      // Simulate AI-powered modifications
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, this would call the AI service to modify the model
      const updatedModel = { ...model };
      if (selectedRoom) {
        const room = updatedModel.rooms.find(r => r.id === selectedRoom);
        if (room) {
          // Apply some mock modifications
          room.features = [...room.features, 'ai_enhanced'];
        }
      }
      
      onModelUpdate(updatedModel);
      setModifications('');
    } catch (error) {
      console.error('Error modifying model:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">Optimize Your Product</h2>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Perfect your product design with AI-powered optimization. 
          Improve manufacturability, reduce costs, and enhance functionality.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Model Viewer */}
        <div>
          <ModelViewer3D 
            model={model}
            className="h-[500px]"
          />
        </div>

        {/* Modification Panel */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Make Changes</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Focus Area (optional)
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="">Entire product</option>
                <option value="material">Material optimization</option>
                <option value="cost">Cost reduction</option>
                <option value="manufacturing">Manufacturing ease</option>
                <option value="functionality">Functionality</option>
                <option value="aesthetics">Aesthetics</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Describe Improvements
              </label>
              <textarea
                value={modifications}
                onChange={(e) => setModifications(e.target.value)}
                placeholder="e.g., 'Make it lighter', 'Add grip texture', 'Reduce material cost', 'Improve ergonomics'"
                className="w-full h-32 p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              onClick={handleModification}
              disabled={!modifications.trim() || isProcessing}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-cyan-600 hover:to-purple-600 transition-all"
            >
              {isProcessing ? 'Applying Changes...' : 'Apply Modifications'}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <h4 className="text-white font-medium mb-3">Quick Optimizations</h4>
            <div className="grid grid-cols-2 gap-3">
              <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm">
                Reduce Weight
              </button>
              <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm">
                Lower Cost
              </button>
              <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm">
                Improve Grip
              </button>
              <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm">
                3D Print Ready
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProcessWizard: React.FC<ProcessWizardProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [architecturalModel, setArchitecturalModel] = useState<ArchitecturalModel | null>(null);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false, false, false]);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [clickedLockedStep, setClickedLockedStep] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelGenerated, setModelGenerated] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { 
      id: 'input', 
      title: 'Product Concept', 
      icon: <Layers className="w-5 h-5" />, 
      component: MultimodalDesignInput,
      description: 'Describe your product idea using text, voice, sketches, or photos'
    },
    { 
      id: 'model', 
      title: '3D Prototype', 
      icon: <Move3D className="w-5 h-5" />, 
      component: ThreeDModelViewer,
      description: 'Explore your generated product model in 3D'
    },
    { 
      id: 'ar', 
      title: 'AR Preview', 
      icon: <Hand className="w-5 h-5" />, 
      component: ARVisualizationStep,
      description: 'See your product in real-world context'
    },
    { 
      id: 'iterate', 
      title: 'Design Optimization', 
      icon: <Wrench className="w-5 h-5" />, 
      component: DesignIterationStep,
      description: 'Optimize design for manufacturability and cost'
    },
    { 
      id: 'manufacture', 
      title: 'Production Ready', 
      icon: <Users className="w-5 h-5" />, 
      component: ManufacturingConnect,
      description: 'Connect with manufacturers to produce your product'
    },
    { 
      id: 'patent', 
      title: 'Prior Art Search', 
      icon: <Search className="w-5 h-5" />, 
      component: PatentSearch,
      description: 'Check for existing products and protect your innovation'
    }
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
      setShowCompletion(false);
      setClickedLockedStep(null);
    } else {
      setClickedLockedStep(stepIndex);
      setShowAlert(true);
      setTimeout(() => {
        setShowAlert(false);
        setClickedLockedStep(null);
      }, 3000);
    }
  };

  const handleStepHover = (stepIndex: number) => {
    setHoveredStep(stepIndex);
  };

  const isStepAccessible = (stepIndex: number) => {
    return stepIndex <= currentStep || completedSteps[stepIndex];
  };

  // Generate 3D architectural model
  const generateModel = async (inputs: MultimodalInput) => {
    try {
      setIsGenerating(true);
      const request: GenerationRequest = {
        inputs,
        preferences: {
          style: 'modern',
          units: 'metric',
          complexity: 'detailed'
        }
      };
      
      const response = await architecturalAI.generateModel(request);
      const generated = response.model;
      
      // Validate the generated model
      if (!generated || !generated.rooms || generated.rooms.length === 0) {
        throw new Error('Invalid model generated - no rooms found');
      }
      
      // Ensure all required fields are present
      const validatedModel: ArchitecturalModel = {
        ...generated,
        id: generated.id || `model_${Date.now()}`,
        name: generated.name || 'Architectural Design',
        rooms: generated.rooms.map((room: any) => ({
          ...room,
          id: room.id || `room_${Math.random().toString(36).substr(2, 9)}`,
          position: room.position || { x: 0, y: 0, z: 0 },
          dimensions: room.dimensions || { width: 5, height: 3, length: 5 }
        })),
        doors: generated.doors || [],
        windows: generated.windows || [],
        totalArea: generated.totalArea || 0,
        style: generated.style || 'modern'
      };
      
      setArchitecturalModel(validatedModel);
      setModelGenerated(true);
    } catch (error) {
      console.error('Error generating model:', error);
      setErrors({ general: `Failed to generate model: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle model completion from first step
  const handleModelGenerated = (model: ArchitecturalModel) => {
    setArchitecturalModel(model);
    handleNext(); // Automatically proceed to next step
  };

  // Handle model updates from iteration step
  const handleModelUpdate = (model: ArchitecturalModel) => {
    setArchitecturalModel(model);
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

  const renderCurrentStep = () => {
    const step = steps[currentStep];
    
    switch (step.id) {
      case 'input':
        return <MultimodalDesignInput onComplete={handleModelGenerated} />;
      case 'model':
        return <ThreeDModelViewer model={architecturalModel} onModelUpdate={handleModelUpdate} />;
      case 'ar':
        return <ARVisualizationStep model={architecturalModel} />;
      case 'iterate':
        return <DesignIterationStep model={architecturalModel} onModelUpdate={handleModelUpdate} />;
      case 'manufacture':
        return <ManufacturingConnect 
          model={architecturalModel}
          onNext={handleNext}
          onPrevious={handlePrevious}
          canGoNext={true}
          canGoPrevious={true}
        />;
      case 'patent':
        return <PatentSearch 
          model={architecturalModel}
          onNext={handleNext}
          onPrevious={handlePrevious}
          canGoNext={true}
          canGoPrevious={true}
        />;
      default:
        return <div>Step not found</div>;
    }
  };

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
                  >
                    {completedSteps[index] ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : !isStepAccessible(index) ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      step.icon
                    )}
                  </button>
                  
                  {/* Enhanced Tooltip */}
                  {hoveredStep === index && (
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 rounded-xl shadow-2xl text-sm whitespace-nowrap z-20 border max-w-xs ${
                      isStepAccessible(index)
                        ? 'bg-gray-800 text-white border-gray-600'
                        : 'bg-red-500 text-white border-red-400 animate-pulse'
                    }`}>
                      <div className="font-medium">{step.title}</div>
                      <div className="text-xs mt-1 opacity-90">{step.description}</div>
                      {!isStepAccessible(index) && (
                        <div className="text-xs mt-1 opacity-90">
                          🔒 Complete preceding steps first
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 transition-colors ${
                    completedSteps[index] ? 'bg-green-500' : 'bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {renderCurrentStep()}
          
          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-12 pt-8 border-t border-white/10">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center px-6 py-3 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Previous
            </button>
            
            <div className="text-center">
              <div className="text-white font-medium">{steps[currentStep].title}</div>
              <div className="text-gray-400 text-sm">{steps[currentStep].description}</div>
            </div>
            
            <button
              onClick={handleNext}
              disabled={currentStep === 0 && !architecturalModel} // Disable next on first step until model is generated
              className="flex items-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProcessWizard;