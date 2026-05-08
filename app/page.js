'use client'
import { useState, useEffect } from 'react'

const CATEGORIES = [
  { name: 'Designer Fragrances', sub: 'Chanel, Dior, YSL, Tom Ford & more', icon: '🌸', color: 'bg-purple-50 border-purple-100' },
  { name: 'Lululemon', sub: 'Leggings, bras, shorts & more', icon: '🏃', color: 'bg-red-50 border-red-100' },
  { name: 'Alo Yoga', sub: 'Premium activewear sets', icon: '🧘', color: 'bg-sky-50 border-sky-100' },
  { name: 'Van Cleef & Co.', sub: 'Fine jewelry replicas', icon: '💎', color: 'bg-yellow-50 border-yellow-100' },
  { name: 'Makeup', sub: 'Luxury cosmetics brands', icon: '💄', color: 'bg-pink-50 border-pink-100' },
  { name: 'Designer Caps', sub: 'MLB, luxury & streetwear', icon: '🧢', color: 'bg-green-50 border-green-100' },
]

const STATS = [
  { value: '2,000+', label: 'Active Buyers' },
  { value: '1,000+', label: 'SKUs Available' },
  { value: '5+', label: 'Years in Business' },
  { value: '24h', label: 'Quote Turnaround' },
]

const STEPS = [
  {
    n: '01',
    title: 'Browse the Catalog',
    desc: 'Explore hundreds of products across 6 categories. All prices shown in USD with volume tiers.',
  },
  {
    n: '02',
    title: 'Request a Quote',
    desc: 'Add items to your order and submit a quote request. No payment required upfront.',
  },
  {
    n: '03',
    title: 'Confirm & Receive',
    desc: "We confirm availability within 24h, send a PDF invoice, and ship from our USA warehouse.",
  },
]

export default function LandingPage() {
  const [productCount, setProductCount] = useState(null)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProductCount(data.length)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-white">

      {/* ── HEADER ── */}
      <header className="bg-[#FF6A00] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="font-bold text-base sm:text-lg tracking-tight leading-none">Shenzhen Wenyue Ltd.</span>
            <p className="text-xs text-orange-100 mt-0.5">Wholesale · B2B</p>
          </div>
          <nav className="flex items-center gap-2">
            <a
              href="/track"
              className="hidden sm:flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Track Order
            </a>
            <a
              href="/catalog"
              className="flex items-center gap-2 bg-white text-[#FF6A00] font-bold px-4 py-2 rounded-xl hover:bg-orange-50 transition-colors text-sm"
            >
              Browse Catalog
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </nav>
        </div>
      </header>

      {/* ── TRUST STRIP ── */}
      <div className="bg-gray-900 py-1.5 text-white">
        <div className="max-w-6xl mx-auto px-4 flex gap-6 justify-center text-xs flex-wrap">
          <span>&#10003; Verified Supplier</span>
          <span>&#10003; Secure Payment</span>
          <span>&#10003; USA Warehouse Stock</span>
          <span>&#10003; Prices in USD</span>
          <span>&#10003; +5 Years Experience</span>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-[#FF6A00] via-[#F05500] to-[#C23B00] text-white py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-5 uppercase tracking-widest">
            USA-Based Wholesale Supplier
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-5 tracking-tight">
            Premium Products.<br className="hidden sm:block" /> Wholesale Prices.<br className="hidden sm:block" /> USA Ready.
          </h1>
          <p className="text-orange-100 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Designer fragrances, activewear, jewelry & more — sourced directly,
            priced for resellers, shipped from our US warehouse.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/catalog"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#FF6A00] font-bold px-7 py-3.5 rounded-2xl hover:bg-orange-50 transition-colors text-sm shadow-lg"
            >
              Browse Full Catalog
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <a
              href="https://wa.me/16613737977"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-7 py-3.5 rounded-2xl transition-colors text-sm border border-white/30"
            >
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Contact via WhatsApp
            </a>
          </div>
          {productCount && (
            <p className="text-orange-200 text-xs mt-5">{productCount}+ products available now</p>
          )}
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-[#1A1A1A] text-white py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#FF6A00]">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="py-14 px-4 bg-[#F5F5F5]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Shop by Category</h2>
            <p className="text-gray-500 text-sm mt-2">Volume pricing unlocks automatically as you add more pieces</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {CATEGORIES.map(cat => (
              <a
                key={cat.name}
                href={`/catalog`}
                className={`flex flex-col items-center text-center p-4 sm:p-5 rounded-2xl border-2 bg-white hover:border-[#FF6A00] hover:shadow-md transition-all group ${cat.color}`}
              >
                <span className="text-3xl sm:text-4xl mb-2">{cat.icon}</span>
                <p className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-[#FF6A00] transition-colors">{cat.name}</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-snug">{cat.sub}</p>
              </a>
            ))}
          </div>
          <div className="text-center mt-8">
            <a
              href="/catalog"
              className="inline-flex items-center gap-2 bg-[#FF6A00] text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-[#E55A00] transition-colors text-sm shadow-md"
            >
              View All Products
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">How It Works</h2>
            <p className="text-gray-500 text-sm mt-2">From browsing to delivery in 3 simple steps</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-6 left-[calc(100%-0px)] w-full h-0.5 bg-gray-100 z-0" />
                )}
                <div className="relative z-10 flex flex-col items-center text-center sm:items-start sm:text-left">
                  <div className="w-12 h-12 rounded-2xl bg-[#FF6A00] text-white font-extrabold text-lg flex items-center justify-center mb-4 shadow-md">
                    {step.n}
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section className="py-12 px-4 bg-[#FFF7F0]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-2xl font-extrabold text-gray-900 mb-8">Why Buyers Choose Us</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: '🏭', title: 'USA Warehouse', desc: 'Inventory held in the US. Faster shipping, no customs delays.' },
              { icon: '💰', title: 'Volume Pricing', desc: 'Prices drop automatically as you add more pieces. No negotiation needed.' },
              { icon: '✅', title: 'Verified Products', desc: 'Every product is inspected and verified before shipment.' },
              { icon: '⚡', title: '24h Quote Turnaround', desc: 'Submit your cart online and receive a PDF quote within 24 hours.' },
            ].map(item => (
              <div key={item.title} className="flex gap-4 bg-white rounded-2xl p-4 border border-orange-100">
                <span className="text-2xl shrink-0">{item.icon}</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bg-[#FF6A00] text-white py-14 px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Ready to place your first order?</h2>
        <p className="text-orange-100 text-sm mb-7 max-w-sm mx-auto">
          Browse our full catalog, build your order, and request a quote — no account required.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/catalog"
            className="inline-flex items-center justify-center gap-2 bg-white text-[#FF6A00] font-bold px-8 py-3.5 rounded-2xl hover:bg-orange-50 transition-colors text-sm shadow-lg"
          >
            Browse Catalog
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="https://wa.me/16613737977"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-8 py-3.5 rounded-2xl transition-colors text-sm border border-white/30"
          >
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp Us
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1A1A1A] text-gray-400 py-6 px-4 text-center text-xs">
        <p className="font-semibold text-white mb-1">Shenzhen Wenyue Ltd.</p>
        <p>USA Wholesale Supplier · All prices in USD</p>
        <div className="flex justify-center gap-4 mt-3">
          <a href="/catalog" className="hover:text-white transition-colors">Catalog</a>
          <a href="/track" className="hover:text-white transition-colors">Track Order</a>
          <a href="https://wa.me/16613737977" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a>
        </div>
      </footer>

    </div>
  )
}
