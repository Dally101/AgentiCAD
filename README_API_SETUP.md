# AgentiCAD API Configuration Guide

## Required Environment Variables

To enable full AI functionality in AgentiCAD, you need to set up the following environment variables. These should be configured in your Supabase project's secrets/environment settings.

### Frontend Environment Variables (.env or Supabase Environment)

```bash
# Supabase Configuration (Already configured)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Pica API Configuration (Required for AI services)
PICA_SECRET_KEY=your_pica_secret_key
PICA_OPENAI_CONNECTION_KEY=your_pica_openai_connection_key  
PICA_GEMINI_CONNECTION_KEY=your_pica_gemini_connection_key
PICA_ELEVENLABS_CONNECTION_KEY=your_pica_elevenlabs_connection_key

# Optional: ElevenLabs Voice Configuration
ELEVENLABS_DEFAULT_VOICE_ID=EXAVITQu4vr4xnSDxMaL
```

### Backend/Edge Functions Environment Variables (Supabase Secrets)

These are already configured for Stripe functionality:

```bash
# Stripe Configuration (Already configured)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Supabase (Auto-configured)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Setting Up Environment Variables

### Option 1: Local Development (.env file)

Create a `.env` file in your project root:

```bash
# Copy the variables above and fill in your actual values
PICA_SECRET_KEY=pk_your_actual_pica_secret_key
PICA_OPENAI_CONNECTION_KEY=conn_your_openai_key
# ... etc
```

### Option 2: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Settings → Environment Variables
3. Add each `VITE_*` variable with your actual values

### Option 3: Supabase CLI (Recommended for production)

```bash
# Create a secrets file
echo "PICA_SECRET_KEY=your_key" > .env.secrets
echo "PICA_OPENAI_CONNECTION_KEY=your_key" >> .env.secrets
# ... add all variables

# Set secrets in Supabase
supabase secrets set --env-file .env.secrets
```

## API Functionality Overview

### 🎯 **Step 1: Multimodal Input Processing**

**What it does:**
- **Text Analysis**: Uses OpenAI GPT-4o to extract architectural requirements, room types, style preferences, and features from natural language descriptions
- **Voice Processing**: Converts speech to text using Web Speech API, then analyzes with AI
- **Sketch Analysis**: Uses OpenAI GPT-4V to analyze hand-drawn sketches and extract layout information
- **Photo Analysis**: Analyzes reference photos to identify style, materials, and design features

**Required APIs:**
- OpenAI GPT-4o (text analysis)
- OpenAI GPT-4V (image analysis)

### 🏗️ **Step 2: AI-Powered 3D Model Generation**

**What it does:**
- Processes all input modalities into structured architectural data
- Uses AI to optimize room layouts and spatial relationships
- Generates parametric 3D geometry using Three.js
- Creates realistic room dimensions based on function and style
- Applies appropriate materials based on style preferences

**Required APIs:**
- OpenAI GPT-4o (architectural planning)
- Gemini 1.5 Flash (fallback processing)

### 🥽 **Step 3: AR Visualization**

**What it does:**
- WebXR integration for immersive AR experience
- Real-world model placement and scaling
- Surface detection and hit testing
- Measurement tools in AR space

**Required APIs:**
- None (uses browser WebXR APIs)

### 🔄 **Step 4: AI Design Iteration**

**What it does:**
- Processes natural language feedback about the design
- Suggests specific modifications (room resizing, style changes, feature additions)
- Regenerates 3D model with applied changes
- Provides explanations for design decisions

**Required APIs:**
- OpenAI GPT-4o (design analysis and iteration)

### 🗣️ **Voice Enhancement (Optional)**

**What it does:**
- Converts AI responses to natural speech
- Provides audio feedback during design process

**Required APIs:**
- ElevenLabs Text-to-Speech

## Testing the Setup

### 1. Basic Text Analysis Test

Try this text input:
```
"I want a modern 3-bedroom house with an open-plan living area, large windows facing south, and a spacious kitchen island"
```

**Expected result:** AI should extract:
- Style: modern
- Rooms: 3 bedrooms, living area, kitchen
- Features: open-plan, large windows, kitchen island

### 2. Image Analysis Test

Upload a photo of a room or architectural sketch.

**Expected result:** AI should identify style elements and suggest incorporating similar features.

### 3. Voice Input Test

Speak your design requirements clearly.

**Expected result:** Speech should be transcribed and analyzed like text input.

### 4. Design Iteration Test

After generating a model, try feedback like:
```
"Make the living room larger and add a fireplace"
```

**Expected result:** AI should modify the model and explain the changes.

## Error Handling & Fallbacks

The system includes robust fallback mechanisms:

1. **API Failures**: Falls back to rule-based analysis if AI APIs are unavailable
2. **Missing Keys**: Shows warnings but continues with limited functionality  
3. **Network Issues**: Provides cached responses and retry mechanisms
4. **Invalid Responses**: Uses pattern matching if AI JSON parsing fails

## Performance Optimization

- **Model Caching**: Generated models are cached locally
- **API Rate Limiting**: Built-in request throttling
- **Progressive Enhancement**: Core functionality works without AI, enhanced with AI
- **Lazy Loading**: AI features load on-demand

## Security Considerations

- All API keys are environment variables (never hardcoded)
- Pica passthrough provides additional security layer
- User inputs are sanitized before AI processing
- No sensitive data is logged or cached

## Cost Management

### Estimated API Costs (per design generation):

- **OpenAI GPT-4o**: ~$0.10-0.30 per complex design
- **OpenAI GPT-4V**: ~$0.20-0.50 per image analysis  
- **Gemini 1.5 Flash**: ~$0.05-0.15 per fallback request
- **ElevenLabs**: ~$0.05-0.10 per voice synthesis

### Cost Optimization Tips:

1. Use Gemini as primary for simpler requests (cheaper)
2. Cache frequent analysis results
3. Implement request deduplication
4. Set usage limits per user tier

## Troubleshooting

### Common Issues:

**"AI functionality will be limited"**
- Check that `PICA_SECRET_KEY` is set correctly

**"OpenAI configuration missing"** 
- Verify `PICA_OPENAI_CONNECTION_KEY` is configured

**API timeout errors**
- Increase timeout settings or implement retry logic
- Check network connectivity

**JSON parsing failures**
- AI responses include fallback extraction methods
- Check API response format

### Debug Mode:

Add this to your environment for detailed logging:
```bash
DEBUG_AI=true
```

## Next Steps

1. ✅ Set up environment variables
2. ✅ Test basic text input functionality  
3. ✅ Verify image analysis works
4. ✅ Test voice input and transcription
5. ✅ Try design iteration features
6. 🚀 Deploy to production with real users!

---

**Need Help?** The AI service includes comprehensive error messages and fallback functionality to ensure a smooth user experience even when APIs are unavailable. 