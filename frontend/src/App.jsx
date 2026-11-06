import { useState } from 'react';
import axios from 'axios';

function App() {
  const [fromAccount, setFromAccount] = useState('1001');
  const [toAccount, setToAccount] = useState('1002');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);

  // Live Backend URL (Render)
  const API_BASE_URL = 'https://ledgerline-backend-i99t.onrender.com';

  // 1. Transfer Money
  const handleTransfer = async (e) => {
    e.preventDefault();
    setMessage('Processing...');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/transactions/transfer`, {
        fromAccount,
        toAccount,
        amount: parseFloat(amount)
      });
      setMessage(`✅ ${res.data.message}! TX: ${res.data.transaction.transactionId}`);
      setAmount(''); // Reset amount field
      checkBalance(); // Update balance automatically
      fetchHistory(); // Update history automatically
    } catch (err) {
      setMessage(`❌ Error: ${err.response?.data?.error || err.message}`);
    }
  };

  // 2. Check Balance
  const checkBalance = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/accounts/${fromAccount}/balance`);
      setBalance(res.data.balance);
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Fetch Transaction History
  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/transactions/${fromAccount}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-extrabold text-blue-600 text-center mb-8">LedgerLine Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Transfer Section */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-700">Transfer Funds</h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">From Account</label>
                <input type="text" value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} className="w-full mt-1 p-2 border rounded-md" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">To Account</label>
                <input type="text" value={toAccount} onChange={(e) => setToAccount(e.target.value)} className="w-full mt-1 p-2 border rounded-md" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Amount (₹)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="Enter amount" required />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition">
                Send Money
              </button>
            </form>
            {message && <p className="mt-4 p-3 bg-gray-100 rounded-md text-sm font-semibold">{message}</p>}
          </div>

          {/* Account Details Section */}
          <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-700">Account Details</h2>
              <button onClick={() => { checkBalance(); fetchHistory(); }} className="bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 transition mb-4">
                Fetch Balance & History
              </button>
              {balance !== null && (
                <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                  <p className="text-sm text-gray-600">Current Balance</p>
                  <p className="text-3xl font-bold text-blue-700">₹{balance}</p>
                </div>
              )}
            </div>

            {/* History Section */}
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">Recent Transactions</h3>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {history.length === 0 ? <p className="text-gray-500 text-sm">No transactions found.</p> :
                  history.map((tx, index) => (
                    <div key={index} className="p-3 bg-gray-50 border rounded-md text-sm flex justify-between">
                      <span>To: {tx.toAccountNumber}</span>
                      <span className="font-bold text-red-500">-₹{tx.amount}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;