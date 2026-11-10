import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [fromAccount, setFromAccount] = useState('1001');
  const [toAccount, setToAccount] = useState('1002');
  const [amount, setAmount] = useState('');
  const [customTxId, setCustomTxId] = useState('');
  const [message, setMessage] = useState('');
  const [rateLimitWarning, setRateLimitWarning] = useState('');
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('bv_token') || '');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('bv_email') || '');
  const [userRole, setUserRole] = useState(localStorage.getItem('bv_role') || '');
  const [loginEmail, setLoginEmail] = useState('admin@balancevault.com');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Live Backend URL (or localhost in dev)
  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080' 
    : 'https://ledgerline-backend-i99t.onrender.com';

  const getAuthHeaders = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Login handler
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: loginEmail,
        password: loginPassword
      });
      setToken(res.data.token);
      setUserEmail(res.data.email);
      setUserRole(res.data.role);
      localStorage.setItem('bv_token', res.data.token);
      localStorage.setItem('bv_email', res.data.email);
      localStorage.setItem('bv_role', res.data.role);
      setMessage(`✅ Logged in as ${res.data.email} (${res.data.role})`);
      setShowAuthModal(false);
    } catch (err) {
      setMessage(`❌ Login Error: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUserEmail('');
    setUserRole('');
    localStorage.removeItem('bv_token');
    localStorage.removeItem('bv_email');
    localStorage.removeItem('bv_role');
    setMessage('ℹ️ Logged out.');
  };

  // 1. Transfer Money (Idempotent)
  const handleTransfer = async (e) => {
    e.preventDefault();
    setMessage('Processing transfer...');
    setRateLimitWarning('');
    try {
      const payload = {
        fromAccount,
        toAccount,
        amount: parseFloat(amount)
      };
      if (customTxId.trim()) {
        payload.transactionId = customTxId.trim();
      }

      const res = await axios.post(`${API_BASE_URL}/api/transactions/transfer`, payload, {
        headers: getAuthHeaders()
      });

      setMessage(`✅ ${res.data.message}! TX: ${res.data.transaction.transactionId}`);
      setAmount('');
      checkBalance();
      fetchHistory();
    } catch (err) {
      if (err.response?.status === 429) {
        setRateLimitWarning('⚠️ Rate Limit Exceeded (429): Maximum 20 requests per minute allowed.');
      }
      setMessage(`❌ Error: ${err.response?.data?.error || err.response?.data?.message || err.message}`);
    }
  };

  // 2. Check Balance
  const checkBalance = async () => {
    setRateLimitWarning('');
    try {
      const res = await axios.get(`${API_BASE_URL}/api/accounts/${fromAccount}/balance`, {
        headers: getAuthHeaders()
      });
      setBalance(res.data.balance);
    } catch (err) {
      if (err.response?.status === 429) {
        setRateLimitWarning('⚠️ Rate Limit Exceeded (429): Maximum 20 requests per minute allowed.');
      }
      console.error(err);
    }
  };

  // 3. Fetch Transaction History
  const fetchHistory = async () => {
    setRateLimitWarning('');
    try {
      const res = await axios.get(`${API_BASE_URL}/api/transactions/${fromAccount}/history`, {
        headers: getAuthHeaders()
      });
      setHistory(res.data);
    } catch (err) {
      if (err.response?.status === 429) {
        setRateLimitWarning('⚠️ Rate Limit Exceeded (429): Maximum 20 requests per minute allowed.');
      }
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Top Navbar */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-indigo-600 rounded-lg flex items-center justify-center font-extrabold text-xl shadow-md">
            BV
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">BalanceVault</h1>
            <p className="text-xs text-indigo-400">High-Concurrency Financial Ledger</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <a
            href={`${API_BASE_URL}/swagger-ui.html`}
            target="_blank"
            rel="noreferrer"
            className="text-xs bg-slate-700 hover:bg-slate-600 text-indigo-300 px-3 py-1.5 rounded-md border border-slate-600 transition"
          >
            Swagger Docs
          </a>
          <a
            href={`${API_BASE_URL}/actuator/health`}
            target="_blank"
            rel="noreferrer"
            className="text-xs bg-slate-700 hover:bg-slate-600 text-emerald-400 px-3 py-1.5 rounded-md border border-slate-600 transition"
          >
            ● Health API
          </a>

          {userEmail ? (
            <div className="flex items-center space-x-3 bg-slate-700/60 px-3 py-1.5 rounded-md border border-slate-600">
              <span className="text-xs text-slate-300">{userEmail}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${userRole === 'ROLE_ADMIN' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300'}`}>
                {userRole}
              </span>
              <button onClick={handleLogout} className="text-xs text-rose-400 hover:text-rose-300">Logout</button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-md shadow transition"
            >
              Sign In (RBAC)
            </button>
          )}
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
        {/* Rate limit warning banner */}
        {rateLimitWarning && (
          <div className="bg-rose-500/10 border border-rose-500/50 p-4 rounded-xl text-rose-300 text-sm font-medium flex items-center justify-between animate-pulse">
            <span>{rateLimitWarning}</span>
          </div>
        )}

        {/* Global Message Banner */}
        {message && (
          <div className="bg-slate-800 border border-indigo-500/40 p-4 rounded-xl text-sm font-medium text-slate-200">
            {message}
          </div>
        )}

        {/* Auth Modal / Helper */}
        {showAuthModal && (
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Sign In with RBAC</h2>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-slate-400">
              Sign in as the default bootstrapped administrator (seeded by DatabaseSeeder):
            </p>
            <form onSubmit={handleLogin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-sm text-white"
                />
              </div>
              <div className="md:col-span-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setLoginEmail('admin@balancevault.com'); setLoginPassword('admin123'); }}
                  className="text-xs text-indigo-400 underline mr-auto"
                >
                  Fill Default Admin Credentials
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded shadow"
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Transfer Section */}
          <section className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center justify-between">
              <span>Transfer Funds</span>
              <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Pessimistic Lock & Idempotent
              </span>
            </h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400">From Account</label>
                <input
                  type="text"
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400">To Account</label>
                <input
                  type="text"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="Enter transfer amount"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Custom Idempotency Key <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={customTxId}
                  onChange={(e) => setCustomTxId(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                  placeholder="e.g. TXN-IDEMP-1001 (re-submitting will not deduct twice)"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition"
              >
                Execute Transfer
              </button>
            </form>
          </section>

          {/* Account Details & Audit Section */}
          <section className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl shadow-xl space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Account Balance</h2>
                <button
                  onClick={() => { checkBalance(); fetchHistory(); }}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-1.5 px-3 rounded-md shadow transition"
                >
                  Refresh Data
                </button>
              </div>

              {balance !== null ? (
                <div className="p-5 bg-slate-900/80 rounded-xl border border-indigo-500/20">
                  <p className="text-xs text-slate-400">Account #{fromAccount} Available Balance</p>
                  <p className="text-3xl font-extrabold text-indigo-400 mt-1">₹{balance}</p>
                </div>
              ) : (
                <div className="p-4 bg-slate-900/40 rounded-xl text-center text-xs text-slate-500">
                  Click Refresh Data to load balance
                </div>
              )}
            </div>

            {/* Audit History */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Ledger Audit History</h3>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {history.length === 0 ? (
                  <p className="text-slate-500 text-xs">No ledger records found for this account.</p>
                ) : (
                  history.map((tx, index) => (
                    <div key={index} className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-lg text-xs flex justify-between items-center">
                      <div>
                        <span className="text-slate-400 block font-mono text-[11px] truncate max-w-[180px]">
                          {tx.transactionId}
                        </span>
                        <span className="text-slate-300 text-[11px]">
                          {tx.fromAccountNumber} ➜ {tx.toAccountNumber}
                        </span>
                      </div>
                      <span className={`font-bold ${tx.fromAccountNumber === fromAccount ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {tx.fromAccountNumber === fromAccount ? '-' : '+'}₹{tx.amount}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
