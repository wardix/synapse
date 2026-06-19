import * as bcrypt from 'bcryptjs'
import { type JWTPayload, jwtVerify, SignJWT } from 'jose'

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export type AuthJWTPayload = {
  userId: number
  email: string
} & JWTPayload

const getSecret = () => {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-dev-secret-key-please-change',
  )
}

export async function signToken(payload: {
  userId: number
  email: string
}): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d'
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<AuthJWTPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as AuthJWTPayload
}
