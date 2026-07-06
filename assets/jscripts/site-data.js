export async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.json();
}

export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  const { className, text, html, attrs = {} } = options;

  if (className) {
    element.className = className;
  }

  if (text != null) {
    element.textContent = text;
  }

  if (html != null) {
    element.innerHTML = html;
  }

  Object.entries(attrs).forEach(([key, value]) => {
    if (value != null) {
      element.setAttribute(key, value);
    }
  });

  return element;
}

export function formatNumber(value, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toFixed(digits);
}

export function formatCurrency(value, currency = "USD") {
  if (value == null || Number.isNaN(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value));
}

export function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

export function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString();
}

export function statusClass(status) {
  switch (status) {
    case "paid":
      return "lci-status lci-status--paid";
    case "partial":
      return "lci-status lci-status--partial";
    default:
      return "lci-status lci-status--unknown";
  }
}

export function renderError(target, message) {
  target.innerHTML = `<div class="lci-alert lci-alert--warning">${message}</div>`;
}

export function availabilityBadges(availability) {
  return [
    ["Standings", availability.standings],
    ["Rosters", availability.rosters],
    ["Draft", availability.draftBoard],
  ];
}
