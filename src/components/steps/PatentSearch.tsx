import React, { useState } from 'react';
import { Search, FileText, ExternalLink, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface PatentSearchProps {
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

const PatentSearch: React.FC<PatentSearchProps> = ({ onNext }) => {
  const [searchQuery, setSearchQuery] = useState('foldable chair with cup holder');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const mockResults = [
    {
      id: 1,
      title: "Portable Folding Chair with Integrated Beverage Holder",
      patentNumber: "US10,123,456",
      inventor: "John Smith",
      assignee: "Outdoor Furniture Inc.",
      filingDate: "2019-03-15",
      publicationDate: "2020-09-22",
      status: "Active",
      similarity: 85,
      abstract: "A portable folding chair comprising a frame assembly and a beverage holder integrated into the armrest structure..."
    },
    {
      id: 2,
      title: "Collapsible Seating Device with Attached Cup Support",
      patentNumber: "US9,987,654",
      inventor: "Sarah Johnson",
      assignee: "Camping Solutions LLC",
      filingDate: "2018-11-08",
      publicationDate: "2020-05-14",
      status: "Active",
      similarity: 72,
      abstract: "A collapsible chair design featuring a detachable cup holder mechanism that can be positioned on either side..."
    },
    {
      id: 3,
      title: "Foldable Chair with Multiple Accessory Attachments",
      patentNumber: "US10,567,890",
      inventor: "Mike Chen",
      assignee: "Innovation Furniture Co.",
      filingDate: "2020-01-20",
      publicationDate: "2021-07-30",
      status: "Pending",
      similarity: 68,
      abstract: "A modular folding chair system allowing for various accessory attachments including beverage holders, phone mounts..."
    }
  ];

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(false);
    
    // Simulate search delay
    setTimeout(() => {
      setSearchResults(mockResults);
      setIsSearching(false);
      setHasSearched(true);
    }, 2000);
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 80) return 'text-red-400';
    if (similarity >= 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Search Header */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-cyan-400" />
          <h3 className="text-2xl font-bold text-white">Patent Search & Analysis</h3>
        </div>
        
        <p className="text-gray-300 text-lg mb-6 leading-relaxed">
          Ensure your foldable chair design is unique and doesn't infringe on existing patents. 
          Our AI-powered search analyzes your design against millions of patents worldwide.
        </p>

        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Describe your invention for patent search..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
              searchQuery.trim() && !isSearching
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-600 hover:to-purple-600'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSearching ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Searching...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Patents
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">Search Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400 mb-2">{searchResults.length}</div>
                <div className="text-gray-400">Similar Patents Found</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">85%</div>
                <div className="text-gray-400">Highest Similarity</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">Medium</div>
                <div className="text-gray-400">Risk Level</div>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              <h4 className="text-lg font-bold text-white">Risk Assessment</h4>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 mb-3">
                <strong>Medium Risk:</strong> Similar patents exist but may have different enough features to allow your design.
              </p>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Your design includes unique folding mechanism</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span>Cup holder integration is common in existing patents</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Specific materials and construction may differentiate</span>
                </div>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-4">
              <strong>Recommendation:</strong> Consider consulting with a patent attorney for detailed analysis and potential design modifications.
            </p>
          </div>

          {/* Patent Results */}
          <div className="space-y-4">
            {searchResults.map((patent) => (
              <div
                key={patent.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h5 className="text-lg font-semibold text-white">{patent.title}</h5>
                      <span className={`text-sm font-medium ${getSimilarityColor(patent.similarity)}`}>
                        {patent.similarity}% Similar
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {patent.patentNumber}
                      </div>
                      <div>Inventor: {patent.inventor}</div>
                      <div>Filed: {patent.filingDate}</div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        patent.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {patent.status}
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{patent.abstract}</p>
                  </div>
                  <button className="mt-4 md:mt-0 md:ml-4 flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                    View Full Patent
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Next Steps */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h4 className="text-xl font-bold text-white mb-6">Recommended Next Steps</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-semibold text-white mb-3">Patent Strategy</h5>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Consider filing a provisional patent application</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Modify design to reduce similarity to existing patents</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Conduct professional patent search and analysis</span>
                  </div>
                </div>
              </div>
              <div>
                <h5 className="font-semibold text-white mb-3">Legal Consultation</h5>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Consult with a qualified patent attorney</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Review freedom to operate analysis</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Explore international patent protection</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <button 
                onClick={onNext}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105"
              >
                Complete Prototype Journey
              </button>
              <p className="text-gray-400 text-sm mt-3">
                Congratulations! You've successfully completed all steps of the prototyping process.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatentSearch;