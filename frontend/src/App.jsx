import { useState } from 'react';
import axios from 'axios';

function App() {
  // Navigation & Tab State
  const [activeTab, setActiveTab] = useState('overview');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Transaction & Ledger State
  const [fromAccount, setFromAccount] = useState('1001');
  const [toAccount, setToAccount] = useState('1002');
  const [amount, setAmount] = useState('');
  const [customTxId, setCustomTxId] = useState('');
  const [message, setMessage] = useState('');
  const [rateLimitWarning, setRateLimitWarning] = useState('');
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);

  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem('bv_token') || '');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('bv_email') || '');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('bv_role') || '');
  const [loginEmail, setLoginEmail] = useState('admin@balancevault.com');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  // Account Request Form State
  const [requestAccountType, setRequestAccountType] = useState('commercial');
  const [requestInitialDeposit, setRequestInitialDeposit] = useState('5000');
  const [requestPurpose, setRequestPurpose] = useState('');

  // Live Backend URL (port 8085 locally on localhost / 127.0.0.1, or cloud backend)
  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname === '';

  const API_BASE_URL = isLocal
    ? 'http://localhost:8085'
    : (import.meta.env.VITE_API_BASE_URL || 'https://ledgerline-backend-i99t.onrender.com');

  const getAuthHeaders = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getInitials = (email) => {
    if (!email) return 'BV';
    const name = email.split('@')[0];
    return name.slice(0, 2).toUpperCase();
  };

  // 1. Sign In & Sign Up Handler
  const handleAuthSubmit = async (e) => {
    if (e) e.preventDefault();
    setMessage('');
    try {
      if (isSignUpMode) {
        // Sign Up Flow (POST /api/auth/register)
        await axios.post(`${API_BASE_URL}/api/auth/register`, {
          email: loginEmail,
          password: loginPassword
        });

        setMessage('✅ Account created successfully! Please sign in with your credentials.');
        setIsSignUpMode(false);
      } else {
        // Sign In Flow (POST /api/auth/login)
        const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: loginEmail,
          password: loginPassword
        });

        const { token: jwtToken, email, role } = res.data;

        localStorage.setItem('bv_token', jwtToken);
        localStorage.setItem('bv_email', email);
        localStorage.setItem('bv_role', role);

        setToken(jwtToken);
        setUserEmail(email);
        setUserRole(role);
        setMessage(`✅ Welcome back, ${email}!`);
      }
    } catch (err) {
      let errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      if (err.message === 'Network Error' || !err.response) {
        errorMsg = `Cannot connect to backend (${API_BASE_URL}). Please verify your Spring Boot backend is running on port 8085.`;
      }
      setMessage(`❌ ${isSignUpMode ? 'Sign Up' : 'Sign In'} Error (${err.response?.status || 'Network Error'}): ${errorMsg}`);
    }
  };

  // 2. Sign Out Handler
  const handleSignOut = () => {
    localStorage.removeItem('bv_token');
    localStorage.removeItem('bv_email');
    localStorage.removeItem('bv_role');

    setToken('');
    setUserEmail('');
    setUserRole('');
    setUserMenuOpen(false);
    setMessage('ℹ️ You have signed out of BalanceVault.');
  };

  // 3. Transfer Money (Idempotent & Protected)
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

  // 4. Check Balance
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

  // 5. Fetch Transaction History
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

  // 6. Account Request Placeholder Submit
  const handleAccountRequestSubmit = (e) => {
    e.preventDefault();
    setMessage(`✅ Request for "${requestAccountType.toUpperCase()}" submitted! Awaiting administrator approval.`);
    setRequestPurpose('');
  };

  // Navigation tab definitions
  const navTabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      id: 'statements',
      label: 'Statements',
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'account_request',
      label: 'Account request',
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    }
  ];

  // =========================================================================
  // VIEW 1: SPLIT-SCREEN LOGIN / SIGNUP PAGE (WHEN NOT LOGGED IN)
  // =========================================================================
  if (!token) {
    return (
      <div className="flex h-screen w-full bg-[#f8f9f6]">
        {/* Left Side: Dark Forest Green Showcase (w-1/2, hidden on mobile) */}
        <div className="hidden md:flex md:w-1/2 bg-[#0f2d20] text-white p-12 lg:p-16 flex-col justify-between select-none">
          {/* Logo Branding */}
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-sm">
              BV
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">BalanceVault</h1>
              <p className="text-xs text-emerald-300 font-medium">Financial Ledger System</p>
            </div>
          </div>

          {/* Large Hero Text */}
          <div className="max-w-md space-y-6">
            <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-semibold tracking-wider uppercase text-emerald-200">
              High-Concurrency Ledger
            </div>
            <p className="text-2xl lg:text-3xl font-light leading-snug text-white">
              &ldquo;Confidence in every transaction. A clearer view of your accounts, built on a ledger where every entry has its place.&rdquo;
            </p>
          </div>

          {/* Footer Metadata */}
          <div className="text-xs text-white/50 flex items-center justify-between border-t border-white/10 pt-6">
            <span>Spring Boot 3 &bull; PostgreSQL &bull; Redis</span>
            <span>v1.2.0</span>
          </div>
        </div>

        {/* Right Side: Clean Off-White / Solid White Auth Card (w-full md:w-1/2) */}
        <div className="w-full md:w-1/2 bg-white flex flex-col justify-center items-center p-8 sm:p-12 lg:p-16 overflow-y-auto">
          <div className="w-full max-w-md space-y-6">
            {/* Mobile Header Branding */}
            <div className="md:hidden flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 bg-[#0f2d20] rounded-xl flex items-center justify-center font-bold text-lg text-white">
                BV
              </div>
              <span className="text-xl font-bold text-[#0f2d20]">BalanceVault</span>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-[#0f2d20] tracking-tight">
                {isSignUpMode ? 'Create your vault account' : 'Sign in to your vault'}
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                {isSignUpMode
                  ? 'Sign up to manage high-volume idempotent ledger entries.'
                  : 'Enter your credentials to access your financial accounts.'}
              </p>
            </div>

            {/* Notification / Message */}
            {message && (
              <div className="p-4 rounded-xl text-xs sm:text-sm font-medium bg-[#eef3eb] text-[#0f2d20] border border-[#0f2d20]/15 flex items-center justify-between">
                <span>{message}</span>
                <button
                  onClick={() => setMessage('')}
                  className="text-gray-400 hover:text-[#0f2d20] text-xs ml-3"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 text-sm focus:border-[#0f2d20] focus:ring-1 focus:ring-[#0f2d20] outline-none transition bg-white"
                  placeholder="name@balancevault.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 text-sm focus:border-[#0f2d20] focus:ring-1 focus:ring-[#0f2d20] outline-none transition bg-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              {!isSignUpMode && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('admin@balancevault.com');
                      setLoginPassword('admin123');
                    }}
                    className="text-xs text-[#0f2d20] hover:underline font-semibold"
                  >
                    Fill Default Admin (admin@balancevault.com)
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-[#0f2d20] hover:bg-[#163e2c] text-white font-semibold rounded-xl shadow-sm transition text-sm flex items-center justify-center space-x-2"
              >
                <span>{isSignUpMode ? 'Create Account' : 'Sign in to your vault'}</span>
                <span>&rarr;</span>
              </button>

              {/* Mode Toggle Link */}
              <div className="text-center pt-2">
                {isSignUpMode ? (
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUpMode(false);
                        setMessage('');
                      }}
                      className="text-[#0f2d20] font-semibold hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    New to BalanceVault?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUpMode(true);
                        setMessage('');
                      }}
                      className="text-[#0f2d20] font-semibold hover:underline"
                    >
                      Create an account
                    </button>
                  </p>
                )}
              </div>
            </form>

            {/* Quick documentation & health links */}
            <div className="pt-6 border-t border-gray-100 flex items-center justify-center space-x-4 text-xs text-gray-400">
              <a
                href={`${API_BASE_URL}/swagger-ui.html`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#0f2d20] transition underline"
              >
                Swagger OpenAPI
              </a>
              <span>&bull;</span>
              <a
                href={`${API_BASE_URL}/actuator/health`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#0f2d20] transition underline"
              >
                Actuator Health
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: DASHBOARD LAYOUT (WHEN LOGGED IN)
  // =========================================================================
  return (
    <div className="flex h-screen bg-[#f8f9f6] text-gray-900 font-sans overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* SIDEBAR (LEFT)                                                */}
      {/* ------------------------------------------------------------- */}
      <aside className="w-64 bg-[#0f2d20] text-white flex flex-col justify-between flex-shrink-0 select-none shadow-xl z-20">
        <div>
          {/* Logo Branding */}
          <div className="p-6 border-b border-white/10 flex items-center space-x-3">
            <div className="h-10 w-10 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center font-bold text-xl text-white">
              BV
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">BalanceVault</h1>
              <p className="text-[11px] text-emerald-300 font-medium mt-1">Financial Ledger</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="p-4 space-y-1">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-[#1b4332] text-white shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Metadata */}
        <div className="p-4 border-t border-white/10 text-xs text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>Ledger Node:</span>
            <span className="text-emerald-300 font-mono">Online (8085)</span>
          </div>
          <div className="flex justify-between">
            <span>Rate Limiting:</span>
            <span className="text-white font-mono">20 req/min</span>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT (RIGHT)                                          */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto flex flex-col min-w-0 bg-[#f8f9f6]">
        {/* Top Bar (Inside Main Content with transparent background) */}
        <header className="bg-transparent px-8 py-5 flex items-center justify-between border-b border-gray-200/60 sticky top-0 z-10 backdrop-blur-sm bg-[#f8f9f6]/90">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-[#0f2d20] capitalize">
              {activeTab === 'account_request' ? 'Account Request' : activeTab}
            </h2>
            <div className="hidden sm:flex items-center space-x-2 text-xs">
              <a
                href={`${API_BASE_URL}/swagger-ui.html`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-white border border-gray-200 rounded-md text-gray-600 hover:text-[#0f2d20] hover:border-[#0f2d20] transition"
              >
                Swagger Docs
              </a>
              <a
                href={`${API_BASE_URL}/actuator/health`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-[#eef3eb] text-[#0f2d20] font-medium rounded-md hover:bg-[#e2edd9] transition"
              >
                ● Health API
              </a>
            </div>
          </div>

          {/* User Profile Indicator & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-3 focus:outline-none group p-1.5 rounded-full hover:bg-gray-200/50 transition"
              title="User Account"
            >
              <div className="h-10 w-10 rounded-full bg-[#0f2d20] text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:ring-2 group-hover:ring-[#0f2d20]/30 transition">
                {getInitials(userEmail)}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold text-gray-900 leading-tight">{userEmail}</p>
                <p className="text-[10px] text-gray-500 font-mono uppercase">{userRole || 'ROLE_USER'}</p>
              </div>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Profile Dropdown Menu */}
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-30 animate-in fade-in">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[11px] text-gray-400">Signed in as</p>
                    <p className="text-xs font-bold text-gray-900 truncate">{userEmail}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#eef3eb] text-[#0f2d20]">
                      {userRole || 'ROLE_USER'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setMessage(`Profile view for ${userEmail}`);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-[#f8f9f6] transition flex items-center space-x-2"
                  >
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setMessage('Preferences: Ledger notifications enabled');
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-[#f8f9f6] transition flex items-center space-x-2"
                  >
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setMessage('Security: Protected with JWT & Role-Based Access Control');
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-[#f8f9f6] transition flex items-center space-x-2"
                  >
                    <span>Security</span>
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 font-semibold transition flex items-center space-x-2"
                  >
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="p-8 space-y-6 max-w-6xl w-full mx-auto">
          {/* Rate Limit Warning Banner */}
          {rateLimitWarning && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-700 text-sm font-medium flex items-center justify-between">
              <span>{rateLimitWarning}</span>
            </div>
          )}

          {/* Global Message Banner */}
          {message && (
            <div className="bg-[#eef3eb] border border-[#0f2d20]/15 p-4 rounded-2xl text-sm font-medium text-[#0f2d20] flex items-center justify-between shadow-sm">
              <span>{message}</span>
              <button
                onClick={() => setMessage('')}
                className="text-gray-400 hover:text-[#0f2d20] text-xs ml-4"
              >
                ✕
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: OVERVIEW                                           */}
          {/* ========================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Greeting Banner */}
              <div className="w-full bg-[#eef3eb] text-[#0f2d20] p-6 rounded-2xl border border-[#0f2d20]/10 flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-sm">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">
                    Good to see you, {userEmail || 'Vault Holder'}
                  </h3>
                  <p className="text-xs text-[#0f2d20]/80 mt-1">
                    Confidence in every transaction. A clearer view of your accounts, built on a ledger where every entry has its place.
                  </p>
                </div>
                <button
                  onClick={() => {
                    checkBalance();
                    fetchHistory();
                  }}
                  className="self-start md:self-auto text-xs bg-[#0f2d20] hover:bg-[#163e2c] text-white px-4 py-2.5 rounded-xl font-semibold transition shadow-sm"
                >
                  Refresh Vault Data
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Section 1: Account Overview */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-[#0f2d20]">Account Overview</h3>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#eef3eb] text-[#0f2d20]">
                        Primary Vault #{fromAccount}
                      </span>
                    </div>

                    <div className="p-6 bg-[#f8f9f6] rounded-xl border border-gray-100 my-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Available Balance
                      </p>
                      <p className="text-4xl font-extrabold text-[#0f2d20] mt-2 tracking-tight">
                        {balance !== null ? `₹${balance}` : '₹--'}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Real-time ledger balance with pessimistic read isolation.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Status: <strong className="text-[#0f2d20]">Active &amp; Verified</strong>
                    </span>
                    <button
                      onClick={checkBalance}
                      className="text-[#0f2d20] hover:underline font-semibold"
                    >
                      Check Balance &rarr;
                    </button>
                  </div>
                </section>

                {/* Section 2: Quick Actions (Transfer Funds Form) */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#0f2d20]">Transfer Funds</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pessimistic concurrency locking with idempotency protection.
                    </p>
                  </div>

                  <form onSubmit={handleTransfer} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          From Account
                        </label>
                        <input
                          type="text"
                          value={fromAccount}
                          onChange={(e) => setFromAccount(e.target.value)}
                          className="w-full p-2.5 bg-[#f8f9f6] border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-[#0f2d20] focus:ring-1 focus:ring-[#0f2d20] outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          To Account
                        </label>
                        <input
                          type="text"
                          value={toAccount}
                          onChange={(e) => setToAccount(e.target.value)}
                          className="w-full p-2.5 bg-[#f8f9f6] border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-[#0f2d20] focus:ring-1 focus:ring-[#0f2d20] outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-2.5 bg-[#f8f9f6] border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-[#0f2d20] focus:ring-1 focus:ring-[#0f2d20] outline-none"
                        placeholder="Enter amount"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Custom Idempotency Key <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={customTxId}
                        onChange={(e) => setCustomTxId(e.target.value)}
                        className="w-full p-2.5 bg-[#f8f9f6] border border-gray-200 rounded-lg text-xs text-gray-900 focus:border-[#0f2d20] focus:ring-1 focus:ring-[#0f2d20] outline-none"
                        placeholder="e.g. TXN-IDEMP-1001"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-[#0f2d20] hover:bg-[#163e2c] text-white font-semibold rounded-lg text-sm shadow-sm transition"
                    >
                      Execute Transfer
                    </button>
                  </form>
                </section>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: STATEMENTS                                         */}
          {/* ========================================================= */}
          {activeTab === 'statements' && (
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-[#0f2d20]">Ledger Audit Statements</h3>
                  <p className="text-xs text-gray-500">
                    Real-time transaction history for account #{fromAccount}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={fromAccount}
                    onChange={(e) => setFromAccount(e.target.value)}
                    className="w-24 bg-[#f8f9f6] border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs text-gray-900"
                    placeholder="Account #"
                  />
                  <button
                    onClick={fetchHistory}
                    className="text-xs bg-[#0f2d20] hover:bg-[#163e2c] text-white font-semibold py-1.5 px-3 rounded-lg shadow-sm transition"
                  >
                    Refresh Statements
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No ledger records found for account #{fromAccount}. Click &ldquo;Refresh Statements&rdquo; or execute a transfer.
                  </div>
                ) : (
                  history.map((tx, index) => (
                    <div
                      key={index}
                      className="p-4 bg-[#f8f9f6] border border-gray-100 rounded-xl text-xs flex justify-between items-center hover:border-gray-300 transition"
                    >
                      <div className="space-y-1">
                        <span className="text-gray-400 font-mono text-[11px] block">
                          TXN: {tx.transactionId}
                        </span>
                        <div className="text-gray-900 font-medium">
                          From <span className="font-mono text-[#0f2d20] font-semibold">{tx.fromAccountNumber}</span> ➜ To <span className="font-mono text-[#0f2d20] font-semibold">{tx.toAccountNumber}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-bold block ${
                            tx.fromAccountNumber === fromAccount
                              ? 'text-rose-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {tx.fromAccountNumber === fromAccount ? '-' : '+'}₹{tx.amount}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Settled</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* ========================================================= */}
          {/* TAB 3: ACCOUNTS                                           */}
          {/* ========================================================= */}
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              {/* Linked Accounts */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#0f2d20] mb-4">Linked Accounts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-[#f8f9f6] rounded-xl border border-gray-200/80">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#eef3eb] text-[#0f2d20]">
                        Primary Vault
                      </span>
                      <span className="text-xs text-gray-500 font-mono">#{fromAccount}</span>
                    </div>
                    <p className="text-xs text-gray-500">Available Balance</p>
                    <p className="text-2xl font-bold text-[#0f2d20] mt-1">
                      {balance !== null ? `₹${balance}` : '₹50,000.00'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Placeholder Card */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center space-y-3">
                <div className="w-12 h-12 bg-[#eef3eb] text-[#0f2d20] rounded-full flex items-center justify-center mx-auto font-bold text-lg">
                  !
                </div>
                <h4 className="text-base font-bold text-[#0f2d20]">
                  No additional accounts available to your profile.
                </h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  You are currently operating with your primary settlement vault. To open subsidiary or escrow vaults, submit an application under Account Request.
                </p>
                <button
                  onClick={() => setActiveTab('account_request')}
                  className="mt-2 text-xs bg-[#0f2d20] hover:bg-[#163e2c] text-white font-semibold px-4 py-2 rounded-lg transition"
                >
                  Go to Account Request
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: ACCOUNT REQUEST                                    */}
          {/* ========================================================= */}
          {activeTab === 'account_request' && (
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-2xl mx-auto space-y-5">
              <div>
                <h3 className="text-lg font-bold text-[#0f2d20]">Request New Vault Account</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Submit an application for a commercial sub-account, escrow vault, or treasury reserve.
                </p>
              </div>

              <form onSubmit={handleAccountRequestSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Account Type
                  </label>
                  <select
                    value={requestAccountType}
                    onChange={(e) => setRequestAccountType(e.target.value)}
                    className="w-full bg-[#f8f9f6] border border-gray-200 p-2.5 rounded-lg text-sm text-gray-900 focus:border-[#0f2d20] focus:ring-1 focus:ring-[#0f2d20] outline-none"
                  >
                    <option value="commercial">Commercial Business Vault</option>
                    <option value="escrow">Escrow &amp; Settlement Account</option>
                    <option value="savings">High-Yield Reserve Account</option>
                    <option value="treasury">Treasury Liquidity Pool</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Initial Deposit / Allocation Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={requestInitialDeposit}
                    onChange={(e) => setRequestInitialDeposit(e.target.value)}
                    className="w-full bg-[#f8f9f6] border border-gray-200 p-2.5 rounded-lg text-sm text-gray-900 focus:border-[#0f2d20] focus:ring-1 focus:ring-[#0f2d20] outline-none"
                    placeholder="5000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Business Purpose / Justification
                  </label>
                  <textarea
                    rows="3"
                    value={requestPurpose}
                    onChange={(e) => setRequestPurpose(e.target.value)}
                    className="w-full bg-[#f8f9f6] border border-gray-200 p-2.5 rounded-lg text-sm text-gray-900 focus:border-[#0f2d20] focus:ring-1 focus:ring-[#0f2d20] outline-none"
                    placeholder="Detail the operational requirements for this sub-account..."
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-[#0f2d20] hover:bg-[#163e2c] text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition text-sm"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
