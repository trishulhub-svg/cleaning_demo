import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function LogoutPage() {
  const cookieStore = await cookies()
  cookieStore.delete('next-auth.session-token')
  cookieStore.delete('__Secure-next-auth.session-token')
  redirect('/')
}
