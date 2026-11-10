import React from 'react';

function Navbar({ isLoggedIn, userEmail, userRole, onSignOut, onOpenSignIn, apiBaseUrl, title }) {
  const formatTitle = (text) => {
    if (!text) return 'Dashboard';
    return text
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-10">
      <div className="flex items-center space-x-3">
        {/* Mobile BV brand indicator or page title */}
        <div className="lg:hidden h-9 w-9 bg-indigo-600 rounded-lg flex items-center justify-center font-extrabold text-lg text-white shadow-md">
          BV
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-white capitalize">
            {formatTitle(title)}
          </h2>
          <p className="text-xs text-slate-400 hidden sm:block">
            BalanceVault &bull; High-Concurrency Financial Ledger
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3 md:space-x-4">
        {/* Swagger Docs Link */}
        <a
          href={`${apiBaseUrl}/swagger-ui.html`}
          target="_blank"
          rel="noreferrer"
          className="text-xs bg-slate-700 hover:bg-slate-600 text-indigo-300 px-3 py-1.5 rounded-md border border-slate-600 transition"
        >
          Swagger Docs
        </a>

        {/* Health API Link */}
        <a
          href={`${apiBaseUrl}/actuator/health`}
          target="_blank"
          rel="noreferrer"
          className="text-xs bg-slate-700 hover:bg-slate-600 text-emerald-400 px-3 py-1.5 rounded-md border border-slate-600 transition"
        >
          ● Health API
        </a>

        {/* Dynamic Auth Control: Sign In vs Sign Out */}
        {isLoggedIn ? (
          <div className="flex items-center space-x-2 sm:space-x-3 bg-slate-700/60 pl-3 pr-1 py-1 rounded-md border border-slate-600">
            <span className="text-xs text-slate-300 hidden md:inline">{userEmail}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
              userRole === 'ROLE_ADMIN' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'bg-blue-500/20 text-blue-300'
            }`}>
              {userRole || 'USER'}
            </span>
            <button
              onClick={onSignOut}
              className="text-xs bg-rose-600/80 hover:bg-rose-600 text-white font-medium px-3 py-1.5 rounded transition shadow-sm"
              title="Sign out of BalanceVault"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenSignIn}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-md shadow transition"
          >
            Sign In (RBAC)
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
