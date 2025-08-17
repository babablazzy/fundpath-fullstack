import { NextRequest, NextResponse } from 'next/server'

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitConfig {
  windowMs: number
  max: number
  message?: string
  statusCode?: number
}

export function createRateLimiter(config: RateLimitConfig) {
  return function rateLimit(request: NextRequest) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Clean up expired entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }

    // Get current rate limit data for this IP
    const current = rateLimitStore.get(ip)
    
    if (!current || current.resetTime < now) {
      // First request or window expired
      rateLimitStore.set(ip, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return null
    }

    if (current.count >= config.max) {
      // Rate limit exceeded
      return NextResponse.json(
        { 
          error: config.message || 'Too many requests',
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        },
        { 
          status: config.statusCode || 429,
          headers: {
            'X-RateLimit-Limit': config.max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(current.resetTime).toISOString(),
            'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString()
          }
        }
      )
    }

    // Increment count
    current.count++
    rateLimitStore.set(ip, current)
    
    return null
  }
}

// Pre-configured rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts. Please try again later.',
  statusCode: 429
})

export const signupRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 signup attempts per hour
  message: 'Too many signup attempts. Please try again later.',
  statusCode: 429
})

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many API requests. Please try again later.',
  statusCode: 429
})

export const webhookRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 webhook requests per minute
  message: 'Too many webhook requests.',
  statusCode: 429
})
