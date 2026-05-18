import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tribal Subtitle',
  description: 'Altyazı video oluşturucu',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
