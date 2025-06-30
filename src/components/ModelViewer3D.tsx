import React, { useRef, useEffect, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Text, Box, Plane } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Move3D, 
  Eye, 
  EyeOff,
  Ruler,
  Camera,
  Download,
  Share2,
  Settings,
  Layers,
  AlertTriangle
} from 'lucide-react';
import type { 
  ArchitecturalModel, 
  Room, 
  Door, 
  Window, 
  ViewerState,
  ARCapabilities,
  ARSession,
  ARPlacement
} from '../types/architectural';

interface ModelViewer3DProps {
  model: ArchitecturalModel | null;
  className?: string;
  onARModeToggle?: (enabled: boolean) => void;
  onModelUpdate?: (model: ArchitecturalModel) => void;
}

// Error Boundary Component
class ThreeJSErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Three.js Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Loading Component for Three.js Canvas
const ModelLoader: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.getElapsedTime() * 2;
    }
  });

  return (
    <group>
      {/* Loading spinner using Three.js primitives */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <torusGeometry args={[1, 0.1, 8, 32]} />
        <meshStandardMaterial color="#00bcd4" emissive="#00bcd4" emissiveIntensity={0.3} />
      </mesh>
      
      {/* Loading text using Three.js Text */}
      <Text
        position={[0, -2, 0]}
        fontSize={0.5}
        color="#9ca3af"
        anchorX="center"
        anchorY="middle"
      >
        Loading 3D Model...
      </Text>
    </group>
  );
};

// Error Fallback Component
const ModelError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center p-6">
      <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">3D Viewer Error</h3>
      <p className="text-gray-400 text-sm mb-4">
        Unable to initialize 3D viewer. This may be due to WebGL compatibility issues.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm"
        >
          Try Again
        </button>
      )}
    </div>
  </div>
);

// Product Component for rendering individual product parts
const ProductComponent: React.FC<{ component: Room; materials: any }> = ({ component, materials }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  if (!component || !component.dimensions) {
    return null;
  }

  // Get a nice color based on component type
  const getComponentColor = (name: string) => {
    const colors = {
      'main_body': '#4a90e2',
      'body': '#4a90e2', 
      'interface': '#50c878',
      'handle': '#ff6b6b',
      'cover': '#ffa500',
      'stand': '#8b4513',
      'connector': '#ffd700',
      'sensor': '#9370db',
      'battery': '#32cd32',
      'speaker': '#ff69b4',
      'default': '#808080'
    };
    
    for (const [key, color] of Object.entries(colors)) {
      if (name.toLowerCase().includes(key)) {
        return color;
      }
    }
    return colors.default;
  };

  const componentColor = getComponentColor(component.name);

  return (
    <group position={[component.position.x, component.position.y, component.position.z]}>
      {/* Main component body */}
      <mesh ref={meshRef}>
        <boxGeometry args={[
          component.dimensions.width / 10, // Convert cm to units 
          component.dimensions.height / 10,
          component.dimensions.length / 10
        ]} />
        <meshStandardMaterial 
          color={componentColor}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Component label */}
      <Text
        position={[0, (component.dimensions.height / 10) + 0.5, 0]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {component.name.replace('_', ' ').toUpperCase()}
      </Text>

      {/* Component details */}
      <Text
        position={[0, (component.dimensions.height / 10) + 0.2, 0]}
        fontSize={0.15}
        color="#cccccc"
        anchorX="center"
        anchorY="middle"
      >
        {component.dimensions.width}×{component.dimensions.length}×{component.dimensions.height}cm
      </Text>
    </group>
  );
};

// Main scene component
const ProductScene: React.FC<{ model: ArchitecturalModel; viewerState: ViewerState }> = ({ 
  model, 
  viewerState 
}) => {
  const { camera } = useThree();

  useEffect(() => {
    if (viewerState.camera) {
      camera.position.set(
        viewerState.camera.position.x,
        viewerState.camera.position.y,
        viewerState.camera.position.z
      );
      camera.lookAt(
        viewerState.camera.target.x,
        viewerState.camera.target.y,
        viewerState.camera.target.z
      );
    }
  }, [camera, viewerState.camera]);

  if (!model || !model.rooms || model.rooms.length === 0) {
    return (
      <Text
        position={[0, 0, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        No product components to display
      </Text>
    );
  }

  return (
    <>
      {/* Environment lighting */}
      <ambientLight intensity={viewerState.lighting.ambient} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={viewerState.lighting.directional}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 10, 0]} intensity={0.5} />

      {/* Ground grid */}
      <Grid
        position={[0, -0.01, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#9d4b4b"
        fadeDistance={50}
        fadeStrength={1}
      />

      {/* Render product components */}
      {model.rooms && model.rooms.map((component) => (
        <ProductComponent 
          key={component.id} 
          component={component} 
          materials={viewerState.materials}
        />
      ))}

      {/* Environment for realistic lighting */}
      <Environment preset="city" />
    </>
  );
};

// WebGL Support Check
const checkWebGLSupport = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!(gl && gl instanceof WebGLRenderingContext);
  } catch (e) {
    return false;
  }
};

// AR overlay component
const AROverlay: React.FC<{
  arSession: ARSession;
  onPlaceModel: (placement: ARPlacement) => void;
  onExitAR: () => void;
}> = ({ arSession, onPlaceModel, onExitAR }) => {
  return (
    <div className="absolute inset-0 z-50">
      {/* AR UI Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        <div className="bg-black/70 rounded-lg p-3">
          <p className="text-white text-sm">
            {arSession.modelPlaced ? 'Tap to reposition' : 'Tap to place model'}
          </p>
        </div>
        
        <button
          onClick={onExitAR}
          className="bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Exit AR
        </button>
      </div>

      {/* AR measurement tools */}
      {arSession.measurements.length > 0 && (
        <div className="absolute bottom-20 left-4 right-4">
          <div className="bg-black/70 rounded-lg p-3">
            <h4 className="text-white font-medium mb-2">Measurements</h4>
            {arSession.measurements.map((measurement) => (
              <div key={measurement.id} className="text-white text-sm">
                {measurement.label}: {measurement.value.toFixed(2)} {measurement.unit}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AR controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="flex gap-4 bg-black/70 rounded-lg p-3">
          <button className="text-white p-2 hover:bg-white/20 rounded-lg transition-colors">
            <Ruler className="w-5 h-5" />
          </button>
          <button className="text-white p-2 hover:bg-white/20 rounded-lg transition-colors">
            <Camera className="w-5 h-5" />
          </button>
          <button className="text-white p-2 hover:bg-white/20 rounded-lg transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Main ModelViewer3D component
const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  model,
  className = '',
  onARModeToggle,
  onModelUpdate
}) => {
  const [viewerState, setViewerState] = useState<ViewerState>({
    mode: '3d',
    model: model || undefined,
    camera: {
      position: { x: 10, y: 10, z: 10 },
      target: { x: 0, y: 0, z: 0 }
    },
    lighting: {
      ambient: 0.4,
      directional: 0.8
    },
    materials: {
      walls: '#e0e0e0',
      floors: '#f5f5f5',
      roofs: '#8B4513'
    }
  });

  const [arCapabilities, setArCapabilities] = useState<ARCapabilities>({
    supported: false,
    features: {
      hitTest: false,
      planeDetection: false,
      handTracking: false,
      imageTracking: false
    },
    device: {
      mobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      camera: false,
      gyroscope: false,
      accelerometer: false
    }
  });

  const [arSession, setArSession] = useState<ARSession>({
    active: false,
    modelPlaced: false,
    measurements: []
  });

  const [showControls, setShowControls] = useState(true);
  const [webglSupported, setWebglSupported] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check WebGL support on mount
  useEffect(() => {
    const isSupported = checkWebGLSupport();
    setWebglSupported(isSupported);
    if (!isSupported) {
      console.warn('WebGL not supported');
    }
  }, []);

  // Detect AR capabilities
  useEffect(() => {
    const detectARCapabilities = async () => {
      let supported = false;
      const features = {
        hitTest: false,
        planeDetection: false,
        handTracking: false,
        imageTracking: false
      };

      // Check WebXR support
      if ('xr' in navigator) {
        try {
          const isSupported = await (navigator as any).xr.isSessionSupported('immersive-ar');
          if (isSupported) {
            supported = true;
            features.hitTest = true;
            features.planeDetection = true;
          }
        } catch (error) {
          console.log('WebXR not fully supported:', error);
        }
      }

      // Check device capabilities
      const device = {
        ...arCapabilities.device,
        camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        gyroscope: 'DeviceOrientationEvent' in window,
        accelerometer: 'DeviceMotionEvent' in window
      };

      setArCapabilities(prev => ({
        ...prev,
        supported,
        features,
        device
      }));
    };

    detectARCapabilities();
  }, []);

  // Start AR session
  const startARSession = useCallback(async () => {
    if (!arCapabilities.supported) {
      alert('AR is not supported on this device');
      return;
    }

    try {
      // Initialize WebXR session
      if ('xr' in navigator) {
        const session = await (navigator as any).xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['plane-detection', 'hand-tracking']
        });

        setArSession(prev => ({ ...prev, active: true }));
        setViewerState(prev => ({ ...prev, mode: 'ar' }));
        onARModeToggle?.(true);

        // Handle session end
        session.addEventListener('end', () => {
          setArSession(prev => ({ ...prev, active: false, modelPlaced: false }));
          setViewerState(prev => ({ ...prev, mode: '3d' }));
          onARModeToggle?.(false);
        });
      }
    } catch (error) {
      console.error('Failed to start AR session:', error);
      alert('Failed to start AR session. Please ensure you\'re using a compatible device and browser.');
    }
  }, [arCapabilities.supported, onARModeToggle]);

  // Exit AR session
  const exitARSession = useCallback(() => {
    setArSession(prev => ({ ...prev, active: false, modelPlaced: false }));
    setViewerState(prev => ({ ...prev, mode: '3d' }));
    onARModeToggle?.(false);
  }, [onARModeToggle]);

  // Handle model placement in AR
  const handleModelPlacement = useCallback((placement: ARPlacement) => {
    setArSession(prev => ({
      ...prev,
      modelPlaced: true,
      placement
    }));
  }, []);

  // Reset camera view
  const resetCamera = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      camera: {
        position: { x: 10, y: 10, z: 10 },
        target: { x: 0, y: 0, z: 0 }
      }
    }));
  }, []);

  // Toggle controls visibility
  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);
  }, []);

  // Export model as image
  const exportImage = useCallback(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const link = document.createElement('a');
      link.download = `${model?.name || 'architectural-model'}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  }, [model?.name]);

  // Retry function for error recovery
  const handleRetry = useCallback(() => {
    setRetryKey(prev => prev + 1);
  }, []);

  if (!webglSupported) {
    return (
      <div className={`flex items-center justify-center h-96 bg-white/5 border border-white/20 rounded-2xl ${className}`}>
        <ModelError onRetry={handleRetry} />
      </div>
    );
  }

  if (!model) {
    return (
      <div className={`flex items-center justify-center h-96 bg-white/5 border border-white/20 rounded-2xl ${className}`}>
        <p className="text-gray-400">No model to display. Generate a model first.</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-white/5 border border-white/20 rounded-2xl overflow-hidden ${className}`}>
      {/* 3D Canvas */}
      <ThreeJSErrorBoundary fallback={<ModelError onRetry={handleRetry} />}>
        <Canvas
          key={retryKey}
          ref={canvasRef}
          shadows
          camera={{ position: [10, 10, 10], fov: 60 }}
          className="w-full h-96"
          gl={{ 
            powerPreference: "high-performance",
            antialias: true,
            alpha: false
          }}
          onCreated={({ gl }) => {
            gl.setSize(gl.domElement.clientWidth, gl.domElement.clientHeight);
          }}
        >
          <Suspense fallback={<ModelLoader />}>
            <ProductScene model={model} viewerState={viewerState} />
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              maxPolarAngle={Math.PI / 2}
            />
          </Suspense>
        </Canvas>
      </ThreeJSErrorBoundary>

      {/* AR Overlay */}
      {arSession.active && (
        <AROverlay
          arSession={arSession}
          onPlaceModel={handleModelPlacement}
          onExitAR={exitARSession}
        />
      )}

      {/* Controls Panel */}
      {showControls && !arSession.active && (
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3">
          <div className="flex flex-col gap-2">
            <button
              onClick={startARSession}
              disabled={!arCapabilities.supported}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              title={arCapabilities.supported ? 'View in AR' : 'AR not supported'}
            >
              <Eye className="w-4 h-4" />
              AR View
            </button>
            
            <button
              onClick={resetCamera}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Reset View
            </button>
            
            <button
              onClick={exportImage}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      )}

      {/* Toggle Controls Button */}
      <button
        onClick={toggleControls}
        className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded-lg hover:bg-black/80 transition-colors"
      >
        {showControls ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>

      {/* Model Info */}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
        <h4 className="font-medium mb-1">{model.name}</h4>
        <p className="text-gray-300">{model.rooms.length} components • {model.totalArea} cm³</p>
        <p className="text-gray-400 text-xs">{model.style} style</p>
      </div>

      {/* View Mode Indicator */}
      <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
        {viewerState.mode.toUpperCase()} MODE
      </div>
    </div>
  );
};

export default ModelViewer3D; 