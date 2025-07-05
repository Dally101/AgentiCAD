import React, { useRef, useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Text, Box, Plane, useGLTF } from '@react-three/drei';
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
  AlertTriangle,
  ChevronDown,
  Loader2
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
// GLTFLoader is already imported via @react-three/drei

interface ModelViewer3DProps {
  model: ArchitecturalModel | null;
  className?: string;
  onARModeToggle?: (enabled: boolean) => void;
  onModelUpdate?: (model: ArchitecturalModel) => void;
  onGLTFDataLoaded?: (gltfData: any) => void;
}

// CAD Export Types
type CADFormat = 'gltf' | 'stl' | 'obj' | 'ply' | 'fbx' | 'dae';
type ExportStatus = 'ready' | 'loading' | 'failed';

interface CADExportProps {
  gltfUrl: string;
  modelName: string;
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

// Multi-Format CAD Export Component
const CADExportComponent: React.FC<CADExportProps> = ({ 
  gltfUrl, 
  modelName, 
  className = '' 
}) => {
  const [currentFormat, setCurrentFormat] = useState<CADFormat>('gltf');
  const [status, setStatus] = useState<ExportStatus>('ready');
  const [cachedFormats, setCachedFormats] = useState<Partial<Record<CADFormat, string>>>(() => ({ gltf: gltfUrl }));
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

  // Convert GLTF to other formats (client-side implementation)
  const convertFormat = async (targetFormat: CADFormat): Promise<string> => {
    if (cachedFormats[targetFormat]) {
      return cachedFormats[targetFormat];
    }

    setStatus('loading');
    
    try {
      let convertedUrl: string;
      
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
          throw new Error(`${targetFormat.toUpperCase()} format not yet supported in client-side conversion`);
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

  const handleFormatChange = async (format: CADFormat) => {
    setCurrentFormat(format);
    setDropdownOpen(false);
    
    try {
      const downloadUrl = await convertFormat(format);
      
      // Trigger download
      if (downloadLinkRef.current) {
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
      <div className={`flex items-center bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg overflow-hidden shadow-lg ${
        status === 'loading' ? 'animate-pulse' : ''
      } ${status === 'failed' ? 'from-red-500 to-red-600' : ''}`}>
        
        {/* Download Button */}
        <button
          disabled={status === 'loading'}
          className={`flex items-center gap-2 px-4 py-3 text-white font-semibold transition-all ${
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
            {status === 'loading' ? 'Converting...' : status === 'failed' ? 'Failed' : 'Export'}
          </span>
        </button>

        {/* Format Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={status === 'loading'}
            className={`flex items-center gap-1 px-3 py-3 text-white border-l border-white/20 transition-all ${
              status === 'loading' ? 'cursor-not-allowed opacity-70' : 'hover:bg-white/10'
            }`}
          >
            <span className="text-sm font-mono uppercase">
              {CADFormats[currentFormat].name}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${
              dropdownOpen ? 'rotate-180' : ''
            }`} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
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
              
              {/* Info about unsupported formats */}
              <div className="border-t border-gray-700 p-3 text-xs text-gray-400">
                <div className="font-medium text-gray-300 mb-1">Coming Soon:</div>
                <div>FBX, DAE formats require server conversion</div>
              </div>
            </div>
          )}
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
          className="fixed inset-0 z-40" 
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </div>
  );
};

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

// Safe GLTF Loader Component (Fixed hook ordering)
const SafeGLTFLoader: React.FC<{ 
  url: string; 
  onError?: (error: string) => void;
  onGLTFDataLoaded?: (gltfData: any) => void;
}> = React.memo(({ url, onError, onGLTFDataLoaded }) => {
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Always call useGLTF (required by React hooks rules) but only process after validation
  const gltf = useGLTF(url);
  
  useEffect(() => {
    // Preload the GLTF to check if it's valid
    const preloadGLTF = async () => {
      try {
        setValidated(false);
        setError(null);
        
        // Test if the URL is accessible
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.text();
        if (data.length === 0) {
          throw new Error('Empty GLTF data');
        }
        
        // Try to parse as JSON to validate GLTF structure
        const gltfData = JSON.parse(data);
        if (!gltfData.asset || !gltfData.scenes) {
          throw new Error('Invalid GLTF structure');
        }
        
        // NEW: Pass the parsed GLTF data to the callback
        onGLTFDataLoaded?.(gltfData);
        
        console.log('✅ GLTF validation passed, ready to load');
        setValidated(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load GLTF';
        console.error('❌ GLTF preload failed:', errorMessage);
        setError(errorMessage);
        onError?.(errorMessage);
      }
    };
    
    if (url) {
      preloadGLTF();
    }
  }, [url, onError, onGLTFDataLoaded]);
  
  // Memoize the processed scene
  const processedScene = useMemo(() => {
    if (validated && gltf?.scene) {
      console.log('✅ GLTF loaded successfully');
      const clonedScene = gltf.scene.clone();
      
      // Scale and center the model
      const bbox = new THREE.Box3().setFromObject(clonedScene);
      const size = bbox.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);
      const scale = maxDimension > 0 ? 4 / maxDimension : 1;
      
      clonedScene.scale.setScalar(scale);
      
      const center = bbox.getCenter(new THREE.Vector3());
      clonedScene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      
      return clonedScene;
    }
    return null;
  }, [validated, gltf]);
  
  if (error) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[3, 0.5, 3]} />
          <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.2} />
        </mesh>
        <Text position={[0, 1, 0]} fontSize={0.2} color="#ffffff" anchorX="center">
          LOAD ERROR
        </Text>
        <Text position={[0, 0.5, 0]} fontSize={0.12} color="#fecaca" anchorX="center">
          {error}
        </Text>
      </group>
    );
  }
  
  if (!validated) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[3, 0.5, 3]} />
          <meshStandardMaterial color="#4a90e2" />
        </mesh>
        <Text position={[0, 1, 0]} fontSize={0.2} color="#ffffff" anchorX="center">
          VALIDATING...
        </Text>
      </group>
    );
  }
  
  if (processedScene) {
    return <primitive object={processedScene} />;
  }
  
  console.warn('⚠️ GLTF loaded but no scene found');
  return (
    <group>
      <mesh>
        <boxGeometry args={[3, 0.5, 3]} />
        <meshStandardMaterial color="#ffa500" />
      </mesh>
      <Text position={[0, 1, 0]} fontSize={0.2} color="#ffffff" anchorX="center">
        NO SCENE
      </Text>
    </group>
  );
});

// Error Boundary specifically for GLTF loading
class GLTFErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: string) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('🚨 GLTF Error Boundary caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 GLTF Component Error:', error, errorInfo);
    this.props.onError?.(error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <group>
          <mesh>
            <boxGeometry args={[3, 0.5, 3]} />
            <meshStandardMaterial color="#ff6b6b" />
          </mesh>
          <Text position={[0, 1, 0]} fontSize={0.2} color="#ffffff" anchorX="center">
            BOUNDARY ERROR
          </Text>
          <Text position={[0, 0.5, 0]} fontSize={0.12} color="#ffcccc" anchorX="center">
            {this.state.error?.message || 'Unknown error'}
          </Text>
        </group>
      );
    }

    return this.props.children;
  }
}

// Enhanced 3D Viewer Component for GLTF models
const Advanced3DViewer: React.FC<{ 
  gltfUrl: string; 
  onError?: (error: string) => void;
  onGLTFDataLoaded?: (gltfData: any) => void;
  enableAutoRotate?: boolean;
  enableZoom?: boolean;
  resetTrigger?: number;
}> = ({ 
  gltfUrl, 
  onError, 
  onGLTFDataLoaded,
  enableAutoRotate = true, 
  enableZoom = true,
  resetTrigger = 0
}) => {
  const [modelBounds, setModelBounds] = useState<{
    size: THREE.Vector3;
    center: THREE.Vector3;
    maxDistance: number;
  } | null>(null);
  const [shouldAutoRotate, setShouldAutoRotate] = useState(enableAutoRotate);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const autoRotateTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { camera, size: canvasSize } = useThree();
  const orbitControlsRef = useRef<any>();
  
  // Load GLTF model
  const gltf = useGLTF(gltfUrl);
  
  // NEW: Download and capture GLTF data for AI analysis
  useEffect(() => {
    if (onGLTFDataLoaded && gltfUrl) {
      const captureGLTFData = async () => {
        try {
          console.log('📥 Downloading GLTF data for AI analysis...');
          const response = await fetch(gltfUrl);
          if (response.ok) {
            const gltfData = await response.json();
            onGLTFDataLoaded(gltfData);
            console.log('✅ GLTF data captured for AI analysis');
          }
        } catch (error) {
          console.warn('⚠️ Failed to capture GLTF data for AI analysis:', error);
        }
      };
      captureGLTFData();
    }
  }, [gltfUrl, onGLTFDataLoaded]);
  
  // Calculate model bounding box and setup camera
  useEffect(() => {
    if (!gltf?.scene) return;
    
    try {
      // Create bounding box
      const boundingBox = new THREE.Box3();
      boundingBox.setFromObject(gltf.scene);
      
      if (boundingBox.isEmpty()) {
        onError?.('Model appears to be empty');
        return;
      }
      
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      boundingBox.getSize(size);
      boundingBox.getCenter(center);
      
      const maxDistance = Math.max(size.x, size.y, size.z);
      
      // Style the model with website theme colors (cyan/purple theme)
      gltf.scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          // Set material color to match website theme (cyan)
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.color = new THREE.Color(0x22d3ee); // cyan-400
                  mat.metalness = 0.3;
                  mat.roughness = 0.4;
                  mat.emissive = new THREE.Color(0x0891b2); // subtle cyan glow
                  mat.emissiveIntensity = 0.1;
                }
              });
            } else if (child.material instanceof THREE.MeshStandardMaterial) {
              child.material.color = new THREE.Color(0x22d3ee); // cyan-400
              child.material.metalness = 0.3;
              child.material.roughness = 0.4;
              child.material.emissive = new THREE.Color(0x0891b2); // subtle cyan glow
              child.material.emissiveIntensity = 0.1;
            }
          }
          
          // Add edge lines with purple theme color for better contrast
          const edges = new THREE.EdgesGeometry(child.geometry, 30);
          const edgeLines = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x8b5cf6, linewidth: 1 }) // purple-500
          );
          child.add(edgeLines);
        }
      });
      
      // Center the model
      gltf.scene.position.sub(center);
      
      setModelBounds({ size, center, maxDistance });
      
      // Setup camera positioning for optimal viewing
      camera.position.set(maxDistance * 2, maxDistance * 2, maxDistance * 2);
      camera.lookAt(0, 0, 0);
      if (camera instanceof THREE.OrthographicCamera) {
        camera.updateProjectionMatrix();
      }
      
    } catch (error) {
      console.error('Error processing GLTF model:', error);
      onError?.('Failed to process 3D model');
    }
  }, [gltf, camera, canvasSize, onError]);
  
  // Auto-rotation logic
  useFrame((state, delta) => {
    if (shouldAutoRotate && !isUserInteracting && orbitControlsRef.current) {
      orbitControlsRef.current.autoRotate = true;
    } else if (orbitControlsRef.current) {
      orbitControlsRef.current.autoRotate = false;
    }
  });
  
  // Handle camera reset
  useEffect(() => {
    if (resetTrigger > 0 && modelBounds && orbitControlsRef.current && camera) {
      // Reset camera position
      const distance = modelBounds.maxDistance * 2;
      camera.position.set(distance, distance, distance);
      camera.lookAt(0, 0, 0);
      
      // Reset orbit controls
      orbitControlsRef.current.reset();
      
      // Update camera if it's orthographic
      if (camera instanceof THREE.OrthographicCamera) {
        camera.updateProjectionMatrix();
      }
      
      console.log('🔄 Camera view reset');
    }
  }, [resetTrigger, modelBounds, camera]);
  
  // Handle user interaction for auto-rotate
  const handleInteractionStart = useCallback(() => {
    setIsUserInteracting(true);
    setShouldAutoRotate(false);
    if (autoRotateTimeoutRef.current) {
      clearTimeout(autoRotateTimeoutRef.current);
    }
  }, []);
  
  const handleInteractionEnd = useCallback(() => {
    setIsUserInteracting(false);
    if (enableAutoRotate) {
      autoRotateTimeoutRef.current = setTimeout(() => {
        setShouldAutoRotate(true);
      }, 3000); // Resume auto-rotate after 3 seconds
    }
  }, [enableAutoRotate]);
  
  if (!modelBounds) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[2, 0.3, 2]} />
          <meshStandardMaterial color="#6366f1" emissive="#4338ca" emissiveIntensity={0.2} />
        </mesh>
        <Text position={[0, 0.5, 0]} fontSize={0.2} color="#ffffff" anchorX="center">
          Loading CAD Model...
        </Text>
      </group>
    );
  }
  
  return (
    <>
      {/* Dynamic Lighting Setup with theme tint */}
      <ambientLight color="#f0f9ff" intensity={2.8} />
      <directionalLight 
        position={[-modelBounds.maxDistance * 2, -modelBounds.maxDistance, modelBounds.maxDistance]} 
        intensity={1.0}
        castShadow
      />
      <directionalLight 
        position={[0, 0, modelBounds.maxDistance * 2]} 
        intensity={1.4}
      />
      <directionalLight 
        position={[-modelBounds.maxDistance * 2, -modelBounds.maxDistance * 2, modelBounds.maxDistance * 2]} 
        intensity={0.8}
      />
      
      {/* Orbit Controls */}
      <OrbitControls
        ref={orbitControlsRef}
        enableDamping
        dampingFactor={0.05}
        enableZoom={enableZoom}
        enableRotate={true}
        enablePan={true}
        autoRotate={shouldAutoRotate}
        autoRotateSpeed={1.0}
        onStart={handleInteractionStart}
        onEnd={handleInteractionEnd}
        maxDistance={modelBounds.maxDistance * 5}
        minDistance={modelBounds.maxDistance * 0.5}
      />
      
      {/* Professional Grid with theme colors */}
      <Grid
        position={[0, -modelBounds.size.y / 2 - 0.1, 0]}
        args={[modelBounds.maxDistance * 4, modelBounds.maxDistance * 4]}
        cellSize={modelBounds.maxDistance / 10}
        cellThickness={0.5}
        cellColor="#374151" // gray-700 - subtle
        sectionSize={modelBounds.maxDistance}
        sectionThickness={1}
        sectionColor="#6366f1" // indigo-500 - theme accent
        fadeDistance={modelBounds.maxDistance * 3}
        fadeStrength={1}
      />
      
      {/* Render the actual GLTF model */}
      <primitive object={gltf.scene} />
    </>
  );
};

// OrthographicCamera Component
const CADCamera: React.FC = () => {
  const { set, size } = useThree();
  
  const camera = useMemo(() => {
    const aspect = size.width / size.height;
    const cam = new THREE.OrthographicCamera(
      -10, 10, 10 / aspect, -10 / aspect, 0.1, 1000
    );
    cam.position.set(10, 10, 10);
    cam.lookAt(0, 0, 0);
    return cam;
  }, [size]);
  
  useEffect(() => {
    set({ camera });
  }, [camera, set]);
  
  return null;
};

// Enhanced CAD Model Component with auto-rotate control
const EnhancedCADModelComponent: React.FC<{ 
  cadModel: any; 
  onGLTFDataLoaded?: (gltfData: any) => void;
  enableAutoRotate?: boolean;
  enableZoom?: boolean;
  resetTrigger?: number;
}> = React.memo(({ cadModel, onGLTFDataLoaded, enableAutoRotate = true, enableZoom = true, resetTrigger = 0 }) => {
  const [loadError, setLoadError] = useState<string | null>(null);
  
  if (!cadModel?.gltfUrl) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[3, 0.5, 3]} />
          <meshStandardMaterial color="#4b5563" emissive="#374151" emissiveIntensity={0.1} />
        </mesh>
        <Text position={[0, 1, 0]} fontSize={0.3} color="#ffffff" anchorX="center">
          No CAD Model Available
        </Text>
      </group>
    );
  }
  
  const handleError = useCallback((error: string) => {
    console.error('CAD Model Error:', error);
    setLoadError(error);
  }, []);
  
  if (loadError) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[3, 0.5, 3]} />
          <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.2} />
        </mesh>
        <Text position={[0, 1, 0]} fontSize={0.2} color="#ffffff" anchorX="center">
          Model Load Error
        </Text>
        <Text position={[0, 0.5, 0]} fontSize={0.1} color="#fecaca" anchorX="center">
          {loadError}
        </Text>
      </group>
    );
  }
  
  return (
    <Suspense fallback={
      <group>
        <mesh>
          <boxGeometry args={[2, 0.3, 2]} />
          <meshStandardMaterial color="#6366f1" emissive="#4338ca" emissiveIntensity={0.2} />
        </mesh>
        <Text position={[0, 0.5, 0]} fontSize={0.2} color="#ffffff" anchorX="center">
          Loading Model...
        </Text>
      </group>
    }>
      <Advanced3DViewer 
        gltfUrl={cadModel.gltfUrl} 
        onError={handleError}
        onGLTFDataLoaded={onGLTFDataLoaded}
        enableAutoRotate={enableAutoRotate}
        enableZoom={enableZoom}
        resetTrigger={resetTrigger}
      />
    </Suspense>
  );
});

// Main scene component with enhanced CAD support
const EnhancedProductScene: React.FC<{ 
  model: ArchitecturalModel; 
  onGLTFDataLoaded?: (gltfData: any) => void;
  enableAutoRotate?: boolean;
  enableZoom?: boolean;
  resetTrigger?: number;
}> = ({ model, onGLTFDataLoaded, enableAutoRotate = true, enableZoom = true, resetTrigger = 0 }) => {
  // Check if this is a CAD model
  if (model?.cadModel) {
    return (
      <EnhancedCADModelComponent 
        cadModel={model.cadModel} 
        onGLTFDataLoaded={onGLTFDataLoaded}
        enableAutoRotate={enableAutoRotate}
        enableZoom={enableZoom}
        resetTrigger={resetTrigger}
      />
    );
  }
  
  // Fallback for non-CAD models
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.0} />
      <Text
        position={[0, 0, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        No 3D model available
      </Text>
    </>
  );
};

// Product Component for rendering individual product parts (Legacy support)
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

  // Check if this is a CAD model
  if (model?.cadModel) {
    return (
      <>
        {/* Enhanced lighting for CAD models */}
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.4} />
        <pointLight position={[10, -10, 10]} intensity={0.3} />

        {/* Professional grid for CAD visualization */}
        <Grid
          position={[0, -0.01, 0]}
          args={[50, 50]}
          cellSize={0.5}
          cellThickness={0.3}
          cellColor="#3f3f3f"
          sectionSize={5}
          sectionThickness={0.8}
          sectionColor="#5f5f5f"
          fadeDistance={30}
          fadeStrength={1}
        />

        {/* Render CAD model */}
        <EnhancedCADModelComponent cadModel={model.cadModel} />

        {/* Professional environment for CAD */}
        <Environment preset="studio" />
      </>
    );
  }

  // Legacy product component rendering
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

// Main ModelViewer3D component with enhanced capabilities
const ModelViewer3D: React.FC<{
  model: ArchitecturalModel | null;
  className?: string;
  onARModeToggle?: (enabled: boolean) => void;
  onModelUpdate?: (model: ArchitecturalModel) => void;
  onGLTFDataLoaded?: (gltfData: any) => void;
}> = ({
  model,
  className = '',
  onARModeToggle,
  onModelUpdate,
  onGLTFDataLoaded
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
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetTrigger, setResetTrigger] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check WebGL support on mount
  useEffect(() => {
    const isSupported = checkWebGLSupport();
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
    console.log('🎯 Reset camera triggered');
    setResetTrigger(prev => prev + 1);
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

  if (!model) {
    return (
      <div className={`flex items-center justify-center h-96 bg-white/5 border border-white/20 rounded-2xl ${className}`}>
        <p className="text-gray-400">No model to display. Generate a model first.</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-white/5 border border-white/20 rounded-2xl overflow-hidden ${className}`}>
      {/* Enhanced 3D Canvas with OrthographicCamera */}
      <ThreeJSErrorBoundary fallback={<ModelError onRetry={resetCamera} />}>
        <Canvas
          ref={canvasRef}
          shadows
          className="w-full h-96"
          gl={{ 
            powerPreference: "high-performance",
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true
          }}
          dpr={[1, 2]}
        >
          <Suspense fallback={
            <group>
              <mesh>
                <boxGeometry args={[2, 0.3, 2]} />
                <meshStandardMaterial color="#6366f1" emissive="#4338ca" emissiveIntensity={0.2} />
              </mesh>
              <Text position={[0, 0.5, 0]} fontSize={0.2} color="#ffffff" anchorX="center">
                Loading 3D Viewer...
              </Text>
            </group>
          }>
            <EnhancedProductScene 
              model={model} 
              onGLTFDataLoaded={onGLTFDataLoaded}
              enableAutoRotate={autoRotate}
              enableZoom={true}
              resetTrigger={resetTrigger}
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

      {/* Enhanced Controls Panel */}
      {showControls && !arSession.active && (
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                autoRotate 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Auto Rotate
            </button>
            
            <button
              onClick={resetCamera}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              <Eye className="w-4 h-4" />
              Reset View
            </button>
            
            <button
              onClick={exportImage}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export PNG
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
      
      {/* Enhanced Model Info */}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
        <h4 className="font-medium mb-1">{model.name}</h4>
        {model.cadModel ? (
          <>
            <p className="text-gray-300">
              CAD Model • {model.cadModel.properties?.volume?.toLocaleString() || 'N/A'} mm³
            </p>
            <p className="text-gray-400 text-xs">
              {model.cadModel.properties?.complexity || 'Professional'} • AgenticadML Engine
            </p>
            {model.cadModel.gltfUrl && (
              <p className="text-green-400 text-xs">✓ 360° Interactive View</p>
            )}
          </>
        ) : (
          <>
            <p className="text-gray-300">{model.rooms?.length || 0} components</p>
            <p className="text-gray-400 text-xs">{model.style} style</p>
          </>
        )}
      </div>
      
      {/* View Mode Indicator */}
      <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
        CAD VIEWER • 360°
      </div>
    </div>
  );
};

export default ModelViewer3D; 