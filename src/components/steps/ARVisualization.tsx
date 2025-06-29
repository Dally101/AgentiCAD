import React, { useState } from 'react';
import { Camera, Smartphone, Download, Settings } from 'lucide-react';

interface ARVisualizationProps {
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

const ARVisualization: React.FC<ARVisualizationProps> = ({ onNext }) => {
  const [isARActive, setIsARActive] = useState(false);
  const [scale, setScale] = useState(100);

  const handleStartAR = () => {
    setIsARActive(true);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {!isARActive ? (
        /* AR Setup */
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 flex items-center justify-center">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Experience Your Design in AR</h3>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              See how your foldable chair looks and fits in your actual space. 
              Use your device's camera to place the 3D model in your environment.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Smartphone className="w-8 h-8 text-cyan-400 mb-3" />
                <h4 className="font-semibold text-white mb-2">Mobile Device</h4>
                <p className="text-gray-400 text-sm">Best experience on phone or tablet with camera</p>
              </div>
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Settings className="w-8 h-8 text-purple-400 mb-3" />
                <h4 className="font-semibold text-white mb-2">Camera Permission</h4>
                <p className="text-gray-400 text-sm">Allow camera access for AR visualization</p>
              </div>
            </div>

            <button
              onClick={handleStartAR}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105"
            >
              Start AR Experience
            </button>
          </div>
        </div>
      ) : (
        /* AR Viewer */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">AR View</h3>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-400">Live Camera</span>
                </div>
              </div>
              
              {/* Mock AR View */}
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-white/10 relative overflow-hidden">
                {/* Simulated camera feed background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-green-900/20"></div>
                
                {/* Virtual chair in AR space */}
                <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2">
                  <div 
                    className="bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg shadow-2xl transition-all duration-300"
                    style={{ 
                      width: `${scale * 0.6}px`, 
                      height: `${scale * 0.8}px`,
                      transform: `perspective(500px) rotateX(-10deg)`
                    }}
                  >
                    <div className="w-full h-full bg-white/10 rounded-lg"></div>
                  </div>
                </div>
                
                {/* AR UI Elements */}
                <div className="absolute top-4 left-4 px-3 py-1 bg-cyan-500 text-white text-sm rounded-full">
                  AR Active
                </div>
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button className="p-2 bg-white/20 rounded-full text-white">
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Scale indicator */}
                <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 text-white text-sm rounded-lg">
                  Scale: {scale}%
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">AR Controls</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Scale</label>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>50%</span>
                    <span>150%</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-sm font-semibold text-white mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <button className="w-full p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm">
                      Reset Position
                    </button>
                    <button className="w-full p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm">
                      Rotate 90°
                    </button>
                    <button className="w-full p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Save AR Photo
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Placement Tips</h3>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Find a flat surface with good lighting</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Move your device slowly to track the surface</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Tap to place the object in your space</span>
                </div>
              </div>
            </div>

            <button
              onClick={onNext}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300"
            >
              Refine Design
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARVisualization;