import { useMemo, useState } from 'react';
import type { View } from './types';

const API_BASE = '/api/v1';

type BannerType = 'success' | 'error' | 'info';

type Transaction = {
  id: string;
  type: string;
  amount: number;
  timestamp: string;
};

const App = () => {
  const [view, setView] = useState<View>('landing');
  const [banner, setBanner] = useState('Welcome! Start by registering or logging in.');
  const [bannerType, setBannerType] = useState<BannerType>('info');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [details, setDetails] = useState<string | null>(null);

  const setFeedback = (nextMessage: string, type: BannerType = 'info') => {
    setBanner(nextMessage);
    setBannerType(type);
  };

  const requestJson = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  };

  const loadDashboard = async (path = '/dashboard/summary', suppressFeedback = false) => {
    setLoading(true);
    try {
      const res = await requestJson(path);
      setBalance(res.data.current_balance ?? 0);
      setTransactions(res.data.recent_transactions ?? []);
      setDetails(JSON.stringify(res.data, null, 2));
      if (!suppressFeedback) {
        if ((res.data.recent_transactions ?? []).length === 0) {
          setFeedback('Dashboard loaded. No recent transactions yet.', 'info');
        } else {
          setFeedback('Dashboard loaded.', 'info');
        }
      }
    } catch (error: any) {
      if (!suppressFeedback) {
        setFeedback(error.message, 'error');
      }
      setDetails(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const payload = Object.fromEntries(form.entries());
      const res = await requestJson('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
      setFeedback(res.message || 'Account created successfully.', 'success');
      setDetails(JSON.stringify(res.data, null, 2));
      setView('login');
    } catch (error: any) {
      setFeedback(error.message, 'error');
      setDetails(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const payload = Object.fromEntries(form.entries());
      const res = await requestJson('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
      const userData = res.data;
      setUser({ username: userData.username, role: userData.role });
      setFeedback(`Logged in as ${userData.username}.`, 'success');
      setDetails(JSON.stringify(res.data, null, 2));
      setView('dashboard');
      await loadDashboard();
    } catch (error: any) {
      setFeedback(error.message, 'error');
      setDetails(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLedger = async (event: React.FormEvent<HTMLFormElement>, action: 'deposit' | 'withdraw') => {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const amount = Number(form.get('amount'));
      const res = await requestJson(`/transactions/${action}`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      setFeedback(`${action === 'deposit' ? 'Deposit' : 'Withdrawal'} was successful.`, 'success');
      setDetails(JSON.stringify(res.data, null, 2));
      await loadDashboard();
    } catch (error: any) {
      setFeedback(error.message, 'error');
      setDetails(error.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const res = await requestJson('/auth/logout', { method: 'POST' });
      setUser(null);
      setBalance(0);
      setTransactions([]);
      setFeedback(res.message || 'Logged out successfully.', 'info');
      setDetails(null);
      setView('landing');
    } catch (error: any) {
      setFeedback(error.message, 'error');
      setDetails(error.message);
    } finally {
      setLoading(false);
    }
  };

  const nav = useMemo(
    () => (
      <nav style={navStyle}>
        <button style={linkButton} onClick={() => setView('landing')}>
          Home
        </button>
        <button style={linkButton} onClick={() => setView('register')}>
          Register
        </button>
        <button style={linkButton} onClick={() => setView('login')}>
          Login
        </button>
        {user && (
          <button style={linkButton} onClick={() => setView('dashboard')}>
            Dashboard
          </button>
        )}
        {user && (
          <button style={linkButton} onClick={logout}>
            Logout
          </button>
        )}
      </nav>
    ),
    [user]
  );

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <header style={headerStyle}>
          <div>
            <h1 style={{ margin: 0 }}>FDS Finance</h1>
            <p style={{ margin: '8px 0 0', color: '#94a3b8' }}>
              A polished demo UI for authentication, role-based access, and ledger workflow.
            </p>
          </div>
          {user && <div style={pillStyle}>Signed in as {user.username} ({user.role})</div>}
        </header>

        {nav}

        <div style={{ ...bannerStyle, ...(bannerType === 'success' ? successBannerStyle : bannerType === 'error' ? errorBannerStyle : infoBannerStyle) }}>
          {banner}
        </div>

        {view === 'landing' && (
          <section style={heroCardStyle}>
            <div>
              <h2 style={{ marginTop: 0 }}>Get started with FDS</h2>
              <p style={{ color: '#cbd5e1', lineHeight: 1.75 }}>
                Use a modern dashboard with separate registration and login views. Deposit, withdraw, and view recent transaction history interactively.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
                <button style={primaryButton} onClick={() => setView('register')}>
                  Register
                </button>
                <button style={secondaryButton} onClick={() => setView('login')}>
                  Login
                </button>
              </div>
            </div>
            <div style={featureCardStyle}>
              <h3>Build-ready UI</h3>
              <ul style={featureListStyle}>
                <li>Separate views for register/login/dashboard</li>
                <li>Feedback banners and response details</li>
                <li>Live summary + transaction cards</li>
              </ul>
            </div>
          </section>
        )}

        {view === 'register' && (
          <section style={cardStyle}>
            <h2>Create Account</h2>
            <form onSubmit={handleRegister} style={formStyle}>
              <input name="username" placeholder="Username" required style={inputStyle} />
              <input name="email" type="email" placeholder="Email" required style={inputStyle} />
              <input name="password" type="password" placeholder="Password" required style={inputStyle} />
              <select name="role" defaultValue="viewer" style={inputStyle}>
                <option value="viewer">viewer</option>
                <option value="analyst">analyst</option>
                <option value="admin">admin</option>
              </select>
              <button type="submit" style={primaryButton} disabled={loading}>
                {loading ? 'Processing...' : 'Register'}
              </button>
            </form>
          </section>
        )}

        {view === 'login' && (
          <section style={cardStyle}>
            <h2>Login</h2>
            <form onSubmit={handleLogin} style={formStyle}>
              <input name="email" type="email" placeholder="Email" required style={inputStyle} />
              <input name="password" type="password" placeholder="Password" required style={inputStyle} />
              <button type="submit" style={primaryButton} disabled={loading}>
                {loading ? 'Processing...' : 'Login'}
              </button>
            </form>
          </section>
        )}

        {view === 'dashboard' && user && (
          <section style={cardStyle}>
            <div style={dashboardHeaderStyle}>
              <div>
                <h2>Dashboard</h2>
                <p style={{ margin: 0, color: '#94a3b8' }}>
                  Current balance and the latest transactions from your ledger.
                </p>
              </div>
              <button style={secondaryButton} onClick={() => loadDashboard()} disabled={loading}>
                Refresh
              </button>
            </div>

            <div style={statsGridStyle}>
              <div style={statCardStyle}>
                <div style={statLabelStyle}>Current Balance</div>
                <div style={statValueStyle}>{balance}</div>
              </div>
              <div style={statCardStyle}>
                <div style={statLabelStyle}>Transactions</div>
                <div style={statValueStyle}>{transactions.length}</div>
              </div>
            </div>

            <div style={sectionGridStyle}>
              <div style={ledgerCardStyle}>
                <h3>Ledger Actions</h3>
                <form onSubmit={(e) => handleLedger(e, 'deposit')} style={smallFormStyle}>
                  <input name="amount" type="number" min="1" placeholder="Deposit amount" required style={inputStyle} />
                  <button type="submit" style={primaryButton} disabled={loading}>
                    Deposit
                  </button>
                </form>
                <form onSubmit={(e) => handleLedger(e, 'withdraw')} style={smallFormStyle}>
                  <input name="amount" type="number" min="1" placeholder="Withdraw amount" required style={inputStyle} />
                  <button type="submit" style={secondaryButton} disabled={loading}>
                    Withdraw
                  </button>
                </form>
              </div>

              <div style={ledgerCardStyle}>
                <h3>Recent Transactions</h3>
                {transactions.length === 0 ? (
                  <div style={{ color: '#94a3b8' }}>No transactions to show yet.</div>
                ) : (
                  <div style={transactionListStyle}>
                    {transactions.slice(0, 6).map((tx) => (
                      <div key={tx.id} style={transactionItemStyle}>
                        <div>
                          <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{tx.type}</div>
                          <div style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(tx.timestamp).toLocaleString()}</div>
                        </div>
                        <div style={{ color: tx.type === 'withdrawal' ? '#fb7185' : '#86efac' }}>{tx.amount}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {details && (
              <div style={detailsPanelStyle}>
                <h4 style={{ margin: '0 0 8px', color: '#e2e8f0' }}>Last API Response</h4>
                <pre style={detailsPreStyle}>{details}</pre>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
};

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #08112d 0%, #0b152f 100%)',
  color: '#f8fafc',
  fontFamily: 'Inter, Arial, sans-serif',
  padding: 24,
};

const shellStyle: React.CSSProperties = {
  maxWidth: 980,
  margin: '0 auto',
  display: 'grid',
  gap: 18,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 20,
  flexWrap: 'wrap',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
};

const cardStyle: React.CSSProperties = {
  background: '#111827',
  border: '1px solid #334155',
  borderRadius: 20,
  padding: 24,
};

const heroCardStyle: React.CSSProperties = {
  ...cardStyle,
  display: 'grid',
  gap: 24,
  gridTemplateColumns: '1.8fr 1fr',
};

const featureCardStyle: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 20,
  padding: 20,
};

const featureListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  color: '#cbd5e1',
};

const formStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
};

const smallFormStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  marginTop: 14,
};

const inputStyle: React.CSSProperties = {
  padding: '0.95rem 1rem',
  borderRadius: 14,
  border: '1px solid #293046',
  background: '#0f172a',
  color: '#f8fafc',
  width: '100%',
};

const primaryButton: React.CSSProperties = {
  padding: '0.95rem 1rem',
  borderRadius: 14,
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  cursor: 'pointer',
  minWidth: 120,
};

const secondaryButton: React.CSSProperties = {
  padding: '0.95rem 1rem',
  borderRadius: 14,
  border: 'none',
  background: '#475569',
  color: '#fff',
  cursor: 'pointer',
  minWidth: 120,
};

const linkButton: React.CSSProperties = {
  padding: '0.75rem 0.95rem',
  borderRadius: 12,
  border: '1px solid #475569',
  background: 'transparent',
  color: '#e2e8f0',
  cursor: 'pointer',
};

const pillStyle: React.CSSProperties = {
  background: '#1e293b',
  padding: '0.65rem 0.95rem',
  borderRadius: 999,
  color: '#cbd5e1',
};

const bannerStyle: React.CSSProperties = {
  padding: '1rem 1.1rem',
  borderRadius: 14,
  border: '1px solid transparent',
};

const successBannerStyle: React.CSSProperties = {
  background: '#052e16',
  borderColor: '#16a34a',
  color: '#dcfce7',
};

const errorBannerStyle: React.CSSProperties = {
  background: '#450a0a',
  borderColor: '#dc2626',
  color: '#fee2e2',
};

const infoBannerStyle: React.CSSProperties = {
  background: '#172554',
  borderColor: '#2563eb',
  color: '#dbeafe',
};

const featureGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
  marginTop: 16,
};

const miniCardStyle: React.CSSProperties = {
  background: '#1f2937',
  border: '1px solid #374151',
  borderRadius: 16,
  padding: 18,
};

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
  marginBottom: 18,
};

const statCardStyle: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 18,
  padding: 18,
};

const statLabelStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 12,
  marginBottom: 8,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 700,
};

const transactionListStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
};

const transactionItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#111827',
  border: '1px solid #1e293b',
  borderRadius: 16,
  padding: 16,
};

const sectionGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 14,
  gridTemplateColumns: '1fr 1fr',
};

const ledgerCardStyle: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 18,
  padding: 18,
};

const detailsPanelStyle: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 16,
  padding: 18,
  marginTop: 18,
};

const detailsPreStyle: React.CSSProperties = {
  margin: 0,
  whiteSpace: 'pre-wrap',
  color: '#e2e8f0',
};

const preStyle: React.CSSProperties = {
  background: '#020617',
  padding: 12,
  borderRadius: 12,
  whiteSpace: 'pre-wrap',
  overflowX: 'auto',
};

const dashboardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  marginBottom: 20,
};

export default App;