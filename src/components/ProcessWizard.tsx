import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  MessageCircle, 
  Eye, 
  Wrench, 
  Users, 
  Search,
  CheckCircle,
  Hand,
  AlertCircle,
  Lock,
  Layers,
  Move3D,
  Wand2,
  Mic,
  MicOff,
  Lightbulb,
  BookOpen,
  Settings,
  RefreshCw,
  Download,
  ExternalLink,
  Loader2,
  Brain,
  Zap,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import ModelViewer3D from './ModelViewer3D';
import MultimodalInputPanel from './MultimodalInputPanel';
import CADInputPanel from './CADInputPanel';
import CompletionCelebration from './CompletionCelebration';
import { voiceService } from '../services/voiceService';
import { architecturalAI } from '../services/architecturalAI';
import { cadAI, type CADExportOptions } from '../services/cadAI';
import type { 
  ArchitecturalModel, 
  MultimodalInput, 
  GenerationRequest,
  GenerationResponse,
  CADModelData 
} from '../types/architectural';
import ARVisualization from './steps/ARVisualization';
import DesignIteration from './steps/DesignIteration';
import ManufacturingConnect from './steps/ManufacturingConnect';
import PatentSearch from './steps/PatentSearch';
import { useUsage } from '../hooks/useUsage';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface ProcessWizardProps {
  onBack: () => void;
}

// CAD Export Types and Component
type CADFormat = 'gltf' | 'stl' | 'obj' | 'ply' | 'fbx' | 'dae';
type ExportStatus = 'ready' | 'loading' | 'failed';

interface CADExportProps {
  model: ArchitecturalModel;
  className?: string;
}

// CAD Format definitions
const CADFormats: Record<CADFormat, { 
  name: string; 
  extension: string; 
  mimeType: string; 
  description: string;
}> = {
  gltf: { name: 'GLTF', extension: '.gltf', mimeType: 'model/gltf+json', description: '3D Graphics Language' },
  stl: { name: 'STL', extension: '.stl', mimeType: 'application/vnd.ms-pki.stl', description: '3D Printing Format' },
  obj: { name: 'OBJ', extension: '.obj', mimeType: 'text/plain', description: 'Wavefront OBJ' },
  ply: { name: 'PLY', extension: '.ply', mimeType: 'application/octet-stream', description: 'Polygon File Format' },
  fbx: { name: 'FBX', extension: '.fbx', mimeType: 'application/octet-stream', description: 'Autodesk FBX' },
  dae: { name: 'DAE', extension: '.dae', mimeType: 'model/vnd.collada+xml', description: 'COLLADA' }
};

// Enhanced CAD Export Component with Zoo CLI consideration
const CADExportComponent: React.FC<CADExportProps> = ({ model, className = '' }) => {
  const [currentFormat, setCurrentFormat] = useState<CADFormat>('stl');
  const [status, setStatus] = useState<ExportStatus>('ready');
  const [cachedFormats, setCachedFormats] = useState<Partial<Record<CADFormat, string>>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  // Client-side conversion using Three.js exporters
  const convertToSTL = async (gltfUrl: string): Promise<string> => {
    const { STLExporter } = await import('three/examples/jsm/exporters/STLExporter.js');
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(gltfUrl);
    
    const exporter = new STLExporter();
    const stlString = exporter.parse(gltf.scene);
    
    const blob = new Blob([stlString], { type: 'application/vnd.ms-pki.stl' });
    return URL.createObjectURL(blob);
  };

  const convertToOBJ = async (gltfUrl: string): Promise<string> => {
    const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(gltfUrl);
    
    const exporter = new OBJExporter();
    const objString = exporter.parse(gltf.scene);
    
    const blob = new Blob([objString], { type: 'text/plain' });
    return URL.createObjectURL(blob);
  };

  const convertToPLY = async (gltfUrl: string): Promise<string> => {
    const { PLYExporter } = await import('three/examples/jsm/exporters/PLYExporter.js');
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(gltfUrl);
    
    const exporter = new PLYExporter();
    
    // PLY exporter uses a callback pattern
    return new Promise<string>((resolve, reject) => {
      try {
        exporter.parse(gltf.scene, (result: string) => {
          const blob = new Blob([result], { type: 'application/octet-stream' });
          resolve(URL.createObjectURL(blob));
        }, { binary: false });
      } catch (error) {
        reject(error);
      }
    });
  };

  // Future: Zoo CLI integration approach
  const convertWithZooCLI = async (targetFormat: CADFormat, gltfUrl: string): Promise<string> => {
    // This would be implemented later with Zoo's CLI conversion service
    // For now, throwing an error for unsupported formats
    throw new Error(`${targetFormat.toUpperCase()} conversion via Zoo CLI not yet implemented. Consider using Zoo's conversion service: https://zoo.dev/docs/developer-tools/cli/manual/zoo_file_convert`);
  };

  // Convert GLTF to other formats
  const convertFormat = async (targetFormat: CADFormat): Promise<string> => {
    if (cachedFormats[targetFormat]) {
      return cachedFormats[targetFormat];
    }

    if (!model?.cadModel?.gltfUrl) {
      throw new Error('No CAD model available for export');
    }

    setStatus('loading');
    
    try {
      let convertedUrl: string;
      const gltfUrl = model.cadModel.gltfUrl;
      
      switch (targetFormat) {
        case 'gltf':
          convertedUrl = gltfUrl;
          break;
        case 'stl':
          convertedUrl = await convertToSTL(gltfUrl);
          break;
        case 'obj':
          convertedUrl = await convertToOBJ(gltfUrl);
          break;
        case 'ply':
          convertedUrl = await convertToPLY(gltfUrl);
          break;
        case 'fbx':
        case 'dae':
          // Future: Use Zoo CLI for professional formats
          convertedUrl = await convertWithZooCLI(targetFormat, gltfUrl);
          break;
        default:
          throw new Error(`Unsupported format: ${targetFormat}`);
      }
      
      // Cache the converted format
      setCachedFormats(prev => ({
        ...prev,
        [targetFormat]: convertedUrl
      }));
      
      setStatus('ready');
      return convertedUrl;
    } catch (error) {
      console.error('Format conversion failed:', error);
      setStatus('failed');
      throw error;
    }
  };

  const handleDropdownToggle = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleFormatChange = async (format: CADFormat) => {
    setCurrentFormat(format);
    setDropdownOpen(false);
    
    try {
      const downloadUrl = await convertFormat(format);
      
      // Trigger download
      if (downloadLinkRef.current) {
        const modelName = model.name || model.productSpecs?.name || 'cad-model';
        downloadLinkRef.current.href = downloadUrl;
        downloadLinkRef.current.download = `${modelName.replace(/\.[^/.]+$/, '')}${CADFormats[format].extension}`;
        downloadLinkRef.current.click();
      }
    } catch (error) {
      console.error('Download failed:', error);
      setStatus('failed');
      setTimeout(() => setStatus('ready'), 3000);
    }
  };

  // Only show supported formats for client-side conversion
  const supportedFormats = ['gltf', 'stl', 'obj', 'ply'] as CADFormat[];
  const formatOptions = supportedFormats.map(format => ({
    value: format,
    label: CADFormats[format].name,
    description: CADFormats[format].description
  }));

  return (
    <div className={`relative ${className}`}>
      <div className={`flex items-center bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl overflow-hidden shadow-lg ${
        status === 'loading' ? 'animate-pulse' : ''
      } ${status === 'failed' ? 'from-red-500 to-red-600' : ''}`}>
        
        {/* Download Button */}
        <button
          disabled={status === 'loading'}
          className={`flex items-center gap-2 px-4 py-3 text-white font-semibold transition-all flex-grow ${
            status === 'loading' ? 'cursor-not-allowed opacity-70' : 'hover:bg-white/10'
          }`}
          onClick={() => handleFormatChange(currentFormat)}
        >
          {status === 'loading' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : status === 'failed' ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          
          <span>
            {status === 'loading' 
              ? 'Converting...' 
              : status === 'failed' 
              ? 'Try Again' 
              : `Export ${CADFormats[currentFormat].name}`}
          </span>
        </button>

        {/* Format Dropdown */}
        <div className="relative">
          <button
            onClick={handleDropdownToggle}
            disabled={status === 'loading'}
            className={`flex items-center gap-1 px-3 py-3 text-white border-l border-white/20 transition-all ${
              status === 'loading' ? 'cursor-not-allowed opacity-70' : 'hover:bg-white/10'
            }`}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${
              dropdownOpen ? 'rotate-180' : ''
            }`} />
          </button>
        </div>
      </div>

      {/* Hidden download link */}
      <a
        ref={downloadLinkRef}
        className="hidden"
        href="#"
        download=""
      >
        Download
      </a>

      {/* Click outside to close dropdown */}
      {dropdownOpen && (
        <div 
          className="fixed inset-0 z-[9998]" 
          onClick={() => setDropdownOpen(false)}
        />
      )}

      {/* Dropdown Menu - Simple positioning below export button */}
      {dropdownOpen && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-[99999]">
          <div className="py-2">
            {formatOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFormatChange(option.value)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  currentFormat === option.value 
                    ? 'bg-cyan-500/20 text-cyan-300' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <div className="font-mono font-semibold">{option.label}</div>
                <div className="text-xs text-gray-400">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Step 1: Combined Input Step (Multimodal + CAD)
const CombinedInputStep: React.FC<{
  onComplete: (model: ArchitecturalModel) => void;
}> = ({ onComplete }) => {
  const [selectedMode, setSelectedMode] = useState<'technical' | 'multimodal'>('multimodal');

  const handleCADGenerated = (model: ArchitecturalModel) => {
    onComplete(model);
  };

  const handleMultimodalComplete = (model: ArchitecturalModel) => {
    onComplete(model);
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">Choose Your Design Method</h2>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Select how you'd like to describe your product concept. Both methods use advanced AI to create professional CAD models.
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-6 max-w-4xl mx-auto mb-8">
        <button
          onClick={() => setSelectedMode('multimodal')}
          className={`flex-1 p-6 rounded-2xl border-2 transition-all duration-200 ${
            selectedMode === 'multimodal'
              ? 'border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-400/20'
              : 'border-purple-400/30 bg-purple-900/20 hover:border-purple-400/50'
          }`}
        >
          <div className="text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
            <h3 className="text-xl font-bold text-white mb-2">Multimodal Design</h3>
            <p className="text-gray-300 text-sm">
              Use voice, sketches, photos, and text to describe your idea naturally
            </p>
          </div>
        </button>

        <button
          onClick={() => setSelectedMode('technical')}
          className={`flex-1 p-6 rounded-2xl border-2 transition-all duration-200 ${
            selectedMode === 'technical'
              ? 'border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-400/20'
              : 'border-purple-400/30 bg-purple-900/20 hover:border-purple-400/50'
          }`}
        >
          <div className="text-center">
            <Zap className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
            <h3 className="text-xl font-bold text-white mb-2">Technical CAD</h3>
            <p className="text-gray-300 text-sm">
              Provide detailed technical specifications for precise engineering models
            </p>
          </div>
        </button>
      </div>

      {/* Selected Mode Content */}
      {selectedMode === 'multimodal' ? (
        <MultimodalDesignInput onComplete={handleMultimodalComplete} />
      ) : (
        <CADGenerationStep onComplete={handleCADGenerated} />
      )}
    </div>
  );
};

// Original CAD Generation Component for technical input mode
const CADGenerationStep: React.FC<{
  onComplete: (model: ArchitecturalModel) => void;
}> = ({ onComplete }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCADGenerated = (model: ArchitecturalModel) => {
    onComplete(model);
  };

  return (
    <div className="space-y-6">
      <CADInputPanel 
        onCADGenerated={handleCADGenerated}
        isGenerating={isGenerating}
        className="max-w-6xl mx-auto"
      />
    </div>
  );
};

// Step 2: Multimodal Input Component (Legacy)
const MultimodalDesignInput: React.FC<{
  onComplete: (model: ArchitecturalModel) => void;
}> = ({ onComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Add usage tracking hooks
  const { canUseDesign, incrementDesignUsage } = useUsage();
  const { user } = useAuth();

  const handleInputSubmit = async (input: MultimodalInput) => {
    // Check if user can create more designs
    if (!canUseDesign()) {
      setShowUpgradePrompt(true);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingSteps([]);
    setShowUpgradePrompt(false);

    try {
      // Increment design usage before generation
      const canProceed = await incrementDesignUsage();
      
      if (!canProceed) {
        setShowUpgradePrompt(true);
        setIsProcessing(false);
        return;
      }

      // Use the AgenticadML AI via cadAI service instead of architecturalAI
      setProcessingSteps(['Analyzing your product concept...']);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Convert multimodal input to CAD prompt
      let cadPrompt = '';
      if (input.text) {
        cadPrompt = input.text.content;
      } else if (input.voice?.transcript) {
        cadPrompt = input.voice.transcript;
      } else {
        cadPrompt = 'Create a modern product design';
      }
      
      setProcessingSteps(prev => [...prev, 'Generating 3D CAD model...']);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setProcessingSteps(prev => [...prev, 'Creating 3D prototype...']);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProcessingSteps(prev => [...prev, 'Optimizing for manufacturing...']);
      
      // Import cadAI dynamically to avoid circular dependencies
      const { cadAI } = await import('../services/cadAI');
      
      // Generate CAD model using AgenticadML AI with progress tracking
      const cadModel = await cadAI.generateAndWaitForCAD({
        prompt: cadPrompt,
        outputFormat: 'gltf',
        units: 'mm'
      }, false, (step: string, details?: any) => {
        // Update processing steps based on actual progress
        setProcessingSteps(prev => {
          const newSteps = [...prev];
          if (!newSteps.includes(step)) {
            newSteps.push(step);
          }
          return newSteps;
        });
      });

      // Convert CAD model to ArchitecturalModel format
      // Map CAD dimensions (width, height, depth) to architectural dimensions (width, length, height)
      const mappedDimensions = {
        width: cadModel.properties.dimensions.width,
        length: cadModel.properties.dimensions.depth, // Map depth to length
        height: cadModel.properties.dimensions.height
      };

      const architecturalModel: ArchitecturalModel = {
        id: cadModel.id,
        name: `CAD Model - ${cadPrompt.substring(0, 30)}...`,
        description: `3D model generated from: "${cadPrompt}"`,
        rooms: [{
          id: 'cad_component',
          name: 'CAD Model',
          dimensions: mappedDimensions,
          position: { x: 0, y: 0, z: 0 },
          connections: [],
          features: ['cad_generated'],
          materials: { walls: '#cccccc', floor: '#999999', ceiling: '#ffffff' }
        }],
        doors: [],
        windows: [],
        totalArea: cadModel.properties.volume,
        style: 'modern',
        created: new Date(),
        modified: new Date(),
        // Store the CAD model data
        cadModel: cadModel,
        productSpecs: {
          name: `CAD Product`,
          description: `3D model generated from user input`,
          style: 'modern',
          components: [{
            name: 'main_component',
            dimensions: mappedDimensions,
            material: 'Generated material',
            function: 'Primary structure',
            features: ['cad_generated'],
            connections: []
          }],
          totalVolume: cadModel.properties.volume,
          manufacturing: {
            method: '3D printing',
            materials: ['PLA plastic'],
            complexity: cadModel.properties.complexity,
            estimated_cost: '$25-75'
          },
          specifications: {
            weight: '200g',
            dimensions: {
              length: mappedDimensions.length,
              width: mappedDimensions.width,
              height: mappedDimensions.height
            },
            color_options: ['natural'],
            durability: 'medium'
          }
        }
      };
      
      setProcessingSteps(prev => [...prev, 'Complete!']);
      onComplete(architecturalModel);
      
    } catch (error) {
      console.error('Error generating CAD model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Enhanced error messaging for common issues
      let userFriendlyMessage = 'Failed to generate product model. Please try again.';
      
      if (errorMessage.includes('422')) {
        userFriendlyMessage = 'The AI had trouble understanding your description. Try being more specific about the shape, size, or function of your product.';
      } else if (errorMessage.includes('429')) {
        userFriendlyMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (errorMessage.includes('AgenticadML API')) {
        userFriendlyMessage = 'The 3D modeling service is temporarily unavailable. Please try again in a few minutes.';
      } else if (errorMessage.includes('404')) {
        userFriendlyMessage = 'The 3D modeling service is not properly configured. Please contact support.';
      }
      
      setError(userFriendlyMessage);
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
          Our AgenticadML AI will transform your concept into a detailed 3D CAD model.
        </p>
      </div>

      <MultimodalInputPanel 
        onSubmit={handleInputSubmit}
        isProcessing={isProcessing}
        className="max-w-6xl mx-auto"
      />

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <div className="max-w-6xl mx-auto bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              <div>
                <h4 className="text-orange-400 font-medium text-sm">Design Limit Reached</h4>
                <p className="text-orange-300 text-sm">You've reached your monthly design generation limit. Upgrade to continue creating.</p>
              </div>
            </div>
            <button
              onClick={() => setShowUpgradePrompt(false)}
              className="text-orange-400 hover:text-orange-300 transition-colors px-3 py-1 rounded-lg hover:bg-orange-500/10"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-gradient-to-br from-purple-900/95 to-purple-800/95 backdrop-blur-sm border border-purple-500/30 rounded-3xl p-12 max-w-lg w-full mx-8 shadow-2xl">
            <div className="text-center">
              {/* Loading Spinner */}
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-cyan-400/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-2 border-cyan-400/30 rounded-full"></div>
              </div>
              
              {/* Main Heading */}
              <h3 className="text-3xl font-bold text-white mb-8">Generating Your 3D CAD Model</h3>
              
              {/* Progress Steps */}
              <div className="space-y-4 text-left">
                {[
                  'Analyzing your product concept...',
                  'Generating 3D CAD model...',
                  'Creating 3D prototype...',
                  'Optimizing for manufacturing...'
                ].map((step, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                      index < processingSteps.length 
                        ? 'bg-green-500 shadow-lg shadow-green-500/30' 
                        : index === processingSteps.length 
                        ? 'bg-cyan-500 animate-pulse shadow-lg shadow-cyan-500/30' 
                        : 'bg-gray-600/50 border border-gray-500/30'
                    }`}>
                      {index < processingSteps.length ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : index === processingSteps.length ? (
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      )}
                    </div>
                    <span className={`text-lg transition-all duration-300 ${
                      index < processingSteps.length 
                        ? 'text-green-400 font-medium' 
                        : index === processingSteps.length 
                        ? 'text-cyan-400 font-medium' 
                        : 'text-gray-400'
                    }`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Status Message */}
              <div className="mt-8 text-gray-300">
                {processingSteps.length === 0 && (
                  <p className="text-sm animate-pulse">Starting CAD generation...</p>
                )}
                {processingSteps.length > 0 && processingSteps.length < 4 && (
                  <p className="text-sm">Using AgenticadML AI Engine...</p>
                )}
                {processingSteps.length === 4 && (
                  <p className="text-sm text-green-400 font-medium">Almost complete!</p>
                )}
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
              <p className="text-red-400 font-medium">CAD Generation Error</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
              <p className="text-gray-400 text-xs mt-2">
                💡 Tip: Try describing a simple mechanical object like "a bracket with mounting holes" or "a cylindrical container with a lid"
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
  const [isEditing, setIsEditing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [manufacturingCost, setManufacturingCost] = useState<any>(null);
  const [gltfData, setGltfData] = useState<any>(null); // NEW: Store captured GLTF data
  const [viewMode, setViewMode] = useState<'3d' | 'ar'>('3d'); // Keep for AR mode toggle
  
  // Initialize editable data from model
  const [editableData, setEditableData] = useState({
    title: model?.name || '',
    description: model?.description || '',
    specifications: {
      weight: model?.productSpecs?.specifications?.weight || 'Unknown',
      volume: model?.productSpecs?.totalVolume ? `${model.productSpecs.totalVolume} cm³` : 'Unknown',
      style: model?.productSpecs?.style || model?.style || 'modern',
      durability: model?.productSpecs?.specifications?.durability || 'High'
    },
    manufacturing: {
      method: model?.productSpecs?.manufacturing?.method || '3D Printing',
      materials: model?.productSpecs?.manufacturing?.materials || ['PLA'],
      complexity: model?.productSpecs?.manufacturing?.complexity || 'moderate',
      cost: model?.productSpecs?.manufacturing?.estimated_cost || '15-25 USD'
    },
    components: model?.productSpecs?.components || []
  });

  // NEW: Callback to capture GLTF data when model loads
  const handleGLTFDataLoaded = useCallback((capturedGltfData: any) => {
    console.log('🎯 GLTF data captured for AI analysis:', {
      meshes: capturedGltfData.meshes?.length || 0,
      materials: capturedGltfData.materials?.length || 0,
      nodes: capturedGltfData.nodes?.length || 0
    });
    setGltfData(capturedGltfData);
  }, []);

  const analyzeCADWithAI = async () => {
    if (!model?.cadModel) {
      console.warn('No CAD model available for AI analysis');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Prepare CAD data for analysis
      const cadData = {
        prompt: model.description || model.name,
        volume: model.cadModel.properties?.volume || model.productSpecs?.totalVolume,
        complexity: model.cadModel.properties?.complexity,
        components: model.productSpecs?.components || model.rooms,
        gltfUrl: model.cadModel.gltfUrl,
        gltfData: gltfData // NEW: Send parsed GLTF data if available
      };

      console.log('📤 Sending CAD analysis request with:', {
        hasGltfData: !!gltfData,
        hasGltfUrl: !!cadData.gltfUrl,
        prompt: cadData.prompt
      });

      // Call Gemini Flash API for analysis via Supabase Edge Function
      const { data: analysis, error } = await supabase.functions.invoke('analyze-cad', {
        body: cadData
      });

      if (error) {
        console.warn('AI analysis failed:', error);
        console.warn('Using existing data');
      } else if (analysis) {
        setEditableData(prev => ({
          ...prev,
          title: analysis.title || prev.title,
          description: analysis.description || prev.description,
          specifications: {
            weight: analysis.specifications?.weight || prev.specifications.weight,
            volume: analysis.specifications?.volume || prev.specifications.volume,
            style: analysis.specifications?.style || prev.specifications.style,
            durability: analysis.specifications?.durability || prev.specifications.durability
          },
          manufacturing: {
            method: analysis.manufacturing?.method || prev.manufacturing.method,
            materials: analysis.manufacturing?.materials || prev.manufacturing.materials,
            complexity: analysis.manufacturing?.complexity || prev.manufacturing.complexity,
            cost: analysis.manufacturing?.cost || prev.manufacturing.cost
          }
        }));
        
        // Update model and editable data with new component data if available
        if (analysis.components && onModelUpdate) {
          // Update editable data state
          setEditableData(prev => ({
            ...prev,
            components: analysis.components
          }));
          
          const updatedModel = {
            ...model,
            productSpecs: {
              ...model.productSpecs,
              name: analysis.title || model.productSpecs?.name || model.name,
              description: analysis.description || model.productSpecs?.description || model.description,
              style: analysis.specifications?.style || model.productSpecs?.style || model.style || 'modern',
              components: analysis.components,
              specifications: {
                ...model.productSpecs?.specifications,
                weight: analysis.specifications?.weight || model.productSpecs?.specifications?.weight || 'Unknown',
                durability: analysis.specifications?.durability || model.productSpecs?.specifications?.durability || 'High',
                dimensions: model.productSpecs?.specifications?.dimensions || { length: 10, width: 10, height: 10 },
                color_options: model.productSpecs?.specifications?.color_options || ['Default']
              },
              manufacturing: {
                method: analysis.manufacturing?.method || model.productSpecs?.manufacturing?.method || '3D Printing',
                materials: analysis.manufacturing?.materials || model.productSpecs?.manufacturing?.materials || ['PLA'],
                complexity: analysis.manufacturing?.complexity || model.productSpecs?.manufacturing?.complexity || 'moderate',
                estimated_cost: analysis.manufacturing?.cost || model.productSpecs?.manufacturing?.estimated_cost || '15-25 USD'
              }
            }
          };
          onModelUpdate(updatedModel);
        }
        
        console.log('✅ AI analysis completed with', analysis.components?.length || 0, 'components analyzed');
      } else {
        console.warn('AI analysis returned no data, using existing data');
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save edited data back to model
  const saveEditedData = () => {
    if (model && onModelUpdate) {
      const updatedModel = {
        ...model,
        name: editableData.title,
        description: editableData.description,
        productSpecs: {
          name: editableData.title,
          description: editableData.description,
          specifications: {
            weight: editableData.specifications.weight,
            durability: editableData.specifications.durability,
            dimensions: model.productSpecs?.specifications?.dimensions || { length: 100, width: 100, height: 10 },
            color_options: model.productSpecs?.specifications?.color_options || ['Default']
          },
          manufacturing: {
            method: editableData.manufacturing.method,
            materials: editableData.manufacturing.materials,
            complexity: editableData.manufacturing.complexity,
            estimated_cost: editableData.manufacturing.cost
          },
          style: editableData.specifications.style,
          totalVolume: parseFloat(editableData.specifications.volume.replace(/[^\d.]/g, '')) || model.productSpecs?.totalVolume || 0,
          components: editableData.components || model.productSpecs?.components || []
        }
      };
      onModelUpdate(updatedModel);
    }
    setIsEditing(false);
  };

  // Note: STL export functionality moved to CADExportComponent

  // Handle Send to Manufacturer
  const handleSendToManufacturer = async () => {
    if (!model?.cadModel) {
      alert('No CAD model available');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      // Estimate manufacturing cost first
      const cost = await cadAI.estimateManufacturingCost(model.cadModel, 'PLA');
      setManufacturingCost(cost);

      // Generate multiple export formats for manufacturer
      const formats: Array<'stl' | 'step' | 'obj'> = ['stl', 'step', 'obj'];
      const exportPromises = formats.map(async (format) => {
        try {
          const exportOptions: CADExportOptions = {
            format,
            units: 'mm',
            quality: 'high'
          };
          const result = await cadAI.exportCADModel(model.cadModel!, exportOptions);
          return { format, ...result };
        } catch (error) {
          console.warn(`Export failed for ${format}:`, error);
          return null;
        }
      });

      const exportResults = await Promise.all(exportPromises);
      const successfulExports = exportResults.filter(result => result !== null);

      if (successfulExports.length === 0) {
        throw new Error('No export formats were successful');
      }

      // Create a summary for the manufacturer
      const manufacturerPackage = {
        modelId: model.cadModel.id,
        description: model.productSpecs?.description || model.description,
        specifications: model.productSpecs?.specifications,
        manufacturing: model.productSpecs?.manufacturing,
        estimatedCost: cost,
        availableFiles: successfulExports
      };

      console.log('📦 Manufacturer package prepared:', manufacturerPackage);
      
      // For now, download the STL file and show manufacturer info
      const stlExport = successfulExports.find(exp => exp?.format === 'stl');
      if (stlExport) {
        const link = document.createElement('a');
        link.href = stlExport.downloadUrl;
        link.download = stlExport.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      alert(`Manufacturing package prepared!\n\nEstimated cost: $${cost.cost} USD\nMaterial: ${cost.material}\nVolume: ${cost.volume.toFixed(2)} cm³\n\nSTL file downloaded for manufacturer review.`);

    } catch (error) {
      console.error('❌ Manufacturer export failed:', error);
      setExportError('Failed to prepare manufacturer package. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

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
        onARModeToggle={(enabled: boolean) => setViewMode(enabled ? 'ar' : '3d')}
        onModelUpdate={onModelUpdate}
        onGLTFDataLoaded={handleGLTFDataLoaded}
        className="max-w-6xl mx-auto h-[600px]"
      />

      {/* Export Error Message */}
      {exportError && (
        <div className="max-w-6xl mx-auto bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-400 font-medium">Export Error</p>
              <p className="text-red-300 text-sm">{exportError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Model Information Panel */}
      {model && (
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-purple-900/90 to-purple-800/90 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-8">
          {/* Header with title and edit controls */}
          <div className="flex items-center justify-between mb-6">
            {isEditing ? (
              <input
                type="text"
                value={editableData.title}
                onChange={(e) => setEditableData(prev => ({ ...prev, title: e.target.value }))}
                className="text-2xl font-bold text-white bg-transparent border-b border-cyan-400 focus:outline-none focus:border-cyan-300 flex-1 mr-4"
                placeholder="Model Title"
              />
            ) : (
              <h3 className="text-2xl font-bold text-white">
                {editableData.title}
              </h3>
            )}
            
            <div className="flex items-center gap-2">
              {/* AI Analysis Button */}
              <button
                onClick={analyzeCADWithAI}
                disabled={isAnalyzing || !model.cadModel}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    AI Analyze
                  </>
                )}
              </button>
              
              {/* Edit/Save Button */}
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={saveEditedData}
                    className="flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  <Settings className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
          </div>
          
          {/* Show AI-generated product specs if available */}
          {model.productSpecs ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-cyan-400 font-semibold text-lg">Components ({editableData.components?.length || 0})</h4>
                  {isEditing && (
                    <button
                      onClick={() => setEditableData(prev => ({
                        ...prev,
                        components: [...(prev.components || []), {
                          name: `New Component ${(prev.components?.length || 0) + 1}`,
                          material: 'Plastic',
                          dimensions: { width: 10, length: 10, height: 10 },
                          function: 'Structural component'
                        }]
                      }))}
                      className="text-xs bg-cyan-600 text-white px-2 py-1 rounded hover:bg-cyan-700 transition-colors"
                    >
                      + Add Component
                    </button>
                  )}
                </div>
                
                {isEditing ? (
                  <div className="space-y-3">
                    {(editableData.components || []).map((component: any, index: number) => (
                      <div key={index} className="border border-cyan-500/40 rounded-lg p-3 bg-black/20">
                        <div className="flex items-center justify-between mb-2">
                          <input
                            type="text"
                            value={component.name}
                            onChange={(e) => setEditableData(prev => ({
                              ...prev,
                              components: prev.components?.map((c: any, i: number) => 
                                i === index ? { ...c, name: e.target.value } : c
                              ) || []
                            }))}
                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm font-semibold flex-1 mr-2"
                            placeholder="Component name"
                          />
                          <button
                            onClick={() => setEditableData(prev => ({
                              ...prev,
                              components: prev.components?.filter((c: any, i: number) => i !== index) || []
                            }))}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        
                        <input
                          type="text"
                          value={component.material}
                          onChange={(e) => setEditableData(prev => ({
                            ...prev,
                            components: prev.components?.map((c: any, i: number) => 
                              i === index ? { ...c, material: e.target.value } : c
                            ) || []
                          }))}
                          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs w-full mb-2"
                          placeholder="Material"
                        />
                        
                        <div className="grid grid-cols-3 gap-1 mb-2">
                          <input
                            type="number"
                            value={component.dimensions.width}
                            onChange={(e) => setEditableData(prev => ({
                              ...prev,
                              components: prev.components?.map((c: any, i: number) => 
                                i === index ? { ...c, dimensions: { ...c.dimensions, width: parseInt(e.target.value) || 0 } } : c
                              ) || []
                            }))}
                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                            placeholder="W"
                          />
                          <input
                            type="number"
                            value={component.dimensions.length}
                            onChange={(e) => setEditableData(prev => ({
                              ...prev,
                              components: prev.components?.map((c: any, i: number) => 
                                i === index ? { ...c, dimensions: { ...c.dimensions, length: parseInt(e.target.value) || 0 } } : c
                              ) || []
                            }))}
                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                            placeholder="L"
                          />
                          <input
                            type="number"
                            value={component.dimensions.height}
                            onChange={(e) => setEditableData(prev => ({
                              ...prev,
                              components: prev.components?.map((c: any, i: number) => 
                                i === index ? { ...c, dimensions: { ...c.dimensions, height: parseInt(e.target.value) || 0 } } : c
                              ) || []
                            }))}
                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                            placeholder="H"
                          />
                        </div>
                        
                        <input
                          type="text"
                          value={component.function}
                          onChange={(e) => setEditableData(prev => ({
                            ...prev,
                            components: prev.components?.map((c: any, i: number) => 
                              i === index ? { ...c, function: e.target.value } : c
                            ) || []
                          }))}
                          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs w-full"
                          placeholder="Component function"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="text-gray-300 space-y-3">
                    {(editableData.components || model.productSpecs.components || []).map((component: any, index: number) => (
                      <li key={index} className="border-l-2 border-cyan-500/40 pl-4 bg-black/20 rounded-lg p-3">
                        <div className="font-semibold text-white text-base">{component.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{component.material}</div>
                        <div className="text-sm mt-1">
                          {component.dimensions.width}×{component.dimensions.length}×{component.dimensions.height}cm
                        </div>
                        <div className="text-sm text-cyan-300 mt-1">{component.function}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div>
                <h4 className="text-cyan-400 font-semibold mb-4 text-lg">Manufacturing</h4>
{isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm w-20">Method:</span>
                      <input
                        type="text"
                        value={editableData.manufacturing.method}
                        onChange={(e) => setEditableData(prev => ({ 
                          ...prev, 
                          manufacturing: { ...prev.manufacturing, method: e.target.value }
                        }))}
                        className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white text-sm flex-1"
                        placeholder="e.g., 3D Printing / CNC Machining"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm w-20">Materials:</span>
                      <input
                        type="text"
                        value={editableData.manufacturing.materials.join(', ')}
                        onChange={(e) => setEditableData(prev => ({ 
                          ...prev, 
                          manufacturing: { ...prev.manufacturing, materials: e.target.value.split(', ') }
                        }))}
                        className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white text-sm flex-1"
                        placeholder="e.g., ABS Plastic, PLA, Aluminum"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm w-20">Complexity:</span>
                      <select
                        value={editableData.manufacturing.complexity}
                        onChange={(e) => setEditableData(prev => ({ 
                          ...prev, 
                          manufacturing: { ...prev.manufacturing, complexity: e.target.value }
                        }))}
                        className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white text-sm flex-1"
                      >
                        <option value="simple">Simple</option>
                        <option value="moderate">Moderate</option>
                        <option value="complex">Complex</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm w-20">Cost:</span>
                      <input
                        type="text"
                        value={editableData.manufacturing.cost}
                        onChange={(e) => setEditableData(prev => ({ 
                          ...prev, 
                          manufacturing: { ...prev.manufacturing, cost: e.target.value }
                        }))}
                        className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white text-sm flex-1"
                        placeholder="e.g., 15-45 USD"
                      />
                    </div>
                  </div>
                ) : (
                  <ul className="text-gray-300 space-y-2">
                    <li className="text-sm"><span className="text-white font-medium">Method:</span> {editableData.manufacturing.method}</li>
                    <li className="text-sm"><span className="text-white font-medium">Materials:</span> {editableData.manufacturing.materials.join(', ')}</li>
                    <li className="text-sm"><span className="text-white font-medium">Complexity:</span> {editableData.manufacturing.complexity}</li>
                    <li className="text-sm"><span className="text-white font-medium">Cost:</span> {editableData.manufacturing.cost}</li>
                  </ul>
                )}
                
                {manufacturingCost && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <h5 className="text-green-400 font-medium text-sm mb-2">Detailed Cost Analysis</h5>
                    <ul className="text-green-300 text-sm space-y-1">
                      <li>Material: {manufacturingCost.material}</li>
                      <li>Volume: {manufacturingCost.volume.toFixed(2)} cm³</li>
                      <li>Estimated: ${manufacturingCost.cost} {manufacturingCost.currency}</li>
                    </ul>
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="text-cyan-400 font-semibold mb-4 text-lg">Specifications</h4>
                {isEditing ? (
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm w-20">Weight:</span>
                      <input
                        type="text"
                        value={editableData.specifications.weight}
                        onChange={(e) => setEditableData(prev => ({ 
                          ...prev, 
                          specifications: { ...prev.specifications, weight: e.target.value }
                        }))}
                        className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white text-sm flex-1"
                        placeholder="e.g., 1200 g"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm w-20">Volume:</span>
                      <input
                        type="text"
                        value={editableData.specifications.volume}
                        onChange={(e) => setEditableData(prev => ({ 
                          ...prev, 
                          specifications: { ...prev.specifications, volume: e.target.value }
                        }))}
                        className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white text-sm flex-1"
                        placeholder="e.g., 1000000 cm³"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm w-20">Style:</span>
                      <input
                        type="text"
                        value={editableData.specifications.style}
                        onChange={(e) => setEditableData(prev => ({ 
                          ...prev, 
                          specifications: { ...prev.specifications, style: e.target.value }
                        }))}
                        className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white text-sm flex-1"
                        placeholder="e.g., modern"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm w-20">Durability:</span>
                      <select
                        value={editableData.specifications.durability}
                        onChange={(e) => setEditableData(prev => ({ 
                          ...prev, 
                          specifications: { ...prev.specifications, durability: e.target.value }
                        }))}
                        className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white text-sm flex-1"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Very High">Very High</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <ul className="text-gray-300 space-y-2 mb-6">
                    <li className="text-sm"><span className="text-white font-medium">Weight:</span> {editableData.specifications.weight}</li>
                    <li className="text-sm"><span className="text-white font-medium">Volume:</span> {editableData.specifications.volume}</li>
                    <li className="text-sm"><span className="text-white font-medium">Style:</span> {editableData.specifications.style}</li>
                    <li className="text-sm"><span className="text-white font-medium">Durability:</span> {editableData.specifications.durability}</li>
                  </ul>
                )}
                
                <div className="space-y-3">
                  {/* Enhanced CAD Export with Multiple Formats */}
                  <CADExportComponent 
                    model={model}
                    className="w-full"
                  />
                  <button 
                    onClick={handleSendToManufacturer}
                    disabled={isExporting}
                    className="w-full px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg shadow-purple-500/25"
                  >
                    {isExporting ? 'Preparing...' : 'Send to Manufacturer'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Fallback to old format if no product specs
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h4 className="text-cyan-400 font-semibold mb-4 text-lg">Components ({model.rooms.length})</h4>
                <ul className="text-gray-300 space-y-2">
                  {model.rooms.map(room => (
                    <li key={room.id} className="text-sm">
                      {room.name.replace('_', ' ')} - {room.dimensions.width}cm × {room.dimensions.length}cm × {room.dimensions.height}cm
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-cyan-400 font-semibold mb-4 text-lg">Specifications</h4>
                <ul className="text-gray-300 space-y-2">
                  <li className="text-sm">{model.rooms.length} components</li>
                  <li className="text-sm">{model.totalArea} cm³ volume</li>
                  <li className="text-sm capitalize">{model.style} style</li>
                  <li className="text-sm">Prototype ready</li>
                </ul>
              </div>
              <div>
                <h4 className="text-cyan-400 font-semibold mb-4 text-lg">Actions</h4>
                <div className="space-y-3">
                  {/* Enhanced CAD Export with Multiple Formats */}
                  <CADExportComponent 
                    model={model}
                    className="w-full"
                  />
                  <button 
                    onClick={handleSendToManufacturer}
                    disabled={isExporting}
                    className="w-full px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg shadow-purple-500/25"
                  >
                    {isExporting ? 'Preparing...' : 'Send to Manufacturer'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Product Description */}
          <div className="mt-8 pt-8 border-t border-purple-400/30">
            <h4 className="text-cyan-400 font-semibold mb-3 text-lg">Product Description</h4>
            {isEditing ? (
              <textarea
                value={editableData.description}
                onChange={(e) => setEditableData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full h-24 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-gray-300 resize-none focus:outline-none focus:border-cyan-400 text-base"
                placeholder="Describe the product features, use cases, and technical details..."
              />
            ) : (
              <p className="text-gray-300 leading-relaxed text-base">
                {editableData.description || 'No description available'}
              </p>
            )}
          </div>
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
      title: 'Product Input', 
      icon: <MessageCircle className="w-5 h-5" />, 
      component: CombinedInputStep,
      description: 'Describe your product using text, voice, sketches, or photos'
    },
    { 
      id: 'model', 
      title: '3D Viewer', 
      icon: <Move3D className="w-5 h-5" />, 
      component: ThreeDModelViewer,
      description: 'Explore your CAD model in 3D with enhanced controls'
    },
    { 
      id: 'ar', 
      title: 'AR Preview', 
      icon: <Hand className="w-5 h-5" />, 
      component: ARVisualizationStep,
      description: 'View your product in real-world context using AR'
    },
    { 
      id: 'iterate', 
      title: 'Export & Optimize', 
      icon: <Wrench className="w-5 h-5" />, 
      component: DesignIterationStep,
      description: 'Export to multiple CAD formats and optimize design'
    },
    { 
      id: 'manufacture', 
      title: 'Manufacturing', 
      icon: <Users className="w-5 h-5" />, 
      component: ManufacturingConnect,
      description: 'Connect with manufacturers and estimate costs'
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
        return <CombinedInputStep onComplete={handleModelGenerated} />;
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
                    className={`
                      w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 relative
                      ${isStepAccessible(index)
                        ? completedSteps[index]
                          ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-110'
                          : currentStep === index
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-xl shadow-cyan-500/30 animate-pulse'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white hover:scale-105'
                        : 'bg-gray-600/50 text-gray-500 cursor-not-allowed'
                      }
                      ${clickedLockedStep === index ? 'animate-wiggle' : ''}
                    `}
                  >
                    {completedSteps[index] ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : !isStepAccessible(index) ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </button>

                  {/* Step Info Tooltip */}
                  {hoveredStep === index && (
                    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 border border-white/20">
                      <div className="font-semibold">{step.title}</div>
                      <div className="text-sm text-gray-300">{step.description}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                    </div>
                  )}

                  {/* Step Label */}
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                    <div className={`text-sm font-medium transition-colors ${
                      isStepAccessible(index) ? 'text-white' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                </div>

                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-4">
                    <div className={`h-1 rounded-full transition-all duration-500 ${
                      completedSteps[index] || currentStep > index
                        ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                        : 'bg-gray-600'
                    }`}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          {renderCurrentStep()}
        </div>
      </main>

      {/* Navigation Footer */}
      <footer className="px-6 py-6 border-t border-white/10 bg-black/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Previous
          </button>
          
          <div className="text-gray-300 text-sm">
            {currentStep + 1} of {steps.length} steps completed
          </div>
          
          <button
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
            className="flex items-center px-6 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ProcessWizard;