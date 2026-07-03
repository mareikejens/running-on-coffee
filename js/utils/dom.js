// Tiny DOM helpers — no framework.

export function qs(sel, root = document) {
  return root.querySelector(sel);
}

// el('button', { class: 'btn', onClick: fn }, 'Label')
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      node.className = value;
    } else if (key === 'dataset') {
      Object.assign(node.dataset, value);
    } else {
      node.setAttribute(key, value);
    }
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
