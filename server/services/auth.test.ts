import { describe, expect, it } from 'bun:test'
import { hashPassword, signToken, verifyPassword, verifyToken } from './auth'

describe('Auth Service', () => {
  describe('Password Hashing', () => {
    it('should hash a password and verify it', async () => {
      const password = 'mysecretpassword'
      const hash = await hashPassword(password)
      expect(hash).not.toBe(password)

      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should fail verification for incorrect password', async () => {
      const password = 'mysecretpassword'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword('wrongpassword', hash)
      expect(isValid).toBe(false)
    })
  })

  describe('JWT Management', () => {
    it('should sign and verify a token', async () => {
      const payload = { userId: 1, email: 'test@example.com' }
      const token = await signToken(payload)
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)

      const verified = await verifyToken(token)
      expect(verified.userId).toBe(payload.userId)
      expect(verified.email).toBe(payload.email)
    })

    it('should throw error for invalid token', async () => {
      await expect(verifyToken('invalid.token.here')).rejects.toThrow()
    })
  })
})
