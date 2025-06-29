import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    // Check for required environment variables with detailed logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey,
      hasStripeSecret: !!stripeSecret,
      supabaseUrlLength: supabaseUrl?.length || 0,
      stripeSecretPrefix: stripeSecret?.substring(0, 7) || 'none'
    });

    if (!supabaseUrl) {
      console.error('Missing SUPABASE_URL environment variable');
      return corsResponse({ 
        error: 'Missing SUPABASE_URL environment variable',
        details: 'The SUPABASE_URL environment variable is required but not set'
      }, 500);
    }

    if (!supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
      return corsResponse({ 
        error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable',
        details: 'The SUPABASE_SERVICE_ROLE_KEY environment variable is required but not set'
      }, 500);
    }

    if (!stripeSecret) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      return corsResponse({ 
        error: 'Missing STRIPE_SECRET_KEY environment variable',
        details: 'The STRIPE_SECRET_KEY environment variable is required but not set'
      }, 500);
    }

    // Validate Stripe secret key format
    if (!stripeSecret.startsWith('sk_')) {
      console.error('Invalid STRIPE_SECRET_KEY format');
      return corsResponse({ 
        error: 'Invalid STRIPE_SECRET_KEY format',
        details: 'The STRIPE_SECRET_KEY must start with "sk_"'
      }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecret, {
      appInfo: {
        name: 'AgentiCAD Integration',
        version: '1.0.0',
      },
    });

    console.log('Successfully initialized Supabase and Stripe clients');

    const { price_id, success_url, cancel_url, mode } = await req.json();

    const error = validateParameters(
      { price_id, success_url, cancel_url, mode },
      {
        cancel_url: 'string',
        price_id: 'string',
        success_url: 'string',
        mode: { values: ['payment', 'subscription'] },
      },
    );

    if (error) {
      console.error('Parameter validation error:', error);
      return corsResponse({ error }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return corsResponse({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Attempting to authenticate user with token length:', token.length);

    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      console.error('Failed to authenticate user:', getUserError);
      return corsResponse({ 
        error: 'Failed to authenticate user',
        details: getUserError.message
      }, 401);
    }

    if (!user) {
      console.error('User not found after authentication');
      return corsResponse({ error: 'User not found' }, 404);
    }

    console.log('Successfully authenticated user:', user.id);

    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error('Failed to fetch customer information from the database', getCustomerError);
      return corsResponse({ 
        error: 'Failed to fetch customer information',
        details: getCustomerError.message
      }, 500);
    }

    let customerId;

    /**
     * In case we don't have a mapping yet, the customer does not exist and we need to create one.
     */
    if (!customer || !customer.customer_id) {
      console.log('Creating new Stripe customer for user:', user.id);

      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      console.log(`Created new Stripe customer ${newCustomer.id} for user ${user.id}`);

      const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });

      if (createCustomerError) {
        console.error('Failed to save customer information in the database', createCustomerError);

        // Try to clean up the Stripe customer
        try {
          await stripe.customers.del(newCustomer.id);
        } catch (deleteError) {
          console.error('Failed to clean up Stripe customer after database error:', deleteError);
        }

        return corsResponse({ 
          error: 'Failed to create customer mapping',
          details: createCustomerError.message
        }, 500);
      }

      if (mode === 'subscription') {
        const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
          customer_id: newCustomer.id,
          status: 'not_started',
        });

        if (createSubscriptionError) {
          console.error('Failed to save subscription in the database', createSubscriptionError);

          // Try to clean up the Stripe customer since we couldn't create the subscription
          try {
            await stripe.customers.del(newCustomer.id);
            await supabase.from('stripe_customers').delete().eq('customer_id', newCustomer.id);
          } catch (deleteError) {
            console.error('Failed to clean up after subscription creation error:', deleteError);
          }

          return corsResponse({ 
            error: 'Unable to save the subscription in the database',
            details: createSubscriptionError.message
          }, 500);
        }
      }

      customerId = newCustomer.id;
      console.log(`Successfully set up new customer ${customerId} with subscription record`);
    } else {
      customerId = customer.customer_id;
      console.log('Using existing customer:', customerId);

      if (mode === 'subscription') {
        // Verify subscription exists for existing customer
        const { data: subscription, error: getSubscriptionError } = await supabase
          .from('stripe_subscriptions')
          .select('status')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (getSubscriptionError) {
          console.error('Failed to fetch subscription information from the database', getSubscriptionError);
          return corsResponse({ 
            error: 'Failed to fetch subscription information',
            details: getSubscriptionError.message
          }, 500);
        }

        if (!subscription) {
          // Create subscription record for existing customer if missing
          const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
            customer_id: customerId,
            status: 'not_started',
          });

          if (createSubscriptionError) {
            console.error('Failed to create subscription record for existing customer', createSubscriptionError);
            return corsResponse({ 
              error: 'Failed to create subscription record for existing customer',
              details: createSubscriptionError.message
            }, 500);
          }
        }
      }
    }

    console.log('Creating Stripe checkout session for customer:', customerId);

    // Determine tier from price_id
    let tier = 'free';
    if (price_id === 'price_1ReRffQlr7BhgPjLRYQKCMwi') {
      tier = 'plus';
    } else if (price_id === 'price_1ReRgCQlr7BhgPjLzPv64mSG') {
      tier = 'pro';
    }

    console.log('Setting up checkout for tier:', tier, 'with price_id:', price_id);

    // create Checkout Session with metadata
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode,
      success_url,
      cancel_url,
      metadata: {
        userId: user.id,
        customerId: customerId,
        tier: tier,
        priceId: price_id,
        userEmail: user.email || ''
      },
      // Add subscription data to help with immediate updates
      subscription_data: mode === 'subscription' ? {
        metadata: {
          userId: user.id,
          tier: tier,
          userEmail: user.email || ''
        }
      } : undefined,
    });

    console.log(`Created checkout session ${session.id} for customer ${customerId}`);

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`Checkout error: ${error.message}`);
    console.error('Full error:', error);
    console.error('Error stack:', error.stack);
    
    return corsResponse({ 
      error: error.message || 'An unexpected error occurred',
      details: error.stack || 'No additional details available'
    }, 500);
  }
});

type ExpectedType = 'string' | { values: string[] };
type Expectations<T> = { [K in keyof T]: ExpectedType };

function validateParameters<T extends Record<string, any>>(values: T, expected: Expectations<T>): string | undefined {
  for (const parameter in values) {
    const expectation = expected[parameter];
    const value = values[parameter];

    if (expectation === 'string') {
      if (value == null) {
        return `Missing required parameter ${parameter}`;
      }
      if (typeof value !== 'string') {
        return `Expected parameter ${parameter} to be a string got ${JSON.stringify(value)}`;
      }
    } else {
      if (!expectation.values.includes(value)) {
        return `Expected parameter ${parameter} to be one of ${expectation.values.join(', ')}`;
      }
    }
  }

  return undefined;
}