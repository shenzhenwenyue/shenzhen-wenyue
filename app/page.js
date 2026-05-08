'use client'
import { useState, useEffect } from 'react'

const CATEGORIES = [
  { name: 'Designer Fragrances', sub: 'Chanel, Dior, YSL, Tom Ford & more', cat: 'Perfumes' },
  { name: 'Lululemon', sub: 'Leggings, bras, shorts & more', cat: 'Lululemon' },
  { name: 'Alo Yoga', sub: 'Premium activewear sets', cat: 'Alo Yoga' },
  { name: 'Van Cleef & Co.', sub: 'Fine jewelry & accessories', soon: true },
  { name: 'Makeup', sub: 'Luxury cosmetics brands', soon: true },
  { name: 'Designer Caps', sub: 'MLB, luxury & streetwear', soon: true },
]

const STATS = [
  { value: '2,000+', label: 'Active Buyers' },
  { value: '1,000+', label: 'SKUs Available' },
  { value: '5+', label: 'Years in Business' },
  { value: 'Same-Day', label: 'Quote Response' },
]

export default function LandingPage() {
  const [productCount, setProductCount] = useState(null)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProductCount(data.length) })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-white">

      {/* ── HEADER ── */}
      <header className="bg-[#FF6A00] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="font-bold text-base sm:text-lg tracking-tight leading-none">Shenzhen Wenyue LTD. Co.</span>
            <p className="text-xs text-orange-100 mt-0.5">深圳闻悦贸易有限公司</p>
          </div>
          <nav className="flex items-center gap-2">
            <a href="/track" className="hidden sm:flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-2 transition-colors text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Track Order
            </a>
            <a href="/catalog" className="flex items-center gap-2 bg-white text-[#FF6A00] font-bold px-4 py-2 hover:bg-orange-50 transition-colors text-sm">
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
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-medium px-3 py-1 rounded-md border border-white/20">
              China Direct Source
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-medium px-3 py-1 rounded-md border border-white/20">
              USA Warehouse
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-medium px-3 py-1 rounded-md border border-white/20">
              Verified Supplier
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-5">
            Premium Products.<br className="hidden sm:block" /> Wholesale Prices.<br className="hidden sm:block" /> USA Ready.
          </h1>
          <p className="text-orange-100 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed font-normal">
            Designer fragrances, activewear, jewelry & more — sourced directly,
            priced for resellers, shipped from our US warehouse.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/catalog" className="inline-flex items-center justify-center gap-2 bg-white text-[#FF6A00] font-semibold px-7 py-3 hover:bg-orange-50 transition-colors text-sm shadow">
              Browse Full Catalog
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <a href="https://wa.me/16613737977" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-medium px-7 py-3 transition-colors text-sm border border-white/25">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Contact via WhatsApp
            </a>
          </div>
          {productCount && (
            <p className="text-orange-200 text-xs mt-6">{productCount}+ products available now</p>
          )}
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-[#1A1A1A] text-white py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <p className="text-2xl sm:text-3xl font-bold text-[#FF6A00]">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="py-12 px-4 bg-[#F5F5F5]">
        <div className="max-w-5xl mx-auto">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
            <p className="text-gray-400 text-sm mt-1">Volume pricing unlocks automatically as you add more pieces</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map(cat => (
              cat.soon ? (
                <div key={cat.name} className="relative flex flex-col p-4 sm:p-5 rounded-xl border border-gray-200 bg-gray-100 overflow-hidden select-none">
                  <div className="absolute inset-0 bg-gray-900/35 rounded-xl z-10 flex items-center justify-center">
                    <span className="bg-gray-800 text-gray-300 text-[10px] font-semibold px-3 py-1 rounded uppercase tracking-widest">
                      Coming Soon
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-gray-200 mb-3 opacity-40" />
                  <p className="font-semibold text-gray-400 text-sm">{cat.name}</p>
                  <p className="text-gray-300 text-xs mt-0.5">{cat.sub}</p>
                </div>
              ) : (
                <a key={cat.name} href={`/catalog?cat=${encodeURIComponent(cat.cat)}`}
                  className="flex flex-col p-4 sm:p-5 rounded-xl border border-gray-200 bg-white hover:border-[#FF6A00] hover:shadow-sm transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-[#FF6A00]/10 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4 text-[#FF6A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                    </svg>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm group-hover:text-[#FF6A00] transition-colors">{cat.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{cat.sub}</p>
                </a>
              )
            ))}
          </div>
          <div className="mt-6">
            <a href="/catalog" className="inline-flex items-center gap-2 bg-[#FF6A00] text-white font-semibold px-6 py-2.5 hover:bg-[#E55A00] transition-colors text-sm">
              View All Products
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-12 px-4 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { n: '01', title: 'Browse the Catalog', desc: 'Explore hundreds of products across 6 categories. All prices shown in USD with volume tiers.' },
              { n: '02', title: 'Request a Quote', desc: 'Add items to your order and submit a quote request. No payment required upfront.' },
              { n: '03', title: 'Confirm & Receive', desc: 'We confirm availability within hours, send a PDF invoice, and ship from our USA warehouse.' },
            ].map((step) => (
              <div key={step.n} className="flex flex-col">
                <span className="text-4xl font-bold text-gray-100 leading-none mb-3">{step.n}</span>
                <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section className="py-12 px-4 bg-[#F9F9F9] border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Buyers Choose Us</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { title: 'China Direct Source', desc: 'Factory-direct pricing on premium brands. Sourced straight from Shenzhen.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
              { title: 'USA Warehouse', desc: 'Inventory held in the US. Fast domestic shipping to your door.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
              { title: 'Volume Pricing', desc: 'Prices drop automatically as you add more pieces. No negotiation needed.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /> },
              { title: 'Verified Products', desc: 'Every product is inspected and verified before shipment.',
                icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></> },
              { title: 'Fast Quote Response', desc: 'Submit your cart online and receive a quote response same day.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /> },
            ].map(item => (
              <div key={item.title} className="flex gap-3 bg-white rounded-lg p-4 border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-[#FF6A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAYMENT METHODS ── */}
      <section className="py-12 px-4 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Accepted Payments</h2>
          <p className="text-gray-400 text-sm mb-8">Payment instructions are sent with your quote confirmation</p>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">

            {/* Cash App */}
            <div className="flex flex-col items-center gap-3 border border-gray-200 rounded-xl p-5 sm:p-6">
              <div className="w-12 h-12 rounded-xl bg-[#00D64F] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.5 2C9.46 2 6.67 3.37 4.78 5.57L3.5 4.3A1 1 0 002 5v4a1 1 0 001 1h4a1 1 0 00.71-1.71L6.56 7.14A7.5 7.5 0 0119.5 12a1 1 0 002 0C21.5 6.75 17.47 2 12.5 2zm0 20c3.04 0 5.83-1.37 7.72-3.57l1.28 1.27A1 1 0 0023 19v-4a1 1 0 00-1-1h-4a1 1 0 00-.71 1.71l1.15 1.15A7.5 7.5 0 014.5 12a1 1 0 00-2 0c0 5.25 4.03 10 9 10z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 text-sm">Cash App</p>
                <p className="text-gray-400 text-xs">Instant transfers</p>
              </div>
            </div>

            {/* Zelle */}
            <div className="flex flex-col items-center gap-3 border border-gray-200 rounded-xl p-5 sm:p-6">
              <div className="w-12 h-12 rounded-xl bg-[#6D1ED4] flex items-center justify-center">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 text-sm">Zelle</p>
                <p className="text-gray-400 text-xs">Bank-to-bank</p>
              </div>
            </div>

            {/* Alibaba */}
            <div className="flex flex-col items-center gap-3 border border-gray-200 rounded-xl p-5 sm:p-6">
              <div className="w-12 h-12 rounded-xl bg-[#FF6A00] flex items-center justify-center">
                <span className="text-white font-bold text-sm">Ali</span>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 text-sm">Alibaba</p>
                <p className="text-gray-400 text-xs">Trade Assurance</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bg-[#FF6A00] text-white py-14 px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to place your first order?</h2>
        <p className="text-orange-100 text-sm mb-7 max-w-sm mx-auto font-normal">
          Browse our full catalog, build your order, and request a quote — no account required.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/catalog" className="inline-flex items-center justify-center gap-2 bg-white text-[#FF6A00] font-semibold px-8 py-3 hover:bg-orange-50 transition-colors text-sm shadow">
            Browse Catalog
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a href="https://wa.me/16613737977" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-medium px-8 py-3 transition-colors text-sm border border-white/25">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp Us
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1A1A1A] text-gray-400 py-6 px-4 text-center text-xs">
        <p className="font-semibold text-white mb-1">Shenzhen Wenyue LTD. Co.</p>
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
