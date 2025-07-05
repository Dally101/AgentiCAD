# Zoo ML-ephant CAD Integration Guide

This document outlines the integration of Zoo ML-ephant Text-to-CAD API into AgentiCAD for professional CAD model generation.

## Overview

AgentiCAD now uses Zoo ML-ephant's advanced AI to generate professional CAD models from text descriptions. This replaces the previous template-based approach with real AI-powered CAD generation.

## Environment Setup

Add the following environment variables to your `.env.local` file:

```bash
# Zoo ML-ephant Text-to-CAD API Configuration
VITE_ZOO_API_BASE_URL=https://api.zoo.dev
VITE_ZOO_API_TOKEN=api-697caab9-2549-46f9-abdf-7cb9732c1f3c

# Existing Supabase Configuration (keep your existing values)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Existing Stripe Configuration (keep your existing values)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## New Dependencies

The integration adds the following new dependencies:

```json
{
  "@kittycad/lib": "^2.0.40",
  "three": "^0.160.0"
}
```

Install them with:
```bash
npm install @kittycad/lib@2.0.40 three@0.160.0
```

## New Workflow

The updated AgentiCAD workflow now includes:

1. **CAD Generation** - Users describe their product in text, and Zoo ML-ephant generates a professional CAD model
2. **3D Viewer** - Enhanced viewer with CAD-specific lighting and materials
3. **AR Preview** - View the CAD model in augmented reality
4. **Export & Optimize** - Export to multiple CAD formats (STL, OBJ, STEP, etc.)
5. **Manufacturing** - Cost estimation and manufacturer connections
6. **Prior Art Search** - Patent and IP protection

## Key Features

### Professional CAD Generation
- Text-to-CAD using Zoo ML-ephant API
- Multiple output formats (GLTF, STL, OBJ, PLY, STEP, FBX)
- Professional quality models ready for manufacturing

### Enhanced 3D Visualization
- CAD-specific lighting and materials
- Professional grid system
- Enhanced controls for technical viewing

### Multi-Format Export
- Export to industry-standard CAD formats
- Configurable units (mm, cm, m, in, ft)
- Quality settings (low, medium, high)
- Scale factor adjustment

### Manufacturing Integration
- Volume and cost estimation
- Material selection and pricing
- Complexity analysis
- Manufacturing readiness assessment

## API Integration Details

### CAD Generation Service (`src/services/cadAI.ts`)
- Handles Zoo ML-ephant API communication
- Manages CAD model generation and polling
- Provides export functionality
- Includes cost estimation

### Enhanced Components
- **CADInputPanel** - Text input with validation and examples
- **CADExportPanel** - Multi-format export with options
- **Enhanced ModelViewer3D** - CAD-specific rendering
- **Updated ProcessWizard** - New workflow integration

### Type Definitions (`src/types/architectural.ts`)
Extended with CAD-specific types:
- `CADModelData` - CAD model structure
- `CADExportOptions` - Export configuration
- `CADGenerationRequest/Response` - API interfaces

## Usage Examples

### Basic CAD Generation
```typescript
import { cadAI } from '../services/cadAI';

const request = {
  prompt: "Design a smartphone case with rounded corners and camera cutout",
  outputFormat: 'gltf',
  units: 'mm'
};

const cadModel = await cadAI.generateAndWaitForCAD(request);
```

### Export to Multiple Formats
```typescript
const exportOptions = {
  format: 'stl',
  units: 'mm',
  quality: 'high',
  scale: 1.0
};

const exportResult = await cadAI.exportCADModel(cadModel, exportOptions);
```

### Manufacturing Cost Estimation
```typescript
const costEstimate = await cadAI.estimateManufacturingCost(cadModel, 'PLA');
console.log(`Estimated cost: $${costEstimate.cost} USD`);
```

## Troubleshooting

### Common Issues and Solutions

#### 422 Unprocessable Entity Error
**Problem**: Zoo API returns 422 error for prompts like "smartphone cover"

**Solution**: Zoo ML-ephant works best with specific, technical descriptions. According to [Zoo's documentation](https://zoo.dev/text-to-cad):

**❌ Avoid vague prompts:**
- "smartphone cover"
- "phone case" 
- "simple box"

**✅ Use specific, technical prompts:**
- "smartphone case with rounded corners, camera cutout 30mm diameter, 150mm × 75mm × 8mm thick"
- "rectangular plate with 4 holes near each corner and rounded corners, 200mm × 100mm × 5mm thick"
- "involute helical gear with 36 teeth, 50mm diameter, 10mm thickness"

**Best Practices from Zoo:**
1. **Include dimensions**: "200mm wide, 50mm thick"
2. **Add technical features**: "with 4 holes", "rounded corners", "chamfered edges"
3. **Specify function**: "gear with 36 teeth", "2mm wall thickness"
4. **Be manufacturing-focused**: Describe features like holes, cuts, chamfers, fillets

#### CORS Issues (Fixed)
**Problem**: "Access to fetch blocked by CORS policy"

**Solution**: ✅ **Resolved** - The integration now uses Supabase Edge Functions as a proxy to avoid CORS issues. All requests go through your Supabase backend.

#### API Authentication Issues
**Problem**: 401 Unauthorized errors

**Solution**: 
1. Check that the Zoo API token is correctly set in Supabase secrets
2. Redeploy the Supabase function: `npx supabase functions deploy zoo-text-to-cad`
3. Verify the token in Supabase dashboard under Edge Functions secrets

#### Rate Limiting
**Problem**: 429 Rate Limit Exceeded

**Solution**: 
- Zoo API has usage limits
- Wait a moment before retrying
- Consider upgrading your Zoo API plan for higher limits

### Prompt Writing Tips

Based on Zoo's ["Prompt like a Pro" examples](https://zoo.dev/text-to-cad):

**Before:**
> "PDU faceplate"

**After:**
> "PDU faceplate, 1 switch, 11 european plugs, 6 wide keyhole slots, standard size in mm"

**Before:**
> "a manhole cover"

**After:**
> "a manhole cover with cuts for lifting, 600mm diameter, 50mm thick, with a 200mm hole in the middle"

**Key Principles:**
1. **Describe the feature tree** (chamfers, fillets, holes) vs just naming an object
2. **Include specific dimensions** in mm, cm, or inches
3. **Mention functional requirements** (lifting cuts, bolt holes, etc.)
4. **Add manufacturing details** (wall thickness, material constraints)

## File Structure

```
src/
├── services/
│   ├── cadAI.ts              # Zoo ML-ephant API integration
│   └── architecturalAI.ts    # Legacy multimodal AI (preserved)
├── components/
│   ├── CADInputPanel.tsx     # CAD prompt input with validation
│   ├── CADExportPanel.tsx    # Multi-format export panel
│   ├── ModelViewer3D.tsx     # Enhanced 3D viewer
│   └── ProcessWizard.tsx     # Updated workflow
├── types/
│   └── architectural.ts      # Extended with CAD types
└── ...
supabase/functions/
└── zoo-text-to-cad/          # Proxy function for Zoo API
    └── index.ts
```

## Migration Notes

### Preserved Legacy Features
- Existing Supabase authentication and subscriptions
- Stripe payment integration
- Multimodal input panel (text, voice, sketch, photo)
- AR visualization capabilities
- Manufacturing connections and patent search

### New CAD-Focused Features
- Professional CAD generation via Zoo ML-ephant
- Multi-format export capabilities
- Enhanced 3D visualization for technical models
- Manufacturing cost estimation
- Prompt validation and suggestions

## Deployment

The integration is designed to work with your existing Netlify + Supabase deployment:

1. Update environment variables in Netlify
2. Deploy the updated code
3. Zoo ML-ephant API will be called client-side
4. All existing functionality remains intact

## Support

For issues with:
- Zoo ML-ephant API: Contact Zoo.dev support or visit their [Discord](https://discord.gg/JQEpHR7Nt2) / [Discourse](https://community.zoo.dev)
- AgentiCAD integration: Check the integration code
- Existing features: Use existing support channels

## Performance & Limitations

### Expected Response Times
- Simple parts (gears, plates): 30-60 seconds
- Complex assemblies: 1-3 minutes
- Timeout after 60 seconds (configurable)

### Zoo API Limitations
- Some prompts may fail (422 errors) - this is expected as the model improves
- Rate limits apply based on your Zoo API plan
- Works best with mechanical parts and engineering components
- Less effective with organic shapes or artistic objects

The integration maintains full backward compatibility while adding powerful new CAD generation capabilities powered by Zoo ML-ephant's professional-grade AI. 