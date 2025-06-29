import React from 'react';
import { Lightbulb, Zap, Eye, Users, Search, ArrowRight, Sparkles, Cpu, Wrench, Hand } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const features = [
    {
      icon: <Lightbulb className="w-8 h-8" />,
      title: "Describe Your Idea",
      description: "Simply tell our AI what you want to create in plain language"
    },
    {
      icon: <Cpu className="w-8 h-8" />,
      title: "AI-Generated CAD",
      description: "Watch as AI transforms your words into professional 3D models"
    },
    {
      icon: <Hand className="w-8 h-8" />,
      title: "AR Visualization",
      description: "See your prototype in the real world with augmented reality"
    },
    {
      icon: <Wrench className="w-8 h-8" />,
      title: "Easy Iterations",
      description: "Refine your design with simple conversational commands"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Find Manufacturers",
      description: "Connect with verified manufacturers to bring your idea to life"
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: "Patent Search",
      description: "Ensure your idea is unique with integrated patent research"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-8 h-8 text-cyan-400" />
            <span className="text-2xl font-bold text-white">AgentiCAD</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
            <a href="#process" className="text-gray-300 hover:text-white transition-colors">How it Works</a>
            <a href="#about" className="text-gray-300 hover:text-white transition-colors">About</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Zap className="w-4 h-4 text-yellow-400 mr-2" />
              <span className="text-white/90 text-sm">Powered by Advanced AI</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Bring Your Ideas to
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent"> Life</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
              Transform your hardware product ideas into physical prototypes without any CAD skills. 
              Our AI handles the complexity, you focus on the creativity.
            </p>
            <p className="text-lg md:text-xl text-cyan-400 font-medium mb-8 italic">
              "If you can imagine it, we can prototype it"
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              onClick={onGetStarted}
              className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105"
            >
              <span className="flex items-center">
                Start Designing
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button className="px-8 py-4 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
              Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-2">10K+</div>
              <div className="text-gray-400">Prototypes Created</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">98%</div>
              <div className="text-gray-400">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-2">24hrs</div>
              <div className="text-gray-400">Average Design Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Everything You Need to
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent"> Prototype</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our comprehensive platform handles every step of the prototyping process, 
              from initial concept to final manufacturing connections.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-cyan-400/30 transition-all duration-300 hover:transform hover:scale-105"
              >
                <div className="text-cyan-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Simple 6-Step
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent"> Process</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              From idea to prototype in just a few clicks. No technical expertise required.
            </p>
          </div>

          <div className="space-y-8">
            {[
              { step: 1, title: "Describe Your Idea", desc: "Tell us what you want to create in plain language" },
              { step: 2, title: "AI Generates CAD", desc: "Watch as our AI creates a professional 3D model" },
              { step: 3, title: "Visualize in AR", desc: "See your design in your real environment" },
              { step: 4, title: "Refine Design", desc: "Make changes with simple conversational commands" },
              { step: 5, title: "Find Manufacturers", desc: "Connect with verified manufacturers worldwide" },
              { step: 6, title: "Patent Search", desc: "Ensure your idea is unique and patentable" }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-8 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Build Your
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent"> Dream Prototype?</span>
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of inventors who've brought their ideas to life with AgentiCAD. 
            Start your prototyping journey today.
          </p>
          <button
            onClick={onGetStarted}
            className="group px-12 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105 text-lg"
          >
            <span className="flex items-center">
              Get Started for Free
              <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;