import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Initialize with environment variable validation
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

console.log('Webhook environment check:', {
  hasStripeSecret: !!stripeSecret,
  hasWebhookSecret: !!stripeWebhookSecret,
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseServiceKey: !!supabaseServiceKey,
  stripeSecretPrefix: stripeSecret?.substring(0, 7) || 'none'
});

if (!stripeSecret) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

if (!stripeWebhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
}

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'AgentiCAD Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature found in headers');
      return new Response('No signature found', { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // get the raw body
    const body = await req.text();
    console.log('Received webhook with signature:', signature.substring(0, 20) + '...');

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
      console.log('Successfully verified webhook signature for event:', event.type);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    console.log('Processing webhook event:', event.type, 'with ID:', event.id);

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    console.error('Error stack:', error.stack);
    return Response.json({ error: error.message }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
});

async function handleEvent(event: Stripe.Event) {
  try {
    console.log('Handling event:', event.type);
    
    const stripeData = event?.data?.object ?? {};

    if (!stripeData) {
      console.log('No data object in event, skipping');
      return;
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(stripeData as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(stripeData as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(stripeData as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(stripeData as Stripe.Invoice);
        break;
      default:
        console.log('Unhandled event type:', event.type);
    }
  } catch (error) {
    console.error('Error in handleEvent:', error);
    throw error;
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed for session:', session.id);
  console.log('Session metadata:', session.metadata);
  
  const customerId = session.customer as string;
  if (!customerId) {
    console.error('No customer ID in checkout session');
    return;
  }

  if (session.mode === 'subscription') {
    console.log('Subscription checkout completed, syncing customer data');
    
    // If we have metadata with user info, use it for immediate update
    if (session.metadata?.userId && session.metadata?.tier) {
      console.log('Using checkout metadata for immediate profile update');
      await forceUpdateUserProfileWithMetadata(session.metadata.userId, session.metadata.tier);
    }
    
    // Also sync from Stripe as backup
    await syncCustomerFromStripe(customerId);
    
    // Force immediate profile update with multiple retries
    await forceUpdateUserProfile(customerId);
    
    // Additional retries with delays to ensure update takes
    setTimeout(async () => {
      await forceUpdateUserProfile(customerId);
    }, 1000);
    
    setTimeout(async () => {
      await forceUpdateUserProfile(customerId);
    }, 3000);
    
    setTimeout(async () => {
      await forceUpdateUserProfile(customerId);
    }, 5000);
    
  } else if (session.mode === 'payment' && session.payment_status === 'paid') {
    console.log('One-time payment completed');
    await handleOneTimePayment(session);
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  console.log('Processing subscription change:', subscription.id, 'status:', subscription.status);
  console.log('Subscription metadata:', subscription.metadata);
  
  const customerId = subscription.customer as string;
  if (!customerId) {
    console.error('No customer ID in subscription');
    return;
  }

  // First sync the subscription data from Stripe
  await syncCustomerFromStripe(customerId);
  
  // Force immediate profile update
  await forceUpdateUserProfile(customerId);
  
  // If we have metadata with user info, use it for immediate update as well
  if (subscription.metadata?.userId && subscription.metadata?.tier) {
    console.log('Using subscription metadata for immediate profile update');
    await forceUpdateUserProfileWithMetadata(subscription.metadata.userId, subscription.metadata.tier);
  }
  
  // Additional delayed updates to ensure persistence
  setTimeout(async () => {
    await forceUpdateUserProfile(customerId);
  }, 2000);
  
  setTimeout(async () => {
    await forceUpdateUserProfile(customerId);
  }, 5000);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing invoice payment succeeded:', invoice.id);
  
  const customerId = invoice.customer as string;
  if (!customerId) {
    console.error('No customer ID in invoice');
    return;
  }

  await syncCustomerFromStripe(customerId);
  await forceUpdateUserProfile(customerId);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing invoice payment failed:', invoice.id);
  
  const customerId = invoice.customer as string;
  if (!customerId) {
    console.error('No customer ID in invoice');
    return;
  }

  await syncCustomerFromStripe(customerId);
  await forceUpdateUserProfile(customerId);
}

async function handleOneTimePayment(session: Stripe.Checkout.Session) {
  try {
    console.log('Processing one-time payment for session:', session.id);
    
    const customerId = session.customer as string;
    
    // Insert the order into the stripe_orders table
    const { error: orderError } = await supabase.from('stripe_orders').insert({
      checkout_session_id: session.id,
      payment_intent_id: session.payment_intent as string,
      customer_id: customerId,
      amount_subtotal: session.amount_subtotal,
      amount_total: session.amount_total,
      currency: session.currency,
      payment_status: session.payment_status,
      status: 'completed',
    });

    if (orderError) {
      console.error('Error inserting order:', orderError);
      return;
    }
    console.info(`Successfully processed one-time payment for session: ${session.id}`);
  } catch (error) {
    console.error('Error processing one-time payment:', error);
  }
}

async function forceUpdateUserProfileWithMetadata(userId: string, tier: string) {
  try {
    console.log('Force updating user profile with metadata - userId:', userId, 'tier:', tier);
    
    // Determine status based on tier
    const status = tier === 'free' ? null : 'active';

    const now = new Date().toISOString();
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier: tier,
        subscription_status: status,
        updated_at: now
      })
      .eq('id', userId);

    if (!updateError) {
      console.log('Successfully updated profile using metadata for user:', userId, 'to tier:', tier);
      
      // Additional trigger to ensure real-time subscriptions pick up the change
      setTimeout(async () => {
        await supabase
          .from('user_profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', userId);
        console.log('Triggered additional real-time update for user:', userId);
      }, 500);
    } else {
      console.error('Error updating profile with metadata:', updateError);
    }
  } catch (error) {
    console.error('Error in forceUpdateUserProfileWithMetadata:', error);
  }
}

async function forceUpdateUserProfile(customerId: string) {
  try {
    console.log('Force updating user profile for customer:', customerId);
    
    // Get the user ID from the customer
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .single();

    if (!customer) {
      console.error('Customer not found for force update:', customerId);
      return;
    }

    // Get the latest subscription data
    const { data: subscription } = await supabase
      .from('stripe_subscriptions')
      .select('*')
      .eq('customer_id', customerId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!subscription) {
      console.log('No subscription found for customer:', customerId);
      return;
    }

    // Determine the correct tier and status
    let tier = 'free';
    let status = null;

    if (subscription.status === 'active' && subscription.price_id) {
      switch (subscription.price_id) {
        case 'price_1ReRffQlr7BhgPjLRYQKCMwi':
          tier = 'plus';
          break;
        case 'price_1ReRgCQlr7BhgPjLzPv64mSG':
          tier = 'pro';
          break;
        default:
          tier = 'free';
      }
    }

    // Map status
    switch (subscription.status) {
      case 'active':
        status = 'active';
        break;
      case 'canceled':
        status = 'canceled';
        break;
      case 'past_due':
        status = 'past_due';
        break;
      case 'incomplete':
        status = 'incomplete';
        break;
      case 'trialing':
        status = 'trialing';
        break;
      default:
        status = null;
    }

    console.log('Updating profile for user:', customer.user_id, 'to tier:', tier, 'status:', status);

    // Force update the user profile directly with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      const now = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          subscription_tier: tier,
          subscription_status: status,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.subscription_id,
          current_period_start: subscription.current_period_start 
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : null,
          current_period_end: subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          updated_at: now
        })
        .eq('id', customer.user_id);

      if (!updateError) {
        console.log('Successfully force updated profile for user:', customer.user_id, 'to tier:', tier, 'on attempt:', retryCount + 1);
        
        // Additional trigger to ensure real-time subscriptions pick up the change
        setTimeout(async () => {
          await supabase
            .from('user_profiles')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', customer.user_id);
          console.log('Triggered additional real-time update for user:', customer.user_id);
        }, 500);
        
        break;
      }

      console.error('Error force updating profile on attempt:', retryCount + 1, updateError);
      retryCount++;
      
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    if (retryCount === maxRetries) {
      console.error('Failed to update user profile after max retries for user:', customer.user_id);
    }
  } catch (error) {
    console.error('Error in forceUpdateUserProfile:', error);
  }
}

async function syncCustomerFromStripe(customerId: string) {
  try {
    console.log('Syncing customer from Stripe:', customerId);
    
    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    console.log(`Found ${subscriptions.data.length} subscriptions for customer ${customerId}`);

    // First, ensure the customer exists in our database
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .single();

    if (!existingCustomer) {
      console.error(`Customer ${customerId} not found in database`);
      return;
    }

    if (subscriptions.data.length === 0) {
      console.info(`No subscriptions found for customer: ${customerId}, setting to not_started`);
      
      // Update or insert subscription record with not_started status
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_id: null,
          price_id: null,
          status: 'not_started',
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
          payment_method_brand: null,
          payment_method_last4: null,
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
      
      console.log('Successfully updated subscription to not_started status');
      return;
    }

    // Process the most recent subscription
    const subscription = subscriptions.data[0];
    console.log('Processing subscription:', subscription.id, 'with status:', subscription.status, 'price_id:', subscription.items.data[0]?.price?.id);

    // Extract payment method information
    let paymentMethodBrand = null;
    let paymentMethodLast4 = null;
    
    if (subscription.default_payment_method && typeof subscription.default_payment_method !== 'string') {
      paymentMethodBrand = subscription.default_payment_method.card?.brand ?? null;
      paymentMethodLast4 = subscription.default_payment_method.card?.last4 ?? null;
    }

    // Store subscription state
    const subscriptionData = {
      customer_id: customerId,
      subscription_id: subscription.id,
      price_id: subscription.items.data[0]?.price?.id || null,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      payment_method_brand: paymentMethodBrand,
      payment_method_last4: paymentMethodLast4,
      status: subscription.status,
    };

    console.log('Upserting subscription data:', subscriptionData);

    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      subscriptionData,
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    
    console.info(`Successfully synced subscription for customer: ${customerId}`);
    
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}