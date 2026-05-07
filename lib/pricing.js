/**
 * Devuelve el precio unitario según la cantidad en carrito.
 * Busca el tier más bajo que aplique.
 */
export function getPrecio(product, qty) {
  if (product.qty_tier5 && qty >= product.qty_tier5 && product.precio_tier5) {
    return product.precio_tier5
  }
  if (product.qty_tier4 && qty >= product.qty_tier4 && product.precio_tier4) {
    return product.precio_tier4
  }
  if (product.qty_tier3 && qty >= product.qty_tier3 && product.precio_tier3) {
    return product.precio_tier3
  }
  if (product.qty_tier2 && qty >= product.qty_tier2 && product.precio_tier2) {
    return product.precio_tier2
  }
  return product.precio_1
}

/**
 * Subtotal de un item del carrito.
 */
export function getSubtotal(product, qty) {
  return getPrecio(product, qty) * qty
}

/**
 * Devuelve el costo unitario de un item según las reglas de costo y el volumen total de la categoría.
 * Subcategoría tiene prioridad sobre categoría.
 * Devuelve null si no hay regla definida para ese producto.
 */
export function getCosto(rules, item, totalCategoryQty) {
  if (!rules?.length) return null
  const compoundKey = `${item.categoria}|${item.subcategoria}`
  const rule =
    rules.find(r => r.match_campo === 'subcategoria' && r.match_valor === compoundKey) ||
    rules.find(r => r.match_campo === 'subcategoria' && r.match_valor === item.subcategoria) ||
    rules.find(r => r.match_campo === 'categoria' && r.match_valor === item.categoria)
  if (!rule) return null
  if (rule.fijo) return rule.costo_1
  const qty = totalCategoryQty ?? item.qty
  if (rule.qty_tier4 && qty >= rule.qty_tier4 && rule.costo_tier4) return rule.costo_tier4
  if (rule.qty_tier3 && qty >= rule.qty_tier3 && rule.costo_tier3) return rule.costo_tier3
  if (rule.qty_tier2 && qty >= rule.qty_tier2 && rule.costo_tier2) return rule.costo_tier2
  return rule.costo_1
}
