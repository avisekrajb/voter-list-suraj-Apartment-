import React, { useState } from 'react';

export default function LoginModal({ onSubmit, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await onSubmit(email, password);
    setLoading(false);
    
    if (!result.success) {
      setError(result.error || 'इमेल वा पासवर्ड मिलेन। पुनः प्रयास गर्नुहोस्।');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal login-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-stamp">प्र</div>
        <h3>Admin Login</h3>
        <p className="modal-sub">डाटा व्यवस्थापन गर्न लगइन गर्नुहोस्</p>
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="a@gmail.com"
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {error && <div className="form-error">{error}</div>}
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'लगइन गर्दै...' : 'लगइन गर्नुहोस्'}
          </button>
        </form>
      </div>
    </div>
  );
}