export interface StripeProduct {
  id: string
  priceId: string
  name: string
  description: string
  price: number
  mode: 'subscription' | 'payment'
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_SZar44GdJuJkJt',
    priceId: 'price_1ReRgCQlr7BhgPjLzPv64mSG',
    name: 'Pro Subscription',
    description: 'Advanced features for professional prototyping with 100 designs per month, 1000 refinement chats, priority support, advanced analytics, API access, and custom integrations',
    price: 100.00,
    mode: 'subscription'
  },
  {
    id: 'prod_SZarTkzjlfLb33',
    priceId: 'price_1ReRffQlr7BhgPjLRYQKCMwi',
    name: 'Plus Subscription',
    description: 'Enhanced prototyping capabilities with 10 designs per month, 100 refinement chats, priority processing, email support, and advanced export options',
    price: 25.00,
    mode: 'subscription'
  }
]

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId)
}

export const getProductById = (id: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.id === id)
}

export const getProductByTier = (tier: string): StripeProduct | undefined => {
  if (tier === 'pro') {
    return stripeProducts.find(product => product.name.includes('Pro'))
  } else if (tier === 'plus') {
    return stripeProducts.find(product => product.name.includes('Plus'))
  }
  return undefined
}