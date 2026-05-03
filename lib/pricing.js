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
