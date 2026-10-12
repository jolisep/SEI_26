import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const contentTypes = { '.html': 'text/html; charset=utf-8' };

function applyMutation(html, mutation) {
  const mutations = {
    M01: ['Add to cart', 'Add item'],
    M02: ['data-testid="add-to-cart"', 'data-testid="add-product"'],
    M03: ['data-testid="coupon-message"', 'data-testid="discount-message"'],
    M04: ['<section aria-label="Customer details" data-testid="customer-form">', '<div class="checkout-fields"><section aria-label="Customer details" data-testid="customer-form">'],
    M05: ['<article data-testid="product-card">', '<div class="product-shell"><article data-testid="product-card">'],
    M06: ['<p data-testid="order-message" role="status">', '<div class="message-wrapper"><p data-testid="order-message" role="status">'],
    M07: ['data-testid="place-order" type="button"', 'class="primary-action" data-testid="place-order" type="button"'],
    M08: ['data-testid="product-search"', 'class="search-control" data-testid="product-search"'],
    M09: ['aria-label="Cart count" role="status"', 'aria-label="Basket total" role="status"'],
    M10: ['<label for="customer-name">Name</label>\n      <input id="customer-name"', '<label for="customer-email">Email</label>\n      <input id="customer-email"'],
    M11: ["String(Number(cartCount.textContent) + 1)", "String(Number(cartCount.textContent) + 2)"],
    M12: ["'Order placed successfully'", "'Order submission failed'"]
  };
  const change = mutations[mutation];
  return change ? html.replace(change[0], change[1]) : html;
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1:4173');
  const filePath = join(root, url.pathname === '/' || url.pathname === '/products' ? 'index.html' : url.pathname);
  try {
    let content = await readFile(filePath, 'utf8');
    content = applyMutation(content, url.searchParams.get('mutation'));
    response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] ?? 'text/plain' });
    response.end(content);
  } catch (error) {
    response.writeHead(404);
    response.end(error instanceof Error ? error.message : 'Not found');
  }
}).listen(4173, '127.0.0.1', () => {
  console.log('Demo running at http://127.0.0.1:4173');
});
