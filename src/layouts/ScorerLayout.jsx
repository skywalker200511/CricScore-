import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { verifyScorerPin } from '../lib/database.js';

export default function ScorerLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const isValid = await verifyScorerPin(pin);
    
    if (isValid) {
      setIsAuthenticated(true);
    } else {
      setError('Incorrect PIN. Please try again.');
      setPin('');
    }
    setLoading(false);
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh bg-[#f8f9fa] flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#e2e8f0] w-full max-w-sm">
          <h2 className="text-xl font-bold text-[#0f172a] text-center mb-6">SCORER ACCESS</h2>
          
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">
                Enter PIN
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full text-center tracking-[1em] text-2xl py-3 border-2 border-[#e2e8f0] rounded-xl focus:border-[#0f172a] focus:outline-none transition-colors"
                maxLength={4}
                autoFocus
              />
            </div>
            
            {error && (
              <p className="text-sm font-semibold text-[#dc2626] text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-full py-3 bg-[#0f172a] text-white rounded-xl font-bold hover:bg-[#1e293b] transition-colors disabled:opacity-50"
            >
              {loading ? 'VERIFYING...' : 'CONTINUE'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-3 bg-white text-[#64748b] border border-[#e2e8f0] rounded-xl font-bold hover:bg-[#f8f9fa] transition-colors mt-2"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Once authenticated, render the existing scorer routes exactly as they are
  return (
    <div className="min-h-dvh">
      <Outlet />
    </div>
  );
}
