import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ZooAPIRequest {
  action: 'generate' | 'status' | 'convert';
  prompt?: string;
  outputFormat?: string;
  units?: string;
  scale?: number;
  id?: string;
  convertFormat?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, prompt, outputFormat = 'gltf', units = 'mm', scale = 1, id, convertFormat } = await req.json() as ZooAPIRequest;
    
    // Get Zoo API token from environment
    const zooApiToken = Deno.env.get('ZOO_API_TOKEN');
    if (!zooApiToken) {
      throw new Error('Zoo API token not configured');
    }

    const zooHeaders = {
      'Authorization': `Bearer ${zooApiToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'AgentiCAD-Supabase/1.0'
    };

    let zooResponse: Response;
    let responseData: any;
    
    switch (action) {
      case 'generate':
        if (!prompt) {
          throw new Error('Prompt is required for generation');
        }
        
        console.log('Generating CAD model with prompt:', prompt);
        
        zooResponse = await fetch('https://api.zoo.dev/ai/text-to-cad/gltf', {
          method: 'POST',
          headers: zooHeaders,
          body: JSON.stringify({
            prompt,
            output_format: outputFormat,
            units,
            scale
          })
        });
        break;

      case 'status':
        if (!id) {
          throw new Error('ID is required for status check');
        }
        
        console.log('Checking status for CAD model:', id);
        
        zooResponse = await fetch(`https://api.zoo.dev/user/text-to-cad/${id}`, {
          method: 'GET',
          headers: zooHeaders
        });
        break;

      case 'convert':
        if (!id || !convertFormat) {
          throw new Error('ID and convert format are required for conversion');
        }
        
        console.log(`Getting download URL for CAD model ${id} in format ${convertFormat}`);
        
        // Note: Zoo API does not support direct STL conversion endpoints
        // STL conversion should be handled client-side using GLTF data
        if (convertFormat === 'stl') {
          console.log('STL format requested - Zoo API does not support direct STL download');
          return new Response(
            JSON.stringify({
              error: 'STL conversion not supported by Zoo API',
              message: 'Zoo API does not provide direct STL download endpoints. Use client-side GLTF-to-STL conversion.',
              suggested_approach: 'Convert GLTF model to STL format in the browser',
              _debug: {
                action: 'convert',
                format: convertFormat,
                timestamp: new Date().toISOString()
              }
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        // Try different approaches to get the model file
        
        // Approach 1: Try to get the model files directly from the model endpoint
        try {
          zooResponse = await fetch(`https://api.zoo.dev/user/text-to-cad/${id}`, {
            method: 'GET',
            headers: zooHeaders
          });
          
          if (zooResponse.ok) {
            const modelData = await zooResponse.json();
            console.log('Model data for download:', modelData);
            
            // Look for download URLs in the response
            if (modelData.outputs && modelData.outputs.gltf) {
              return new Response(
                JSON.stringify({
                  download_url: modelData.outputs.gltf,
                  _debug: {
                    action: 'convert',
                    approach: 'direct_model_data',
                    timestamp: new Date().toISOString()
                  }
                }),
                { 
                  status: 200,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              );
            }
            
            // If no direct URL, try to construct download URL (may not work for all formats)
            const downloadUrl = `https://api.zoo.dev/user/text-to-cad/${id}/download?format=${convertFormat}`;
            
            return new Response(
              JSON.stringify({
                download_url: downloadUrl,
                _debug: {
                  action: 'convert',
                  approach: 'constructed_url',
                  warning: 'This URL may not work - Zoo API endpoints are limited',
                  timestamp: new Date().toISOString()
                }
              }),
              { 
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        } catch (directError) {
          console.log('Direct model access failed:', directError);
        }
        
        // Approach 2: Try file conversion API with different endpoint (likely to fail)
        console.log('Trying file conversion API...');
        zooResponse = await fetch(`https://api.zoo.dev/file/conversion`, {
          method: 'POST',
          headers: zooHeaders,
          body: JSON.stringify({
            source_id: id,
            output_format: convertFormat
          })
        });
        
        if (!zooResponse.ok) {
          // Approach 3: Try alternative conversion endpoint (likely to fail)
          console.log('Standard conversion failed, trying alternative...');
          zooResponse = await fetch(`https://api.zoo.dev/ai/text-to-cad/${id}/convert`, {
            method: 'POST',
            headers: zooHeaders,
            body: JSON.stringify({
              format: convertFormat
            })
          });
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    responseData = await zooResponse.json();
    
    // Log the full response for debugging
    console.log('Zoo API Response:', {
      action,
      status: zooResponse.status,
      statusText: zooResponse.statusText,
      data: responseData
    });

    if (!zooResponse.ok) {
      const errorText = responseData.error || responseData.message || JSON.stringify(responseData);
      console.error('Zoo API error:', zooResponse.status, errorText);
      
      // Enhanced error messaging for common Zoo API issues
      let userFriendlyError = errorText;
      if (zooResponse.status === 422) {
        userFriendlyError = "Text-to-CAD server: 422 Unprocessable Entity. Text-to-CAD is still improving, and some prompts may fail. Try adjusting your prompt for better results. We review failures to enhance the model over time. For prompt tips and best practices, check out our community on [Discord](https://discord.gg/JQEpHR7Nt2) or [Discourse](https://community.zoo.dev).";
      } else if (zooResponse.status === 429) {
        userFriendlyError = "Rate limit exceeded. Please wait a moment before trying again.";
      } else if (zooResponse.status === 401) {
        userFriendlyError = "Authentication failed. Please check your Zoo API token.";
      } else if (zooResponse.status >= 500) {
        userFriendlyError = "Zoo API server error. Please try again later.";
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Zoo API error: ${zooResponse.status}`,
          details: userFriendlyError,
          action,
          status: zooResponse.status
        }),
        { 
          status: zooResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return the response data with enhanced structure
    return new Response(
      JSON.stringify({
        ...responseData,
        _debug: {
          action,
          timestamp: new Date().toISOString(),
          zooStatus: zooResponse.status
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}) 