import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Shenzhen Wenyue — Wholesale Catalog',
  description: 'Designer fragrances, activewear, jewelry & more at wholesale prices. USA warehouse. B2B supplier.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        {children}
      </body>
    </html>
  )
}
