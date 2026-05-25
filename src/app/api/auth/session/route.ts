import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token =
      cookieStore.get('next-auth.session-token')?.value ||
      cookieStore.get('__Secure-next-auth.session-token')?.value

    if (!token) {
      return Response.json({ user: null }, { status: 200 })
    }

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      return Response.json({ user: null }, { status: 200 })
    }

    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as Record<string, unknown>

    const id =
      typeof decoded.id === 'number'
        ? decoded.id
        : typeof decoded.sub === 'string'
          ? parseInt(decoded.sub, 10)
          : null
    const name = typeof decoded.name === 'string' ? decoded.name : null
    const email = typeof decoded.email === 'string' ? decoded.email : null
    const role = typeof decoded.role === 'string' ? decoded.role : null
    const userType =
      typeof decoded.userType === 'string' ? decoded.userType : null

    if (!id || !name || !email || !userType) {
      return Response.json({ user: null }, { status: 200 })
    }

    return Response.json({
      user: {
        id,
        name,
        email,
        role: role || '',
        userType,
      },
    })
  } catch {
    // Token invalid or expired
    return Response.json({ user: null }, { status: 200 })
  }
}
