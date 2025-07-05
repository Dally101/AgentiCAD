# AgentiCAD Setup Guide

## 🚀 Quick Start

AgentiCAD is a professional AI-powered CAD design platform that transforms ideas into 3D models using advanced AI and multimodal input processing.

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account
- Stripe account (for payments)
- Pica AI account (for AI services)
- Zoo.dev account (for CAD generation)

## 🔧 Environment Setup

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/agenticad.git
cd agenticad
npm install
```

### 2. Environment Configuration

1. **Copy the environment template:**
   ```bash
   cp env.example.txt .env
   ```

2. **Configure each service** by editing `.env`:

#### Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Go to Settings > API
3. Copy your Project URL and anon public key:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

#### Stripe Setup (for payments)
1. Create account at [stripe.com](https://stripe.com)
2. Get your API keys from the dashboard:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

#### Pica AI Setup (for AI services)
1. Sign up at [picaos.com](https://picaos.com)
2. Get your API credentials:
   ```env
   VITE_PICA_SECRET_KEY=your_pica_secret_key
   VITE_PICA_OPENAI_CONNECTION_KEY=your_openai_connection_key
   VITE_PICA_GEMINI_CONNECTION_KEY=your_gemini_connection_key
   VITE_PICA_ELEVENLABS_CONNECTION_KEY=your_elevenlabs_connection_key
   ```

#### Zoo.dev Setup (for CAD generation)
1. Create account at [zoo.dev](https://zoo.dev)
2. Get your API token:
   ```env
   VITE_ZOO_API_TOKEN=your_zoo_api_token
   ```

### 3. Database Setup

Run the Supabase migrations:

```bash
cd supabase
npx supabase db reset
```

### 4. Deploy Edge Functions

Deploy the required Supabase Edge Functions:

```bash
npx supabase functions deploy stripe-webhook
npx supabase functions deploy stripe-checkout
npx supabase functions deploy analyze-cad
npx supabase functions deploy zoo-text-to-cad
```

### 5. Start Development

```bash
npm run dev
```

## 🛡️ Security Best Practices

### Environment Variables
- **NEVER commit your `.env` file**
- Use different API keys for development and production
- Rotate API keys regularly
- Use test keys during development

### API Key Management
- Stripe: Use test keys (`sk_test_` prefix) for development
- Keep service role keys secure (backend only)
- Frontend keys should have `VITE_` prefix only

### Deployment
- Use environment variables in your hosting platform
- Enable webhook signature verification
- Set up proper CORS origins

## 🏗️ Project Structure

```
agenticad/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── services/          # API service layers
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript type definitions
├── supabase/
│   ├── functions/         # Edge Functions (backend API)
│   └── migrations/        # Database schema migrations
├── public/                # Static assets
└── docs/                  # Documentation
```

## 🔧 Development Workflow

### Adding New Features
1. Create feature branch: `git checkout -b feature/new-feature`
2. Develop with proper TypeScript types
3. Test with development API keys
4. Create pull request

### Database Changes
1. Create migration: `npx supabase migration new migration_name`
2. Write SQL in the migration file
3. Test locally: `npx supabase db reset`
4. Deploy: `npx supabase db push`

### Adding Edge Functions
1. Create function: `npx supabase functions new function-name`
2. Implement in TypeScript/JavaScript
3. Test locally: `npx supabase functions serve`
4. Deploy: `npx supabase functions deploy function-name`

## 🐛 Troubleshooting

### Common Issues

**"API key not found" errors:**
- Check your `.env` file exists and has correct keys
- Ensure you've restarted the dev server after changing `.env`
- Verify API key formats match expected patterns

**Database connection issues:**
- Run `npx supabase status` to check local setup
- Verify Supabase project is active
- Check service role key permissions

**Stripe webhook errors:**
- Verify webhook endpoint URL in Stripe dashboard
- Check webhook secret matches your environment
- Ensure Edge Function is deployed

## 📚 Documentation

- [API Documentation](./README_API_SETUP.md)
- [Zoo Integration Guide](./README_ZOO_INTEGRATION.md)
- [Component Architecture](./ARCHITECTURAL_SYSTEM_GUIDE.md)

## 🆘 Support

For issues and questions:
- Check existing GitHub issues
- Create new issue with detailed description
- Include relevant logs and environment details (without API keys!)

## 📄 License

[Add your license information here] 