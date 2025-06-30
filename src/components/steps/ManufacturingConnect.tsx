import React, { useState, useEffect } from 'react';
import { MapPin, Star, Clock, DollarSign, Send, Filter } from 'lucide-react';
import { ArchitecturalModel } from '../../types/architectural';

interface ManufacturingConnectProps {
  model: ArchitecturalModel | null;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

const ManufacturingConnect: React.FC<ManufacturingConnectProps> = ({ model, onNext }) => {
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedMaterial, setSelectedMaterial] = useState('all');
  const [selectedManufacturer, setSelectedManufacturer] = useState<number | null>(null);
  const [manufacturers, setManufacturers] = useState<any[]>([]);

  // Generate manufacturers based on the actual product specifications
  useEffect(() => {
    if (model?.productSpecs) {
      const productSpecs = model.productSpecs;
      const materials = productSpecs.manufacturing?.materials || ['plastic'];
      const method = productSpecs.manufacturing?.method || 'injection molding';
      const complexity = productSpecs.manufacturing?.complexity || 'moderate';
      const estimatedCost = productSpecs.manufacturing?.estimated_cost || '$50-100';
      
      // Generate realistic manufacturers based on product requirements
      const generatedManufacturers = [
        {
          id: 1,
          name: "PrecisionTech Manufacturing",
          location: "San Francisco, CA",
          rating: 4.8,
          reviews: 127,
          specialties: materials.slice(0, 3),
          minOrder: complexity === 'simple' ? 25 : complexity === 'complex' ? 100 : 50,
          leadTime: method.includes('3D printing') ? "1-2 weeks" : method.includes('injection molding') ? "3-4 weeks" : "2-3 weeks",
          priceRange: estimatedCost,
          certifications: ["ISO 9001", "AS9100"],
          image: "https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=400"
        },
        {
          id: 2,
          name: "Advanced Prototype Solutions",
          location: "Austin, TX", 
          rating: 4.6,
          reviews: 89,
          specialties: [method, ...materials.slice(0, 2)],
          minOrder: Math.max(25, Math.floor(Math.random() * 50 + 25)),
          leadTime: complexity === 'simple' ? "1-2 weeks" : "2-4 weeks",
          priceRange: estimatedCost,
          certifications: ["ISO 14001", "IATF 16949"],
          image: "https://images.pexels.com/photos/1267360/pexels-photo-1267360.jpeg?auto=compress&cs=tinysrgb&w=400"
        },
        {
          id: 3,
          name: "Global Production Partners",
          location: "Shenzhen, China",
          rating: 4.9,
          reviews: 245,
          specialties: ["Mass Production", method, materials[0] || 'plastic'],
          minOrder: complexity === 'simple' ? 50 : 100,
          leadTime: "3-5 weeks",
          priceRange: estimatedCost.replace(/\$(\d+)-(\d+)/, (_, min, max) => `$${Math.floor(+min * 0.7)}-${Math.floor(+max * 0.8)}`),
          certifications: ["ISO 9001", "FDA"],
          image: "https://images.pexels.com/photos/1267364/pexels-photo-1267364.jpeg?auto=compress&cs=tinysrgb&w=400"
        }
      ];
      
      setManufacturers(generatedManufacturers);
    } else {
      // Fallback manufacturers if no product specs
      setManufacturers([
        {
          id: 1,
          name: "General Manufacturing Co.",
          location: "Various Locations",
          rating: 4.5,
          reviews: 50,
          specialties: ["General Production"],
          minOrder: 50,
          leadTime: "2-3 weeks",
          priceRange: "$50-100",
          certifications: ["ISO 9001"],
          image: "https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=400"
        }
      ]);
    }
  }, [model]);

  const handleRequestQuote = (manufacturerId: number) => {
    setSelectedManufacturer(manufacturerId);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {!selectedManufacturer ? (
        <>
          {/* Filters */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-6 h-6 text-cyan-400" />
              <h3 className="text-xl font-bold text-white">Find the Perfect Manufacturer</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  style={{ color: 'white' }}
                >
                  <option value="all" style={{ backgroundColor: '#1f2937', color: 'white' }}>All Locations</option>
                  <option value="local" style={{ backgroundColor: '#1f2937', color: 'white' }}>Local (US)</option>
                  <option value="international" style={{ backgroundColor: '#1f2937', color: 'white' }}>International</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Material</label>
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  style={{ color: 'white' }}
                >
                  <option value="all" style={{ backgroundColor: '#1f2937', color: 'white' }}>All Materials</option>
                  <option value="aluminum" style={{ backgroundColor: '#1f2937', color: 'white' }}>Aluminum</option>
                  <option value="steel" style={{ backgroundColor: '#1f2937', color: 'white' }}>Steel</option>
                  <option value="carbon-fiber" style={{ backgroundColor: '#1f2937', color: 'white' }}>Carbon Fiber</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Min Order</label>
                <select 
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  style={{ color: 'white' }}
                >
                  <option value="any" style={{ backgroundColor: '#1f2937', color: 'white' }}>Any Quantity</option>
                  <option value="1-50" style={{ backgroundColor: '#1f2937', color: 'white' }}>1-50 units</option>
                  <option value="50-100" style={{ backgroundColor: '#1f2937', color: 'white' }}>50-100 units</option>
                  <option value="100+" style={{ backgroundColor: '#1f2937', color: 'white' }}>100+ units</option>
                </select>
              </div>
            </div>
          </div>

          {/* Manufacturer List */}
          <div className="space-y-6">
            {manufacturers.map((manufacturer) => (
              <div
                key={manufacturer.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-cyan-400/30 transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <img
                    src={manufacturer.image}
                    alt={manufacturer.name}
                    className="w-full md:w-32 h-32 object-cover rounded-xl"
                  />
                  
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">{manufacturer.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {manufacturer.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            {manufacturer.rating} ({manufacturer.reviews} reviews)
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-cyan-400">{manufacturer.priceRange}</div>
                        <div className="text-sm text-gray-400">per unit</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-400">Specialties</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {manufacturer.specialties.map((specialty, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded-full"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Lead Time</div>
                        <div className="flex items-center gap-1 text-white mt-1">
                          <Clock className="w-4 h-4" />
                          {manufacturer.leadTime}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Min Order</div>
                        <div className="text-white mt-1">{manufacturer.minOrder} units</div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="mb-4 md:mb-0">
                        <div className="text-sm text-gray-400 mb-1">Certifications</div>
                        <div className="flex gap-2">
                          {manufacturer.certifications.map((cert, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded border border-green-500/30"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRequestQuote(manufacturer.id)}
                        className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300"
                      >
                        Request Quote
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Quote Request Form */
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6">Request Manufacturing Quote</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Quantity</label>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Material Preference</label>
                <select 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  style={{ color: 'white' }}
                >
                  <option style={{ backgroundColor: '#1f2937', color: 'white' }}>Aluminum (Recommended)</option>
                  <option style={{ backgroundColor: '#1f2937', color: 'white' }}>Steel</option>
                  <option style={{ backgroundColor: '#1f2937', color: 'white' }}>Carbon Fiber</option>
                  <option style={{ backgroundColor: '#1f2937', color: 'white' }}>Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Timeline</label>
                <select 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  style={{ color: 'white' }}
                >
                  <option style={{ backgroundColor: '#1f2937', color: 'white' }}>ASAP</option>
                  <option style={{ backgroundColor: '#1f2937', color: 'white' }}>Within 1 month</option>
                  <option style={{ backgroundColor: '#1f2937', color: 'white' }}>1-3 months</option>
                  <option style={{ backgroundColor: '#1f2937', color: 'white' }}>3+ months</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Special Requirements</label>
                <textarea
                  placeholder="Any special requirements or notes..."
                  className="w-full h-32 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:border-cyan-400"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Contact Email</label>
                <input
                  type="email"
                  placeholder="your.email@company.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mt-8">
            <button
              onClick={() => setSelectedManufacturer(null)}
              className="px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              Back to Manufacturers
            </button>
            <button
              onClick={onNext}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300"
            >
              Send Quote Request
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManufacturingConnect;