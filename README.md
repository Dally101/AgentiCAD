# 🚀 **AgentiCAD - AI-Powered Product Design Platform**

*Transform your ideas into manufacturable products with the power of AI*

![AgentiCAD Banner](./public/image.png)

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-idea2prototype.netlify.app-00D9FF?style=for-the-badge)](https://idea2prototype.netlify.app/)
[![GitHub Stars](https://img.shields.io/github/stars/Dally101/AgentiCAD?style=for-the-badge&logo=github)](https://github.com/Dally101/AgentiCAD)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

---

## 🌟 **Vision & Mission**

### **💡 The Inspiration**

In today's rapidly evolving world, brilliant product ideas often remain trapped in the minds of inventors, entrepreneurs, and creators who lack the technical expertise or resources to bring them to life. Traditional product development requires expensive CAD software, engineering knowledge, manufacturing connections, and significant time investment - barriers that exclude millions of innovators.

**AgentiCAD was born from a simple yet powerful vision**: *What if anyone could transform their product idea into a manufacturable prototype in minutes, not months?*

### **🎯 Our Mission**

**Democratize product innovation** by making professional-grade product design accessible to everyone - from students with breakthrough ideas to entrepreneurs launching startups, from makers in their garages to designers in developing countries.

### **🔮 The Vision**

We envision a world where:
- **Ideas flow freely** from concept to prototype without technical barriers
- **AI serves as a design partner**, understanding your vision and enhancing it with engineering expertise
- **Manufacturing becomes accessible**, connecting creators directly with production capabilities
- **Innovation accelerates globally**, enabling the next generation of world-changing products

---

## ✨ **What Makes AgentiCAD Special**

### **🧠 Multimodal AI Intelligence**
- **Natural language processing** - Describe your idea in plain English
- **Computer vision** - Upload sketches, photos, or reference images  
- **Voice interaction** - Speak your ideas naturally
- **Contextual understanding** - AI that grasps both form and function

### **⚡ Instant Transformation**
- **Seconds to prototype** - Watch your idea become a 3D model in real-time
- **Manufacturing-ready specs** - Get materials, costs, and production methods automatically
- **AR visualization** - See your product in the real world before building it
- **Design optimization** - AI-powered suggestions for manufacturability and cost reduction

### **🌍 End-to-End Solution**
- **Idea → Prototype → Production** - Complete product development pipeline
- **Cost estimation** - Real-world manufacturing cost analysis
- **Material selection** - Smart recommendations based on use case
- **Prior art search** - Automated patent and existing product research
- **Manufacturer matching** - Connect with production partners globally

---

## 🛠️ **Technology Stack**

### **🎨 Frontend & UI**
- **React 18** with TypeScript for type-safe development
- **Vite** for lightning-fast build and development
- **Tailwind CSS** for beautiful, responsive design
- **Three.js + React Three Fiber** for immersive 3D visualization
- **WebXR** for augmented reality experiences

### **🧠 AI & Machine Learning**
- **OpenAI GPT-4o/GPT-4V** for advanced text and vision understanding
- **Google Gemini 1.5 Flash** as intelligent fallback system
- **ElevenLabs** for natural text-to-speech synthesis
- **Pica API** for secure AI service orchestration

### **☁️ Backend & Database**
- **Supabase** for real-time database and authentication
- **PostgreSQL** with Row Level Security for data protection
- **Edge Functions** for serverless API processing
- **Real-time subscriptions** for live collaboration

### **💳 Payments & Business**
- **Stripe** for subscription management and payments
- **Tiered access control** (Free, Plus, Pro plans)
- **Usage tracking** and analytics

### **🚀 Infrastructure**
- **Netlify** for global CDN deployment
- **GitHub Actions** for CI/CD automation
- **Browser-first caching** with cloud backup
- **Progressive Web App** capabilities

---

## 🚀 **Quick Start Guide**

### **📋 Prerequisites**

Before you begin, ensure you have:
- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **Git** installed ([Download here](https://git-scm.com/))
- **Code editor** (VS Code recommended)

### **⚡ 1. Clone the Repository**

```bash
git clone https://github.com/Dally101/AgentiCAD.git
cd AgentiCAD
```

### **📦 2. Install Dependencies**

```bash
npm install
```

### **🔑 3. Environment Configuration**

Create a `.env` file in the project root:

```bash
# Copy the example environment file
cp .env.example .env
```

### **🌐 4. Set Up Supabase (Database & Auth)**

1. **Create a Supabase project**:
   - Go to [supabase.com](https://supabase.com)
   - Click "Start your project" 
   - Create new organization and project

2. **Get your Supabase credentials**:
   - Go to Project Settings → API
   - Copy the Project URL and anon/public key

3. **Add to your `.env` file**:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Run database migrations**:
```bash
npx supabase db reset
```

### **🤖 5. Configure AI Services (Pica API)**

AgentiCAD uses Pica for secure AI service access. You have two options:

#### **Option A: Free Tier (Recommended for testing)**
```env
# Add these test keys to your .env file
VITE_PICA_SECRET_KEY=your_pica_secret_key
VITE_PICA_OPENAI_CONNECTION_KEY=your_openai_connection
VITE_PICA_GEMINI_CONNECTION_KEY=your_gemini_connection  
VITE_PICA_ELEVENLABS_CONNECTION_KEY=your_elevenlabs_connection
```

#### **Option B: Direct API Keys (Advanced)**
If you prefer direct API integration, you can modify the service to use:
- OpenAI API key directly
- Google AI Studio API key  
- ElevenLabs API key

### **💳 6. Stripe Configuration (Optional)**

For payment processing:

1. **Create Stripe account** at [stripe.com](https://stripe.com)
2. **Get your keys** from the Stripe Dashboard
3. **Add to `.env`**:
```env
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### **🎯 7. Run the Development Server**

```bash
npm run dev
```

Your AgentiCAD instance will be running at `http://localhost:5173` 🎉

---

## 🏗️ **Project Structure**

```
AgentiCAD/
├── 📁 src/
│   ├── 📁 components/          # React components
│   │   ├── 🎨 LandingPage.tsx     # Marketing homepage
│   │   ├── 🧙‍♂️ ProcessWizard.tsx   # Main design workflow
│   │   ├── 🎮 ModelViewer3D.tsx   # 3D visualization
│   │   └── 📱 MultimodalInputPanel.tsx # AI input interface
│   ├── 📁 services/            # Core business logic
│   │   ├── 🧠 architecturalAI.ts  # AI processing engine
│   │   ├── 💾 cacheService.ts     # Smart caching system
│   │   └── 🎵 voiceService.ts     # Speech synthesis
│   ├── 📁 hooks/               # React hooks
│   ├── 📁 types/               # TypeScript definitions
│   └── 📁 lib/                 # Utilities and config
├── 📁 supabase/
│   ├── 📁 migrations/          # Database schema
│   └── 📁 functions/           # Edge functions
├── 📁 public/                  # Static assets
└── 📄 Configuration files
```

---

## 🚀 **Deployment Guide**

### **📡 Deploy to Netlify (Recommended)**

1. **Connect your GitHub repository**:
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Select your AgentiCAD repository

2. **Configure build settings**:
   ```
   Build command: npm run build
   Publish directory: dist
   ```

3. **Add environment variables**:
   - Go to Site settings → Environment variables
   - Add all your `VITE_*` variables from `.env`

4. **Deploy**:
   - Click "Deploy site"
   - Your app will be live in minutes!

### **🐳 Docker Deployment**

```bash
# Build the Docker image
docker build -t agenticad .

# Run the container
docker run -p 3000:3000 --env-file .env agenticad
```

### **☁️ Other Platforms**

AgentiCAD can be deployed to:
- **Vercel** - Zero-config deployments
- **AWS Amplify** - Full-stack cloud deployment  
- **Railway** - Simple cloud deployment
- **Digital Ocean App Platform** - Managed deployment

---

## 🎮 **Usage Examples**

### **💡 Product Ideation**
```
"I want to design a wireless phone charger that's eco-friendly and works with multiple devices"
```
→ AgentiCAD generates specs for a bamboo wireless charging pad with universal compatibility

### **🎨 Visual Design**
Upload a sketch of your product idea → AI analyzes the design and creates detailed 3D specifications

### **🗣️ Voice Description**
Record yourself describing your product → AI processes speech and generates manufacturable designs

### **📱 Manufacturing Ready**
Every generated design includes:
- Material specifications
- Manufacturing method recommendations  
- Cost estimates
- 3D models ready for prototyping

---

## 🤝 **Contributing**

We welcome contributions from the community! Here's how you can help:

### **🐛 Report Issues**
- Found a bug? [Open an issue](https://github.com/Dally101/AgentiCAD/issues)
- Include steps to reproduce and expected behavior

### **✨ Suggest Features**
- Have an idea? [Start a discussion](https://github.com/Dally101/AgentiCAD/discussions)
- Describe the use case and potential impact

### **💻 Code Contributions**

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### **📝 Documentation**
- Improve setup guides
- Add usage examples
- Translate to other languages

---

## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

---

## 🌟 **Acknowledgments**

- **OpenAI** for GPT-4 that powers our AI understanding
- **Supabase** for the incredible backend infrastructure
- **Three.js community** for amazing 3D web capabilities
- **React ecosystem** for robust frontend development
- **All contributors** who help make product design accessible

---

## 📞 **Support & Community**

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/Dally101/AgentiCAD/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/Dally101/AgentiCAD/discussions)
- **📧 Contact**: [Your Email]
- **🐦 Twitter**: [@YourTwitter]

---

## 🔮 **Roadmap**

### **🎯 Current Focus**
- ✅ Multimodal AI product generation
- ✅ Real-time 3D visualization
- ✅ Manufacturing cost estimation
- ✅ AR product preview

### **🚀 Coming Soon**
- 🔄 **Collaborative Design** - Real-time team collaboration
- 🏭 **Manufacturing Network** - Direct connection to 3D printing services
- 📱 **Mobile App** - iOS and Android applications
- 🔌 **API Platform** - Integrate AgentiCAD into your workflow
- 🌍 **Global Marketplace** - Share and sell product designs

### **🌟 Future Vision**
- 🤖 **Advanced AI** - Custom product optimization algorithms
- 🏭 **Smart Manufacturing** - AI-optimized production planning
- 🌍 **Global Impact** - Accessible product development worldwide
- 🎓 **Education Platform** - Teaching product design through AI

---

**Made with ❤️ for innovators worldwide**

*Ready to transform your ideas into reality? [Get started now!](https://idea2prototype.netlify.app)* 