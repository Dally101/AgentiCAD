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
    <div className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">Describe Your Product Idea</h3>
        <p className="text-gray-300 text-sm">
          Use any combination of text, voice, sketches, or photos to communicate your product design concept
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-white/5 rounded-lg p-1">
        {[
          { id: 'text', label: 'Text', icon: <Type className="w-4 h-4" /> },
          { id: 'voice', label: 'Voice', icon: <Mic className="w-4 h-4" /> },
          { id: 'sketch', label: 'Sketch', icon: <Edit3 className="w-4 h-4" /> },
          { id: 'camera', label: 'Camera', icon: <Camera className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setState(prev => ({ ...prev, activeTab: tab.id as any }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              state.activeTab === tab.id
                ? 'bg-cyan-500 text-white'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab.icon}
            {tab.label}
            {state.inputs[tab.id as keyof MultimodalInput] && (
              <CheckCircle className="w-3 h-3 text-green-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* Text Input */}
        {state.activeTab === 'text' && (
          <div className="space-y-4">
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Describe your product idea in detail... (e.g., 'I want a wireless phone charger with a sleek aluminum base, LED charging indicator, and magnetic alignment for easy placement')"
              className="w-full h-40 p-4 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:border-cyan-400"
            />
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">{textContent.length} characters</span>
              <button
                onClick={handleTextSubmit}
                disabled={!textContent.trim()}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-600 transition-colors"
              >
                Add Text Input
              </button>
            </div>
          </div>
        )}

        {/* Voice Input */}
        {state.activeTab === 'voice' && (
          <div className="space-y-4">
            <div className="text-center">
              {!state.isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors"
                >
                  <Mic className="w-8 h-8 text-white" />
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-20 h-20 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors animate-pulse"
                >
                  <MicOff className="w-8 h-8 text-white" />
                </button>
              )}
              
              {state.isRecording && (
                <div className="text-red-400 font-mono text-lg">
                  Recording: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>

            {transcript && (
              <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
                <h4 className="text-white font-medium mb-2">Live Transcript:</h4>
                <p className="text-gray-300">{transcript}</p>
              </div>
            )}

            {audioBlob && !state.isRecording && (
              <div className="flex justify-center">
                <button
                  onClick={submitVoiceInput}
                  className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                >
                  Add Voice Input
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sketch Input */}
        {state.activeTab === 'sketch' && (
          <div className="space-y-4">
            {/* Drawing Tools */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  {[
                    { tool: 'pen', icon: <Edit3 className="w-4 h-4" /> },
                    { tool: 'line', icon: <Minus className="w-4 h-4" /> },
                    { tool: 'rectangle', icon: <Square className="w-4 h-4" /> },
                    { tool: 'circle', icon: <Circle className="w-4 h-4" /> }
                  ].map(({ tool, icon }) => (
                    <button
                      key={tool}
                      onClick={() => setCurrentTool(tool as any)}
                      className={`p-2 rounded-lg transition-colors ${
                        currentTool === tool
                          ? 'bg-cyan-500 text-white'
                          : 'bg-white/10 text-gray-300 hover:text-white'
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
                  className="w-10 h-10 rounded-lg border border-white/20"
                />
                
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-20"
                />
              </div>
              
              <button
                onClick={clearCanvas}
                className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
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
              className="w-full border border-white/20 rounded-lg bg-white cursor-crosshair"
              style={{ maxHeight: '400px' }}
            />

            <div className="flex justify-center">
              <button
                onClick={submitSketch}
                disabled={strokes.length === 0}
                className="px-6 py-2 bg-cyan-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-600 transition-colors"
              >
                Add Sketch Input
              </button>
            </div>
          </div>
        )}

        {/* Camera Input */}
        {state.activeTab === 'camera' && (
          <div className="space-y-4">
            {!state.isCameraActive ? (
              <div className="text-center">
                <button
                  onClick={startCamera}
                  className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                >
                  Start Camera
                </button>
                <p className="text-gray-400 text-sm mt-2">
                  Capture photos of existing spaces or reference images
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {!capturedPhoto ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg"
                      style={{ maxHeight: '300px' }}
                    />
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={capturePhoto}
                        className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                      >
                        Capture Photo
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
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
                      className="w-full rounded-lg"
                      style={{ maxHeight: '300px', objectFit: 'contain' }}
                    />
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={submitPhoto}
                        className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                      >
                        Add Photo Input
                      </button>
                      <button
                        onClick={() => setCapturedPhoto(null)}
                        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
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
        <div className="mt-6 pt-6 border-t border-white/20">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              Ready inputs: {Object.keys(state.inputs).join(', ')}
            </div>
            <button
              onClick={handleSubmit}
              disabled={isProcessing}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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