import './globals.css'
import type { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import { ToastContainer } from '@/components/Toast'
import ServiceWorkerReg from '@/components/ServiceWorkerReg'
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap'
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap'
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap'
})

export const metadata = {
  title: 'SurveyMania',
  description: 'Collaborative survey platform'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${plusJakarta.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
        <body className="min-h-screen">
          <ServiceWorkerReg />
          <div className="mx-auto max-w-6xl p-6">{children}</div>
          <ToastContainer />
        </body>
      </html>
    </ClerkProvider>
  )
}
