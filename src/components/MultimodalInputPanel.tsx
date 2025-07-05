import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Camera, 
  Edit3, 
  Type, 
  Square, 
  Circle, 
  Minus, 
  RotateCcw, 
  Download,
  Upload,
  Play,
  Pause,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import type { 
  MultimodalInput, 
  TextInput, 
  VoiceInput, 
  SketchInput, 
  PhotoInput,
  SketchStroke,
  InputPanelState
} from '../types/architectural';

interface MultimodalInputPanelProps {
  onSubmit: (input: MultimodalInput) => void;
  onInputChange?: (input: Partial<MultimodalInput>) => void;
  isProcessing?: boolean;
  className?: string;
}

const MultimodalInputPanel: React.FC<MultimodalInputPanelProps> = ({
  onSubmit,
  onInputChange,
  isProcessing = false,
  className = ''
}) => {
  const [state, setState] = useState<InputPanelState>({
    activeTab: 'text',
    isRecording: false,
    isDrawing: false,
    isCameraActive: false,
    inputs: {}
  });

  // Text input state
  const [textContent, setTextContent] = useState('');
  
  // Voice input state
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sketch input state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'line' | 'rectangle' | 'circle'>('pen');
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState('#000000');
  const [strokes, setStrokes] = useState<SketchStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  // Camera input state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const updateInputs = useCallback((newInputs: Partial<MultimodalInput>) => {
    setState(prev => ({
      ...prev,
      inputs: { ...prev.inputs, ...newInputs }
    }));
    onInputChange?.(newInputs);
  }, [onInputChange]);

  // Text Input Handlers
  const handleTextSubmit = useCallback(() => {
    if (!textContent.trim()) return;
    
    const textInput: TextInput = {
      type: 'text',
      content: textContent.trim(),
      timestamp: new Date()
    };
    
    updateInputs({ text: textInput });
  }, [textContent, updateInputs]);

  // Voice Input Handlers
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      // Start speech recognition if available
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      setState(prev => ({ ...prev, isRecording: true }));
      
      // Start timer
      const startTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      recognitionRef.current?.stop();
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      setState(prev => ({ ...prev, isRecording: false }));
    }
  }, [state.isRecording]);

  const submitVoiceInput = useCallback(() => {
    if (!audioBlob) return;

    const voiceInput: VoiceInput = {
      type: 'voice',
      audioBlob,
      transcript,
      duration: recordingDuration,
      timestamp: new Date()
    };

    updateInputs({ voice: voiceInput });
  }, [audioBlob, transcript, recordingDuration, updateInputs]);

  // Sketch Input Handlers
  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setIsDrawing(true);
    setLastPoint({ x, y });
  }, []);

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !lastPoint) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    setLastPoint({ x, y });
  }, [isDrawing, lastPoint, currentTool, brushSize, brushColor]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);
    setLastPoint(null);

    // Save the stroke
    const canvas = canvasRef.current;
    if (canvas) {
      const imageData = canvas.toDataURL();
      // This is a simplified stroke recording - in a real app you'd track actual strokes
      const newStroke: SketchStroke = {
        points: [], // In practice, you'd collect all points during drawing
        color: brushColor,
        width: brushSize,
        tool: currentTool
      };
      setStrokes(prev => [...prev, newStroke]);
    }
  }, [isDrawing, brushColor, brushSize, currentTool]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setStrokes([]);
  }, []);

  const submitSketch = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL();
    const sketchInput: SketchInput = {
      type: 'sketch',
      imageData,
      strokes,
      dimensions: {
        width: canvas.width,
        height: canvas.height
      },
      timestamp: new Date()
    };

    updateInputs({ sketch: sketchInput });
  }, [strokes, updateInputs]);

  // Camera Input Handlers
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setState(prev => ({ ...prev, isCameraActive: true }));
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraStream) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(imageData);
    }
  }, [cameraStream]);

  const submitPhoto = useCallback(() => {
    if (!capturedPhoto) return;

    const photoInput: PhotoInput = {
      type: 'photo',
      imageData: capturedPhoto,
      metadata: {
        width: videoRef.current?.videoWidth || 0,
        height: videoRef.current?.videoHeight || 0,
        device: navigator.userAgent
      },
      timestamp: new Date()
    };

    updateInputs({ photo: photoInput });
  }, [capturedPhoto, updateInputs]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setState(prev => ({ ...prev, isCameraActive: false }));
    setCapturedPhoto(null);
  }, [cameraStream]);

  // Submit all inputs
  const handleSubmit = useCallback(() => {
    const hasInputs = Object.keys(state.inputs).length > 0;
    if (!hasInputs) return;

    const multimodalInput: MultimodalInput = {
      ...state.inputs,
      combined: Object.keys(state.inputs).length > 1
    };

    onSubmit(multimodalInput);
  }, [state.inputs, onSubmit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [stopCamera]);

  return (
    <div className={`bg-gradient-to-br from-purple-900/90 to-purple-800/90 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-8 ${className}`}>
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-white mb-3">Describe Your Product Idea</h3>
        <p className="text-gray-300 text-base leading-relaxed">
          Use any combination of text, voice, sketches, or photos to communicate your product design concept
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-8 bg-black/20 rounded-xl p-2">
        {[
          { id: 'text', label: 'Text', icon: <Type className="w-4 h-4" /> },
          { id: 'voice', label: 'Voice', icon: <Mic className="w-4 h-4" /> },
          { id: 'sketch', label: 'Sketch', icon: <Edit3 className="w-4 h-4" /> },
          { id: 'camera', label: 'Camera', icon: <Camera className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setState(prev => ({ ...prev, activeTab: tab.id as any }))}
            className={`flex items-center gap-3 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              state.activeTab === tab.id
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab.icon}
            {tab.label}
            {state.inputs[tab.id as keyof MultimodalInput] && (
              <CheckCircle className="w-4 h-4 text-green-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[350px]">
        {/* Text Input */}
        {state.activeTab === 'text' && (
          <div className="space-y-6">
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Describe your product idea in detail... (e.g., 'I want a wireless phone charger with a sleek aluminum base, LED charging indicator, and magnetic alignment for easy placement')"
              className="w-full h-48 p-6 bg-black/20 border border-purple-400/30 rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
            />
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">{textContent.length} characters</span>
              <button
                onClick={handleTextSubmit}
                disabled={!textContent.trim()}
                className="px-6 py-3 bg-cyan-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/25"
              >
                Add Text Input
              </button>
            </div>
          </div>
        )}

        {/* Voice Input */}
        {state.activeTab === 'voice' && (
          <div className="space-y-6">
            <div className="text-center">
              {!state.isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-200 shadow-xl shadow-red-500/30"
                >
                  <Mic className="w-10 h-10 text-white" />
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-24 h-24 bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-200 animate-pulse shadow-xl"
                >
                  <MicOff className="w-10 h-10 text-white" />
                </button>
              )}
              
              {state.isRecording && (
                <div className="text-red-400 font-mono text-xl font-bold">
                  Recording: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>

            {transcript && (
              <div className="p-6 bg-black/20 border border-purple-400/30 rounded-xl">
                <h4 className="text-white font-semibold mb-3">Live Transcript:</h4>
                <p className="text-gray-300 leading-relaxed">{transcript}</p>
              </div>
            )}

            {audioBlob && !state.isRecording && (
              <div className="flex justify-center">
                <button
                  onClick={submitVoiceInput}
                  className="px-8 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/25"
                >
                  Add Voice Input
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sketch Input */}
        {state.activeTab === 'sketch' && (
          <div className="space-y-6">
            {/* Drawing Tools */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex gap-3">
                  {[
                    { tool: 'pen', icon: <Edit3 className="w-4 h-4" /> },
                    { tool: 'line', icon: <Minus className="w-4 h-4" /> },
                    { tool: 'rectangle', icon: <Square className="w-4 h-4" /> },
                    { tool: 'circle', icon: <Circle className="w-4 h-4" /> }
                  ].map(({ tool, icon }) => (
                    <button
                      key={tool}
                      onClick={() => setCurrentTool(tool as any)}
                      className={`p-3 rounded-xl transition-all duration-200 ${
                        currentTool === tool
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                          : 'bg-black/20 text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-12 h-12 rounded-xl border-2 border-purple-400/30 bg-black/20"
                />
                
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-24 accent-cyan-500"
                />
              </div>
              
              <button
                onClick={clearCanvas}
                className="flex items-center gap-2 px-4 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors border border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              width={600}
              height={400}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full border-2 border-purple-400/30 rounded-xl bg-white cursor-crosshair shadow-lg"
              style={{ maxHeight: '400px' }}
            />

            <div className="flex justify-center">
              <button
                onClick={submitSketch}
                disabled={strokes.length === 0}
                className="px-8 py-3 bg-cyan-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/25"
              >
                Add Sketch Input
              </button>
            </div>
          </div>
        )}

        {/* Camera Input */}
        {state.activeTab === 'camera' && (
          <div className="space-y-6">
            {!state.isCameraActive ? (
              <div className="text-center py-12">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <button
                  onClick={startCamera}
                  className="px-8 py-4 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/25"
                >
                  Start Camera
                </button>
                <p className="text-gray-400 text-sm mt-4">
                  Capture photos of existing spaces or reference images
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {!capturedPhoto ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-xl border-2 border-purple-400/30 shadow-lg"
                      style={{ maxHeight: '300px' }}
                    />
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={capturePhoto}
                        className="px-8 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/25"
                      >
                        Capture Photo
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-8 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
                      >
                        Stop Camera
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <img
                      src={capturedPhoto}
                      alt="Captured"
                      className="w-full rounded-xl border-2 border-purple-400/30 shadow-lg"
                      style={{ maxHeight: '300px', objectFit: 'contain' }}
                    />
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={submitPhoto}
                        className="px-8 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/25"
                      >
                        Add Photo Input
                      </button>
                      <button
                        onClick={() => setCapturedPhoto(null)}
                        className="px-8 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
                      >
                        Retake
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit Section */}
      {Object.keys(state.inputs).length > 0 && (
        <div className="mt-8 pt-8 border-t border-purple-400/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              Ready inputs: <span className="text-cyan-400 font-medium">{Object.keys(state.inputs).join(', ')}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isProcessing}
              className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-xl shadow-cyan-500/30"
            >
              {isProcessing ? 'Generating Model...' : 'Generate 3D Model'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultimodalInputPanel; 