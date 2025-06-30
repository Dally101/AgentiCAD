import type { 
  MultimodalInput, 
  GenerationRequest, 
  GenerationResponse, 
  ArchitecturalModel, 
  Room, 
  Door, 
  Window 
} from '../types/architectural';

interface PicaConfig {
  secretKey: string;
  openaiConnectionKey: string;
  geminiConnectionKey: string;
  elevenlabsConnectionKey: string;
}

class ProductDesignAIService {
  private config: PicaConfig;
  private baseUrl = 'https://api.picaos.com/v1/passthrough';

  constructor() {
    this.config = {
      secretKey: import.meta.env.VITE_PICA_SECRET_KEY || '',
      openaiConnectionKey: import.meta.env.VITE_PICA_OPENAI_CONNECTION_KEY || '',
      geminiConnectionKey: import.meta.env.VITE_PICA_GEMINI_CONNECTION_KEY || '',
      elevenlabsConnectionKey: import.meta.env.VITE_PICA_ELEVENLABS_CONNECTION_KEY || ''
    };

    if (!this.config.secretKey) {
      console.warn('VITE_PICA_SECRET_KEY not found, AI functionality will be limited');
    }
  }

  /**
   * Main method to process multimodal inputs and generate product design model
   */
  async generateModel(request: GenerationRequest): Promise<GenerationResponse> {
    const startTime = Date.now();
    const steps: string[] = [];

    try {
      steps.push('Processing inputs...');
      
      // Process different input modalities
      const processedInputs = await this.processInputs(request.inputs);
      steps.push('Inputs processed successfully');

      // Generate the product model using AI
      steps.push('Generating product model...');
      const model = await this.createProductModel(processedInputs, request.preferences);
      steps.push('Model generated successfully');

      // Generate alternatives
      steps.push('Creating alternative designs...');
      const alternatives = await this.generateAlternatives(model, 2);
      steps.push('Alternatives created');

      const processingTime = Date.now() - startTime;

      return {
        model,
        confidence: this.calculateConfidence(processedInputs),
        alternatives,
        processing: {
          duration: processingTime,
          steps,
          warnings: []
        }
      };

    } catch (error) {
      console.error('Error generating product model:', error);
      throw new Error('Failed to generate product model: ' + (error as Error).message);
    }
  }

  /**
   * Process multimodal inputs into structured data using AI
   */
  private async processInputs(inputs: MultimodalInput): Promise<any> {
    console.log('Processing inputs:', inputs);
    
    const processed: any = {
      requirements: [] as string[],
      constraints: [] as string[],
      style: 'modern',
      components: [] as string[],
      features: [] as string[],
      materials: [] as string[],
      dimensions: {} as any,
      manufacturing: {} as any,
      use_case: '' as string
    };

    // Process text input with AI
    if (inputs.text) {
      try {
        console.log('Analyzing text input:', inputs.text.content);
        const textAnalysis = await this.analyzeTextWithAI(inputs.text.content);
        console.log('Text analysis result:', textAnalysis);
        
        processed.requirements.push(...(textAnalysis.requirements || []));
        processed.constraints.push(...(textAnalysis.constraints || []));
        processed.style = textAnalysis.style || 'modern';
        processed.components.push(...(textAnalysis.components || []));
        processed.features.push(...(textAnalysis.features || []));
        processed.materials.push(...(textAnalysis.materials || []));
        processed.dimensions = textAnalysis.dimensions || {};
        processed.manufacturing = textAnalysis.manufacturing || {};
        processed.use_case = textAnalysis.use_case || '';
      } catch (error) {
        console.warn('Text analysis failed, using fallback:', error);
        // Fallback to rule-based analysis
        const fallbackAnalysis = await this.analyzeTextFallback(inputs.text.content);
        Object.assign(processed, fallbackAnalysis);
      }
    }

    // Process voice input (convert to text then analyze)
    if (inputs.voice && inputs.voice.transcript) {
      try {
        console.log('Analyzing voice input:', inputs.voice.transcript);
        const voiceAnalysis = await this.analyzeTextWithAI(inputs.voice.transcript);
        processed.requirements.push(...(voiceAnalysis.requirements || []));
        processed.components.push(...(voiceAnalysis.components || []));
        processed.features.push(...(voiceAnalysis.features || []));
        processed.materials.push(...(voiceAnalysis.materials || []));
        if (voiceAnalysis.use_case) processed.use_case = voiceAnalysis.use_case;
      } catch (error) {
        console.warn('Voice analysis failed:', error);
      }
    }

    // Process sketch input with computer vision
    if (inputs.sketch) {
      try {
        console.log('Analyzing sketch input');
        const sketchAnalysis = await this.analyzeImageWithAI(
          inputs.sketch.imageData, 
          'analyze_sketch',
          'Analyze this product design sketch and extract component information, dimensions, and assembly relationships.'
        );
        processed.layout = sketchAnalysis.layout;
        processed.components.push(...(sketchAnalysis.components || []));
        processed.features.push(...(sketchAnalysis.features || []));
        if (sketchAnalysis.dimensions) processed.dimensions = sketchAnalysis.dimensions;
      } catch (error) {
        console.warn('Sketch analysis failed:', error);
      }
    }

    // Process photo input with computer vision
    if (inputs.photo) {
      try {
        console.log('Analyzing photo input');
        const photoAnalysis = await this.analyzeImageWithAI(
          inputs.photo.imageData,
          'analyze_photo', 
          'Analyze this product photo and identify style, materials, and design features that should be incorporated into a new product design.'
        );
        processed.style = photoAnalysis.style || processed.style;
        processed.features.push(...(photoAnalysis.features || []));
        processed.materials.push(...(photoAnalysis.materials || []));
      } catch (error) {
        console.warn('Photo analysis failed:', error);
      }
    }

    // Remove duplicates and ensure we have some basic data
    processed.components = [...new Set(processed.components)];
    processed.features = [...new Set(processed.features)];
    processed.materials = [...new Set(processed.materials)];
    processed.requirements = [...new Set(processed.requirements)];
    
    // Ensure we have at least some basic components if none were detected
    if (processed.components.length === 0) {
      processed.components = ['body', 'interface'];
    }
    
    // Ensure we have at least a basic use case
    if (!processed.use_case) {
      processed.use_case = 'general';
    }

    console.log('Final processed inputs:', processed);
    return processed;
  }

  /**
   * Analyze text using OpenAI GPT-4 via Pica with caching and fallback
   */
  private async analyzeTextWithAI(text: string): Promise<any> {
    // First check cache
    const { cacheService } = await import('./cacheService');
    const cached = await cacheService.getCachedTextAnalysis(text);
    if (cached) {
      console.log('Using cached text analysis');
      return cached;
    }

    const prompt = `
You are an expert product design AI assistant. Analyze the following text and extract structured information for physical product design.

Text to analyze: "${text}"

Extract and return a JSON response with the following structure:
{
  "requirements": ["list of explicit requirements"],
  "constraints": ["list of constraints or limitations"],
  "style": "design style (modern, retro, industrial, minimalist, ergonomic, etc.)",
  "components": ["list of product components mentioned"],
  "features": ["list of specific features requested"],
  "materials": ["suggested materials"],
  "dimensions": {
    "length": "estimated length in cm",
    "width": "estimated width in cm", 
    "height": "estimated height in cm"
  },
  "manufacturing": {
    "method": "3D printing, injection molding, machining, etc.",
    "complexity": "simple, moderate, complex"
  },
  "use_case": "primary use case or function"
}

Focus on extracting actionable product design information that can be used to generate a 3D prototype.
`;

    try {
      const response = await this.callOpenAI([
        {
          role: 'system',
          content: 'You are an expert architectural analyst. Return only valid JSON responses.'
        },
        {
          role: 'user', 
          content: prompt
        }
      ]);

      // Try to parse JSON response
      const content = response.choices[0]?.message?.content || '{}';
      let result;
      try {
        const cleanedContent = this.cleanJsonResponse(content);
        result = JSON.parse(cleanedContent);
        result.source = 'ai_analysis';
        result.confidence = 0.9;
      } catch (parseError) {
        // If JSON parsing fails, extract information using regex
        result = this.extractInfoFromText(content, text);
        result.source = 'ai_fallback';
        result.confidence = 0.7;
      }

      // Cache the successful result
      await cacheService.cacheTextAnalysis(text, result, {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        syncToCloud: true
      });

      return result;
    } catch (error) {
      console.error('OpenAI text analysis failed:', error);
      
      // Try Gemini as fallback
      try {
        console.log('Trying Gemini fallback for text analysis');
        const geminiResult = await this.callGemini(prompt);
        const content = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        let result;
        try {
          result = JSON.parse(content);
          result.source = 'gemini_analysis';
          result.confidence = 0.8;
        } catch (parseError) {
          result = this.extractInfoFromText(content, text);
          result.source = 'gemini_fallback';
          result.confidence = 0.6;
        }

        // Cache the Gemini result
        await cacheService.cacheTextAnalysis(text, result, {
          ttl: 12 * 60 * 60 * 1000, // 12 hours (shorter for fallback)
          syncToCloud: true
        });

        return result;
      } catch (geminiError) {
        console.warn('Gemini fallback also failed:', geminiError);
        
        // Final fallback to rule-based analysis
        const fallbackResult = cacheService.getFallbackData('text_analysis', { input: text });
        
        // Cache the fallback result for a short time
        await cacheService.cacheTextAnalysis(text, fallbackResult, {
          ttl: 1 * 60 * 60 * 1000, // 1 hour
          syncToCloud: false // Don't sync fallback data to cloud
        });

        return fallbackResult;
      }
    }
  }

  /**
   * Analyze images using OpenAI GPT-4V via Pica with caching and fallback
   */
  private async analyzeImageWithAI(imageData: string, analysisType: string, prompt: string): Promise<any> {
    // Generate image hash for caching
    const imageHash = this.simpleHash(imageData.substring(0, 1000)); // Use first 1000 chars for hash
    
    // Check cache first
    const { cacheService } = await import('./cacheService');
    const cached = await cacheService.getCachedImageAnalysis(imageHash, analysisType);
    if (cached) {
      console.log('Using cached image analysis');
      return cached;
    }

    try {
      const response = await this.callOpenAI([
        {
          role: 'system',
          content: 'You are a professional product designer and CAD analyst. Analyze images and provide structured JSON responses for product modeling and manufacturing.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${prompt}\n\nReturn a JSON response with relevant architectural information including layout, rooms, style, and features.`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData
              }
            }
          ]
        }
      ]);

      const content = response.choices[0]?.message?.content || '{}';
      let result;
      try {
        result = JSON.parse(content);
        result.source = 'ai_vision_analysis';
        result.confidence = 0.85;
      } catch (parseError) {
        // Extract basic information if JSON parsing fails
        result = {
          layout: 'rectangular',
          rooms: ['space'],
          style: 'modern',
          features: ['analyzed_from_image'],
          source: 'ai_vision_fallback',
          confidence: 0.6
        };
      }

      // Cache the successful result
      await cacheService.cacheImageAnalysis(imageHash, analysisType, result, {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
        syncToCloud: true
      });

      return result;
    } catch (error) {
      console.error('OpenAI image analysis failed:', error);
      
      // Try Gemini Vision as fallback
      try {
        console.log('Trying Gemini Vision fallback for image analysis');
        
        // For Gemini, we need to convert the image format
        const geminiPrompt = `${prompt}\n\nAnalyze this architectural image and return a JSON response with relevant information including layout, rooms, style, and features.`;
        
        const geminiResult = await this.callGemini(geminiPrompt);
        const content = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        let result;
        try {
          result = JSON.parse(content);
          result.source = 'gemini_vision_analysis';
          result.confidence = 0.75;
        } catch (parseError) {
          result = {
            layout: 'rectangular',
            rooms: ['space'],
            style: 'modern',
            features: ['analyzed_from_image'],
            source: 'gemini_vision_fallback',
            confidence: 0.5
          };
        }

        // Cache the Gemini result
        await cacheService.cacheImageAnalysis(imageHash, analysisType, result, {
          ttl: 3 * 24 * 60 * 60 * 1000, // 3 days (shorter for fallback)
          syncToCloud: true
        });

        return result;
      } catch (geminiError) {
        console.warn('Gemini Vision fallback also failed:', geminiError);
        
        // Final fallback to basic image analysis
        const fallbackResult = cacheService.getFallbackData('image_analysis', { imageHash, analysisType });
        
        // Cache the fallback result
        await cacheService.cacheImageAnalysis(imageHash, analysisType, fallbackResult, {
          ttl: 1 * 60 * 60 * 1000, // 1 hour
          syncToCloud: false
        });

        return fallbackResult;
      }
    }
  }

  /**
   * Simple hash function for image data
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clean JSON response by removing markdown code blocks and other formatting
   */
  private cleanJsonResponse(content: string): string {
    // Remove markdown code blocks
    let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // If the response starts with text before JSON, try to extract just the JSON part
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
    
    // If still not valid JSON, return empty object
    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch {
      console.warn('Could not clean JSON response, returning empty object');
      return '{}';
    }
  }



  /**
   * Call OpenAI API via Pica passthrough
   */
  private async callOpenAI(messages: any[]): Promise<any> {
    if (!this.config.secretKey || !this.config.openaiConnectionKey) {
      throw new Error('OpenAI configuration missing');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pica-secret': this.config.secretKey,
        'x-pica-connection-key': this.config.openaiConnectionKey,
        'x-pica-action-id': 'conn_mod_def::GDzgi1QfvM4::4OjsWvZhRxmAVuLAuWgfVA'
      },
      body: JSON.stringify({
        messages,
        model: 'gpt-4o',
        temperature: 0.3,
        max_completion_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Call Gemini API via Pica as fallback
   */
  private async callGemini(prompt: string): Promise<any> {
    if (!this.config.secretKey || !this.config.geminiConnectionKey) {
      throw new Error('Gemini configuration missing');
    }

    const response = await fetch(`${this.baseUrl}/models/gemini-1.5-flash:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pica-secret': this.config.secretKey,
        'x-pica-connection-key': this.config.geminiConnectionKey,
        'x-pica-action-id': 'conn_mod_def::GCmd5BQE388::PISTzTbvRSqXx0N0rMa-Lw'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Text-to-speech using ElevenLabs via Pica with caching
   */
  async synthesizeSpeech(text: string, voiceId?: string): Promise<string> {
    const defaultVoiceId = voiceId || import.meta.env.VITE_ELEVENLABS_DEFAULT_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

    // Check cache first
    const { cacheService } = await import('./cacheService');
    const cached = await cacheService.getCachedVoiceSynthesis(text, defaultVoiceId);
    if (cached) {
      console.log('Using cached voice synthesis');
      return cached;
    }

    if (!this.config.secretKey || !this.config.elevenlabsConnectionKey) {
      throw new Error('ElevenLabs configuration missing');
    }

    const response = await fetch(`${this.baseUrl}/v1/text-to-speech/${defaultVoiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pica-secret': this.config.secretKey,
        'x-pica-connection-key': this.config.elevenlabsConnectionKey,
        'x-pica-action-id': 'conn_mod_def::GCccCs7_t7Q::QpqEyuj2S4W481S8S1asbA'
      },
      body: JSON.stringify({
        text: text.slice(0, 1000), // Limit text length
        voice_id: defaultVoiceId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const audioData = result.audio; // Base64 encoded audio

    // Cache the result
    await cacheService.cacheVoiceSynthesis(text, defaultVoiceId, audioData, {
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
      syncToCloud: true
    });

    return audioData;
  }

  /**
   * Fallback text analysis using regex patterns
   */
  private async analyzeTextFallback(text: string): Promise<any> {
    const lowercaseText = text.toLowerCase();
    const analysis = {
      requirements: [] as string[],
      constraints: [] as string[],
      style: 'modern',
      components: [] as string[],
      features: [] as string[],
      materials: [] as string[],
      dimensions: {} as any,
      manufacturing: {} as any,
      use_case: '' as string
    };

    // Extract product components
    const componentPatterns = {
      'handle': /handle|grip|hold/gi,
      'body': /body|main|core|base/gi,
      'interface': /button|screen|display|control/gi,
      'cover': /cover|lid|top|cap/gi,
      'stand': /stand|support|leg|mount/gi,
      'connector': /connector|plug|port|cable/gi,
      'sensor': /sensor|detector|monitor/gi,
      'battery': /battery|power|energy/gi,
      'speaker': /speaker|audio|sound/gi
    };

    Object.entries(componentPatterns).forEach(([componentType, pattern]) => {
      if (pattern.test(text)) {
        analysis.components.push(componentType);
      }
    });

    // Extract style preferences
    const stylePatterns = {
      'modern': /modern|contemporary|minimalist|clean|sleek/gi,
      'retro': /retro|vintage|classic|old.school/gi,
      'industrial': /industrial|rugged|metal|steel/gi,
      'ergonomic': /ergonomic|comfortable|user.friendly/gi,
      'compact': /compact|small|portable|mini/gi
    };

    Object.entries(stylePatterns).forEach(([style, pattern]) => {
      if (pattern.test(text)) {
        analysis.style = style;
      }
    });

    // Extract materials
    const materialPatterns = {
      'plastic': /plastic|polymer|ABS|PLA/gi,
      'metal': /metal|aluminum|steel|titanium/gi,
      'wood': /wood|bamboo|timber/gi,
      'glass': /glass|crystal|transparent/gi,
      'rubber': /rubber|silicone|flexible/gi,
      'fabric': /fabric|textile|cloth/gi
    };

    Object.entries(materialPatterns).forEach(([material, pattern]) => {
      if (pattern.test(text)) {
        analysis.materials.push(material);
      }
    });

    // Extract product features
    const featurePatterns = {
      'wireless': /wireless|bluetooth|wifi/gi,
      'waterproof': /waterproof|water.resistant|sealed/gi,
      'portable': /portable|mobile|carry|travel/gi,
      'rechargeable': /rechargeable|battery|usb.charge/gi,
      'durable': /durable|sturdy|strong|robust/gi,
      'lightweight': /lightweight|light|portable/gi,
      'foldable': /foldable|collapsible|compact/gi,
      'adjustable': /adjustable|customizable|variable/gi
    };

    Object.entries(featurePatterns).forEach(([feature, pattern]) => {
      if (pattern.test(text)) {
        analysis.features.push(feature);
      }
    });

    // Extract use case
    if (/kitchen|cook|food|culinary/gi.test(text)) {
      analysis.use_case = 'kitchen';
    } else if (/office|work|desk|business/gi.test(text)) {
      analysis.use_case = 'office';
    } else if (/home|household|domestic/gi.test(text)) {
      analysis.use_case = 'home';
    } else if (/tech|electronic|digital|smart/gi.test(text)) {
      analysis.use_case = 'technology';
    } else if (/outdoor|garden|yard|exterior/gi.test(text)) {
      analysis.use_case = 'outdoor';
    } else {
      analysis.use_case = 'general';
    }

    // Ensure we have at least some basic data
    if (analysis.components.length === 0) {
      analysis.components = ['body', 'interface'];
    }
    if (analysis.features.length === 0) {
      analysis.features = ['functional'];
    }
    if (analysis.materials.length === 0) {
      analysis.materials = ['plastic'];
    }
    if (analysis.requirements.length === 0) {
      analysis.requirements = ['durable', 'functional'];
    }

    return analysis;
  }

  /**
   * Extract information from AI response text when JSON parsing fails
   */
  private extractInfoFromText(aiResponse: string, originalText: string): any {
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Continue with fallback
      }
    }

    // Fallback to pattern matching
    return this.analyzeTextFallback(originalText);
  }

  /**
   * Create product model from processed inputs using real AI generation
   */
  private async createProductModel(
    processedInputs: any, 
    preferences: GenerationRequest['preferences']
  ): Promise<ArchitecturalModel> {
    const modelId = `product_${Date.now()}`;
    
    console.log('Creating product model with inputs:', processedInputs);
    console.log('Preferences:', preferences);
    
    // Use OpenAI to generate realistic product specifications
    let productSpecs;
    if (this.config.secretKey && this.config.openaiConnectionKey) {
      try {
        console.log('Attempting AI product generation...');
        productSpecs = await this.generateProductSpecsWithAI(processedInputs, preferences);
        console.log('AI product specs generated:', productSpecs);
      } catch (error) {
        console.warn('AI product generation failed, using fallback:', error);
        productSpecs = this.generateFallbackProductSpecs(processedInputs, preferences);
      }
    } else {
      console.log('No API keys found, using fallback product specs');
      productSpecs = this.generateFallbackProductSpecs(processedInputs, preferences);
    }

    console.log('Final product specs:', productSpecs);

    // Ensure productSpecs has required structure
    if (!productSpecs || !productSpecs.components || !Array.isArray(productSpecs.components)) {
      console.warn('Invalid product specs, creating default structure');
      productSpecs = {
        name: `${preferences.style || 'Modern'} Product`,
        description: 'A custom designed product',
        style: preferences.style || 'modern',
        components: [
          {
            name: "main_body",
            dimensions: { width: 10, length: 15, height: 5 },
            material: "Plastic",
            function: "Primary structure",
            features: ["functional"],
            connections: []
          }
        ],
        totalVolume: 750,
        manufacturing: {
          method: "3D printing",
          materials: ["PLA plastic"],
          complexity: "simple",
          estimated_cost: "$25-50"
        }
      };
    }

    // Convert product specs to architectural model format (for compatibility)
    const components = productSpecs.components.map((comp: any, index: number) => ({
      id: `component_${index}`,
      name: comp.name || `component_${index}`,
      dimensions: comp.dimensions || { width: 5, length: 5, height: 5 },
      position: { x: index * 3, y: 0, z: 0 },
      connections: comp.connections || [],
      features: comp.features || [],
      materials: comp.materials || { walls: '#cccccc', floor: '#999999', ceiling: '#ffffff' }
    }));

    const model: ArchitecturalModel = {
      id: modelId,
      name: productSpecs.name || `${preferences.style} Product Design`,
      description: productSpecs.description || `A ${preferences.style} product with ${components.length} components`,
      rooms: components, // Using 'rooms' field for components for compatibility
      doors: [], // Products don't have doors
      windows: [], // Products don't have windows
      totalArea: productSpecs.totalVolume || 100, // Using area field for volume
      style: productSpecs.style || preferences.style,
      created: new Date(),
      modified: new Date()
    };

    console.log('Generated product model:', model);
    return model;
  }

  /**
   * Generate realistic product specifications using OpenAI
   */
  private async generateProductSpecsWithAI(processedInputs: any, preferences: any): Promise<any> {
    const prompt = `
You are an expert product designer and engineer. Create detailed specifications for a physical product based on these requirements:

Requirements: ${processedInputs.requirements.join(', ')}
Components needed: ${processedInputs.components.join(', ')}
Style: ${processedInputs.style}
Features: ${processedInputs.features.join(', ')}
Materials: ${processedInputs.materials.join(', ')}
Use case: ${processedInputs.use_case}
Constraints: ${processedInputs.constraints.join(', ')}

Create a realistic, manufacturable product design. Return a JSON response with:
{
  "name": "Product name",
  "description": "Detailed product description",
  "style": "Design style",
  "components": [
    {
      "name": "Component name",
      "dimensions": {"width": number, "length": number, "height": number},
      "material": "Material type",
      "function": "Component purpose",
      "features": ["list of features"],
      "connections": ["list of connected components"]
    }
  ],
  "totalVolume": number, // in cubic cm
  "manufacturing": {
    "method": "3D printing, injection molding, CNC machining, etc.",
    "materials": ["list of materials needed"],
    "complexity": "simple, moderate, complex",
    "estimated_cost": "cost range in USD"
  },
  "specifications": {
    "weight": "estimated weight",
    "dimensions": {"length": number, "width": number, "height": number},
    "color_options": ["available colors"],
    "durability": "durability rating"
  }
}

Focus on creating a realistic, manufacturable product that fulfills the requirements and can be easily prototyped.
`;

    try {
      const response = await this.callOpenAI([
        {
          role: 'system',
          content: 'You are an expert product designer specializing in manufacturable consumer and industrial products. Create realistic, detailed specifications.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      const content = response.choices[0]?.message?.content || '{}';
      const cleanedContent = this.cleanJsonResponse(content);
      const productSpecs = JSON.parse(cleanedContent);
      
      // Validate and enhance the specs
      if (!productSpecs.components || productSpecs.components.length === 0) {
        productSpecs.components = [{
          name: "main_body",
          dimensions: { width: 10, length: 15, height: 5 },
          material: "ABS plastic",
          function: "Primary structure",
          features: ["durable", "lightweight"],
          connections: []
        }];
      }

      return productSpecs;
    } catch (error) {
      console.error('AI product generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate fallback product specs when AI is unavailable
   */
  private generateFallbackProductSpecs(processedInputs: any, preferences: any): any {
    console.log('Generating fallback product specs with inputs:', processedInputs);
    
    const productType = this.inferProductType(processedInputs);
    
    // Ensure we have at least some components
    const components = [];
    
    // Add main body component
    components.push({
      name: "main_body",
      dimensions: { width: 12, length: 18, height: 6 },
      material: processedInputs.materials?.[0] || "Plastic",
      function: "Primary structure",
      features: processedInputs.features?.slice(0, 2) || ["functional"],
      connections: []
    });
    
    // Add interface component if needed
    if (processedInputs.components?.includes('interface') || processedInputs.features?.includes('interactive')) {
      components.push({
        name: "interface",
        dimensions: { width: 8, length: 12, height: 2 },
        material: "Metal",
        function: "User interaction",
        features: ["ergonomic"],
        connections: ["main_body"]
      });
    }
    
    // Add handle if mentioned
    if (processedInputs.components?.includes('handle') || processedInputs.features?.includes('portable')) {
      components.push({
        name: "handle",
        dimensions: { width: 3, length: 15, height: 2 },
        material: processedInputs.materials?.includes('rubber') ? "Rubber" : "Plastic",
        function: "Grip and portability",
        features: ["ergonomic", "non-slip"],
        connections: ["main_body"]
      });
    }
    
    const fallbackSpecs = {
      name: `${preferences?.style || 'Modern'} ${productType}`,
      description: `A ${preferences?.style || 'modern'} ${productType} designed for ${processedInputs.use_case || 'general use'}`,
      style: preferences?.style || 'modern',
      components: components,
      totalVolume: components.reduce((vol, comp) => 
        vol + (comp.dimensions.width * comp.dimensions.length * comp.dimensions.height), 0
      ),
      manufacturing: {
        method: processedInputs.features?.includes('3d_print') ? "3D printing" : "Injection molding",
        materials: processedInputs.materials?.length > 0 ? processedInputs.materials : ["PLA plastic"],
        complexity: components.length > 2 ? "moderate" : "simple",
        estimated_cost: components.length > 2 ? "$75-150" : "$25-75"
      },
      specifications: {
        weight: `${Math.round(components.length * 150)}g`,
        dimensions: { 
          length: Math.max(...components.map(c => c.dimensions.length)), 
          width: Math.max(...components.map(c => c.dimensions.width)), 
          height: Math.max(...components.map(c => c.dimensions.height))
        },
        color_options: ["black", "white", "gray"],
        durability: processedInputs.features?.includes('durable') ? "high" : "medium"
      }
    };
    
    console.log('Generated fallback specs:', fallbackSpecs);
    return fallbackSpecs;
  }

  /**
   * Infer product type from processed inputs
   */
  private inferProductType(processedInputs: any): string {
    const useCase = processedInputs.use_case?.toLowerCase() || '';
    const requirements = (processedInputs.requirements || []).join(' ').toLowerCase();
    const features = (processedInputs.features || []).join(' ').toLowerCase();
    
    if (useCase.includes('kitchen') || requirements.includes('cook') || features.includes('food')) {
      return 'Kitchen Tool';
    }
    if (useCase.includes('office') || requirements.includes('work') || features.includes('desk')) {
      return 'Office Accessory';
    }
    if (useCase.includes('home') || requirements.includes('household')) {
      return 'Home Product';
    }
    if (useCase.includes('tech') || requirements.includes('electronic') || features.includes('digital')) {
      return 'Tech Device';
    }
    if (features.includes('portable') || features.includes('carry')) {
      return 'Portable Device';
    }
    
    return 'Custom Product';
  }

  /**
   * Use AI to enhance room planning and layout
   */
  private async enhanceRoomPlanning(processedInputs: any, preferences: any): Promise<any> {
    const prompt = `
As an expert architect, create an optimized room layout based on these requirements:

Requirements: ${processedInputs.requirements.join(', ')}
Rooms needed: ${processedInputs.rooms.join(', ')}
Style: ${processedInputs.style}
Features: ${processedInputs.features.join(', ')}
Constraints: ${processedInputs.constraints.join(', ')}

Return a JSON response with:
{
  "rooms": ["optimized list of room names"],
  "layout_strategy": "description of layout approach",
  "connections": [{"from": "room1", "to": "room2", "relationship": "adjacent/connected/separated"}]
}

Consider traffic flow, natural light, privacy, and functional relationships between spaces.
`;

    try {
      const response = await this.callOpenAI([
        {
          role: 'system',
          content: 'You are an expert architect specializing in residential design and space planning.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      // Return default planning if AI fails
      return {
        rooms: processedInputs.rooms,
        layout_strategy: 'basic_linear',
        connections: []
      };
    }
  }

  /**
   * Generate realistic room dimensions based on room type and AI insights
   */
  private generateRoomDimensions(roomName: string, preferences: any, processedInputs: any): { width: number; length: number; height: number } {
    const baseDimensions = {
      'living room': { width: 5, length: 6, height: 3 },
      'kitchen': { width: 4, length: 4, height: 3 },
      'bedroom': { width: 4, length: 4.5, height: 3 },
      'bathroom': { width: 2.5, length: 3, height: 3 },
      'dining room': { width: 4, length: 5, height: 3 },
      'office': { width: 3, length: 4, height: 3 },
      'garage': { width: 6, length: 7, height: 3 },
      'basement': { width: 8, length: 10, height: 2.5 },
      'attic': { width: 6, length: 8, height: 2.2 }
    };

    const base = baseDimensions[roomName as keyof typeof baseDimensions] || baseDimensions['bedroom'];
    
    // Apply complexity scaling
    const complexityMultiplier = preferences.complexity === 'simple' ? 0.8 : 
                                 preferences.complexity === 'complex' ? 1.3 : 1.0;

    // Apply feature-based adjustments
    let sizeMultiplier = 1.0;
    if (processedInputs.features.includes('spacious') || processedInputs.features.includes('large')) {
      sizeMultiplier = 1.2;
    }
    if (processedInputs.features.includes('compact') || processedInputs.features.includes('small')) {
      sizeMultiplier = 0.8;
    }

    return {
      width: Math.round(base.width * complexityMultiplier * sizeMultiplier * 10) / 10,
      length: Math.round(base.length * complexityMultiplier * sizeMultiplier * 10) / 10,
      height: base.height
    };
  }

  /**
   * Select appropriate materials based on style and room type
   */
  private selectRoomMaterials(roomName: string, style: string): { walls: string; floor: string; ceiling: string } {
    const materialPalettes = {
      modern: {
        walls: '#f5f5f5',
        floor: '#e8e8e8', 
        ceiling: '#ffffff'
      },
      industrial: {
        walls: '#8B7355',
        floor: '#555555',
        ceiling: '#666666'
      },
      traditional: {
        walls: '#f0f0f0',
        floor: '#d4a574',
        ceiling: '#f8f8f8'
      },
      minimalist: {
        walls: '#ffffff',
        floor: '#f9f9f9',
        ceiling: '#ffffff'
      }
    };

    const palette = materialPalettes[style as keyof typeof materialPalettes] || materialPalettes.modern;

    // Bathroom-specific materials
    if (roomName === 'bathroom') {
      return {
        walls: '#e6f3ff',
        floor: '#B0C4DE',
        ceiling: palette.ceiling
      };
    }

    return palette;
  }

  /**
   * Determine if a room should have windows
   */
  private shouldAddWindow(roomName: string, features: string[]): boolean {
    // Bathrooms typically don't have windows unless specifically requested
    if (roomName === 'bathroom' && !features.includes('bathroom_window')) {
      return false;
    }

    // Storage spaces typically don't need windows
    if (roomName === 'closet' || roomName === 'pantry') {
      return false;
    }

    // Most other rooms benefit from natural light
    return Math.random() > 0.2; // 80% chance of windows
  }

  /**
   * Get appropriate features for a room type
   */
  private getRoomFeatures(roomName: string, requestedFeatures: string[]): string[] {
    const roomFeatures: Record<string, string[]> = {
      'living room': ['seating_area', 'entertainment_center'],
      'kitchen': ['countertops', 'appliances', 'storage'],
      'bedroom': ['bed_space', 'closet'],
      'bathroom': ['shower', 'sink', 'toilet'],
      'dining room': ['dining_table', 'storage'],
      'office': ['desk_space', 'storage', 'lighting']
    };

    const baseFeatures = roomFeatures[roomName] || [];
    
    // Add requested features if relevant
    const relevantFeatures = requestedFeatures.filter(feature => {
      if (roomName === 'living room' && feature === 'fireplace') return true;
      if (roomName === 'kitchen' && feature === 'island_kitchen') return true;
      if (roomName === 'bedroom' && feature === 'walk_in_closet') return true;
      return false;
    });

    return [...baseFeatures, ...relevantFeatures];
  }

  /**
   * Generate alternative designs
   */
  private async generateAlternatives(baseModel: ArchitecturalModel, count: number): Promise<ArchitecturalModel[]> {
    const alternatives: ArchitecturalModel[] = [];

    for (let i = 0; i < count; i++) {
      const alternative: ArchitecturalModel = {
        ...baseModel,
        id: `${baseModel.id}_alt_${i}`,
        name: `${baseModel.name} - Alternative ${i + 1}`,
        rooms: baseModel.rooms.map(room => ({
          ...room,
          dimensions: {
            ...room.dimensions,
            width: room.dimensions.width * (0.8 + Math.random() * 0.4),
            length: room.dimensions.length * (0.8 + Math.random() * 0.4)
          }
        }))
      };

      alternatives.push(alternative);
    }

    return alternatives;
  }

  /**
   * Calculate confidence score based on input quality and AI analysis
   */
  private calculateConfidence(processedInputs: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on input completeness (product design focused)
    if (processedInputs.components && processedInputs.components.length > 0) confidence += 0.2;
    if (processedInputs.features && processedInputs.features.length > 0) confidence += 0.1;
    if (processedInputs.style) confidence += 0.1;
    if (processedInputs.requirements && processedInputs.requirements.length > 0) confidence += 0.1;
    if (processedInputs.materials && processedInputs.materials.length > 0) confidence += 0.05;
    if (processedInputs.use_case) confidence += 0.05;

    // AI analysis adds confidence
    if (this.config.secretKey && this.config.openaiConnectionKey) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * Process design iteration requests using AI
   */
  async processDesignIteration(
    currentModel: ArchitecturalModel,
    userFeedback: string
  ): Promise<{ updatedModel: ArchitecturalModel; explanation: string; confidence: number }> {
    try {
      const prompt = `
You are an expert architect helping to refine a building design based on user feedback.

Current design:
- Rooms: ${currentModel.rooms.map(r => r.name).join(', ')}
- Style: ${currentModel.style}
- Total area: ${currentModel.totalArea}m²

User feedback: "${userFeedback}"

Analyze the feedback and suggest specific modifications. Return a JSON response with:
{
  "modifications": [
    {
      "type": "room_resize|room_add|room_remove|style_change|feature_add",
      "target": "room_id or general",
      "details": "specific change description",
      "new_dimensions": {"width": number, "length": number, "height": number} // if applicable
    }
  ],
  "explanation": "User-friendly explanation of changes",
  "reasoning": "Why these changes address the feedback"
}
`;

      const response = await this.callOpenAI([
        {
          role: 'system',
          content: 'You are an expert architect specializing in design iteration and client feedback integration.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      const content = response.choices[0]?.message?.content || '{}';
      const analysis = JSON.parse(content);

      // Apply modifications to create updated model
      const updatedModel = this.applyModifications(currentModel, analysis.modifications);

      return {
        updatedModel,
        explanation: analysis.explanation || 'Design updated based on your feedback.',
        confidence: 0.85
      };

    } catch (error) {
      console.error('Design iteration failed:', error);
      throw new Error('Failed to process design feedback: ' + (error as Error).message);
    }
  }

  /**
   * Apply modifications to architectural model
   */
  private applyModifications(model: ArchitecturalModel, modifications: any[]): ArchitecturalModel {
    const updatedModel = JSON.parse(JSON.stringify(model)); // Deep clone

    modifications.forEach(mod => {
      switch (mod.type) {
        case 'room_resize':
          const room = updatedModel.rooms.find((r: Room) => r.id === mod.target);
          if (room && mod.new_dimensions) {
            room.dimensions = mod.new_dimensions;
          }
          break;
        case 'room_add':
          // Add new room logic
          break;
        case 'style_change':
          updatedModel.style = mod.details;
          break;
        // Add more modification types as needed
      }
    });

    updatedModel.modified = new Date();
    return updatedModel;
  }
}

// Export singleton instance
export const architecturalAI = new ProductDesignAIService(); 