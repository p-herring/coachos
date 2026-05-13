import { redirect } from 'next/navigation'

// Root redirects to login; middleware handles authenticated users from there.
export default function RootPage() {
  redirect('/login')
}
