const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: 'farmer' | 'trader' | 'investor';
  name?: string;
  kycStatus?: string;
  walletAddress?: string | null;
}

export interface Document {
  id: string;
  doc_type: string;
  ipfs_hash: string;
  storage_url: string;
  created_at: string;
}

export interface Milestone {
  id: string;
  milestone?: 'farm' | 'warehouse' | 'port' | 'importer';
  title?: string;
  status?: string;
  notes: string | null;
  recorded_at: string;
  created_at: string;
}

export interface Deal {
  id: string;
  commodity: string;
  quantity: number;
  quantity_unit: string;
  total_value: number;
  funded_amount: number;
  total_invested: number;
  token_symbol: string;
  status: 'draft' | 'open' | 'funded' | 'delivered' | 'completed' | 'failed';
  delivery_date: string;
  created_at: string;
  documents?: Document[];
  milestones?: Milestone[];
}

export type TradeDeal = Deal;

export interface Investment {
  id: string;
  trade_deal_id: string;
  investor_id: string;
  token_amount: number;
  amount_usd: number;
  amount_invested: number;
  token_holdings: number;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  deal: Deal;
}

// ── Auth-aware fetch helper ───────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body?.message ?? res.statusText);
    err.response = { status: res.status, data: body };
    throw err;
  }
  return res.json();
}

// ── Stateful API client (used by dashboard / login pages) ────────────────────

export const apiClient = {
  setAuth(token: string, user: User) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('auth_user');
    return raw ? (JSON.parse(raw) as User) : null;
  },

  async getFarmerDeals(): Promise<Deal[]> {
    return apiFetch<Deal[]>('/trade-deals/my');
  },

  async getTraderDeals(): Promise<Deal[]> {
    return apiFetch<Deal[]>('/trade-deals/my');
  },

  async getInvestorInvestments(): Promise<Investment[]> {
    return apiFetch<Investment[]>('/investments/my');
  },

  async recordMilestone(dealId: string, data: { title: string; description: string }) {
    return apiFetch(`/shipments/${dealId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ── Public marketplace helpers ────────────────────────────────────────────────

export async function getOpenDeals(): Promise<Deal[]> {
  const res = await fetch(`${API_BASE}/trade-deals`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch deals');
  return res.json();
}

export async function getDealById(id: string): Promise<Deal | null> {
  const res = await fetch(`${API_BASE}/trade-deals/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch deal');
  return res.json();
}
