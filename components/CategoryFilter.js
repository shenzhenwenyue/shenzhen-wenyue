'use client'

export default function CategoryFilter({ categories, selected, onChange }) {
  return (
    <div className="border-b border-[#E8E8E8] bg-white">
      <div className="overflow-x-auto scrollbar-hide flex flex-nowrap gap-2 py-3 px-1">
        <button
          onClick={() => onChange(null)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border shrink-0 ${
            selected === null
              ? 'bg-[#FF6A00] text-white border-[#FF6A00]'
              : 'bg-white text-gray-600 border-[#E8E8E8] hover:border-[#FF6A00] hover:text-[#FF6A00]'
          }`}
        >
          Todos
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => onChange(cat === selected ? null : cat)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border shrink-0 ${
              selected === cat
                ? 'bg-[#FF6A00] text-white border-[#FF6A00]'
                : 'bg-white text-gray-600 border-[#E8E8E8] hover:border-[#FF6A00] hover:text-[#FF6A00]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  )
}
