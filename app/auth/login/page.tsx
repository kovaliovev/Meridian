'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const email = `${username.trim().toLowerCase()}@meridian.app`
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard/edit')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-m-bg">
      <div className="w-full max-w-sm px-8 py-10">
        {/* Brand */}
        <div className="text-center mb-10">
          <p className="font-mono text-2xl font-bold tracking-[0.3em] text-m-violet-bright uppercase">
            Meridian
          </p>
          <p className="mt-2 text-xs text-m-dim tracking-wide">your personal meridian</p>
        </div>

        {/* Card */}
        <div className="border border-m-line rounded-xl p-8 bg-m-surface">
          <h1 className="text-base font-semibold text-m-ink mb-6">Sign in</h1>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[11px] text-m-dim tracking-wide uppercase mb-2">Username</label>
              <input
                type="text"
                value={username}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full bg-transparent border-b border-m-spoke focus:border-m-violet text-sm text-m-ink outline-none py-1.5 transition-colors placeholder:text-m-ghost"
              />
            </div>
            <div>
              <label className="block text-[11px] text-m-dim tracking-wide uppercase mb-2">Password</label>
              <input
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-transparent border-b border-m-spoke focus:border-m-violet text-sm text-m-ink outline-none py-1.5 transition-colors"
              />
            </div>
            {error && (
              <p className="text-xs text-m-red">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-m-violet text-m-bg text-sm font-semibold rounded-lg hover:bg-m-violet-bright disabled:opacity-40 transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-xs text-m-ghost text-center">
          No account?{' '}
          <Link href="/auth/signup" className="text-m-dim hover:text-m-violet transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
