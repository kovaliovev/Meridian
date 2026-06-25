import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '600', '700'] })

export const metadata: Metadata = {
  title: 'Meridian',
  description: 'Your personal life planning app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable} font-sans bg-m-bg text-m-ink min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  )
}
