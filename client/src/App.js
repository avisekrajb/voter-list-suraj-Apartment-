import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import api from './services/api';
import * as XLSX from 'xlsx';
import './styles/App.css';

// Import components
import HomeView from './components/HomeView';
import AdminView from './components/AdminView';
import LoginModal from './components/LoginModal';
import EditModal from './components/EditModal';

// Constants
const COLUMNS = [
  { key: 'sn', label: 'क्र.सं.' },
  { key: 'name', label: 'नाम, थर' },
  { key: 'province', label: 'प्रदेश' },
  { key: 'district', label: 'जिल्ला' },
  { key: 'municipality', label: 'गाउँपालिका/नगरपालिका' },
  { key: 'ward', label: 'वडा नं.' },
  { key: 'voterNo', label: 'मतदाता नम्बर' },
  { key: 'citizenshipNo', label: 'नागरिकता नम्बर' },
  { key: 'citizenshipIssue', label: 'नागरिकता जारी भएको मिति र जिल्ला' },
  { key: 'parentName', label: 'बाबु/आमाको नाम' },
  { key: 'spouseName', label: 'पति/पत्नीको नाम' },
];

const MAX_UPLOAD_ROWS = 30;

function AppContent() {
  const { isAdmin, login, logout } = useAuth();
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('home');
  const [showLogin, setShowLogin] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [uploadMsg, setUploadMsg] = useState(null);
  const [pendingUpload, setPendingUpload] = useState([]);
  const [pendingOverflow, setPendingOverflow] = useState(false);
  const [adminTab, setAdminTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, missing: 0 });
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedVoters, setSelectedVoters] = useState([]);
  const fileInputRef = useRef(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      await fetchData();
      if (isAdmin) {
        await fetchStats();
      }
      setInitialLoading(false);
    };
    loadData();
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const response = await api.get('/voters');
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Search
  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.trim().toLowerCase();
    return records.filter(r =>
      COLUMNS.some(c => String(r[c.key] || '').toLowerCase().includes(q))
    );
  }, [search, records]);

  // Check for duplicates
  const hasDuplicate = useMemo(() => {
    return (row, field) => {
      return records.some(r => 
        r[field] && row[field] && 
        r[field].trim() === row[field].trim() && 
        r.sn !== row.sn
      );
    };
  }, [records]);

  // Check if row is missing required fields
  const isRowMissing = (row) => {
    return COLUMNS.some(c => 
      c.key !== 'sn' && 
      c.key !== 'province' && 
      c.key !== 'citizenshipIssue' && 
      c.key !== 'parentName' && 
      c.key !== 'spouseName' &&
      (!row[c.key] || String(row[c.key]).trim() === '')
    );
  };

  // Handle login
  const handleLogin = async (email, password) => {
    const result = await login(email, password);
    if (result.success) {
      setShowLogin(false);
      setView('admin');
      setAdminTab('dashboard');
      await fetchStats();
    }
    return result;
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setUploadMsg({ type: 'error', text: 'कृपया .xlsx फाइल मात्र अपलोड गर्नुहोस्।' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        let dataRows = rows;
        if (rows.length && rows[0].some(cell => 
          String(cell).includes('नाम') || String(cell).includes('जिल्ला') || String(cell).includes('क्र')
        )) {
          dataRows = rows.slice(1);
        }

        const limited = dataRows
          .slice(0, MAX_UPLOAD_ROWS)
          .filter(r => r.some(cell => String(cell).trim() !== ''));

        const maxSn = records.length > 0 ? Math.max(...records.map(r => Number(r.sn) || 0)) : 0;
        
        const mapped = limited.map((r, index) => {
          const obj = {};
          COLUMNS.forEach((c, i) => {
            obj[c.key] = r[i] !== undefined ? String(r[i]).trim() : '';
          });
          obj.sn = maxSn + index + 1;
          return obj;
        });

        const overflow = dataRows.length > MAX_UPLOAD_ROWS;
        setPendingUpload(mapped);
        setPendingOverflow(overflow);
        setUploadMsg({
          type: 'info',
          text: `${mapped.length} रेकर्ड फाइलबाट पढियो।${overflow ? ` (अधिकतम ${MAX_UPLOAD_ROWS} रेकर्ड मात्र लिइन्छ)` : ''}`
        });
      } catch (err) {
        console.error('File read error:', err);
        setUploadMsg({ type: 'error', text: 'फाइल पढ्न सकिएन। कृपया मान्य .xlsx फाइल अपलोड गर्नुहोस्।' });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  // Save uploaded records
  const handleSaveUpload = async () => {
    if (pendingUpload.length === 0) {
      setUploadMsg({ type: 'error', text: 'सुरक्षित गर्न कुनै रेकर्ड छैन।' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/voters', pendingUpload);
      
      if (response.data.invalidRecords && response.data.invalidRecords.length > 0) {
        const invalidMsg = response.data.invalidRecords.map(r => 
          `पङ्क्ति ${r.rowIndex}: ${r.issues.join(', ')}`
        ).join('; ');
        setUploadMsg({
          type: 'warning',
          text: `${response.data.saved || 0} रेकर्ड सुरक्षित भयो। ${response.data.invalidRecords.length} अमान्य रेकर्ड: ${invalidMsg}`
        });
      } else {
        setUploadMsg({ 
          type: 'success', 
          text: response.data.message || `${response.data.saved || pendingUpload.length} रेकर्ड सुरक्षित भयो।` 
        });
      }
      
      await fetchData();
      await fetchStats();
      setPendingUpload([]);
      setPendingOverflow(false);
    } catch (error) {
      console.error('Save error:', error);
      
      if (error.response?.data?.invalidRecords) {
        const invalidMsg = error.response.data.invalidRecords.map(r => 
          `पङ्क्ति ${r.rowIndex}: ${r.issues.join(', ')}`
        ).join('; ');
        setUploadMsg({ 
          type: 'error', 
          text: `${error.response.data.message || 'रेकर्ड सुरक्षित गर्न सकिएन।'} ${invalidMsg}`
        });
      } else {
        setUploadMsg({ 
          type: 'error', 
          text: error.response?.data?.error || 'रेकर्ड सुरक्षित गर्न सकिएन।' 
        });
      }
    }
    setLoading(false);
  };

  // Delete ALL records
  const handleDeleteAll = async () => {
    if (!window.confirm('⚠️ के तपाईं सबै रेकर्ड हटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन!')) return;
    if (!window.confirm(`पुन: पुष्टि: के तपाईं सबै ${records.length} रेकर्डहरू स्थायी रूपमा हटाउन चाहनुहुन्छ?`)) return;
    
    try {
      await api.delete('/voters');
      await fetchData();
      await fetchStats();
      alert('✅ सबै रेकर्डहरू सफलतापूर्वक हटाइयो।');
    } catch (error) {
      alert('❌ रेकर्ड हटाउन सकिएन।');
      console.error('Delete all error:', error);
    }
  };

  // Delete multiple selected
  const handleDeleteMultiple = async () => {
    if (selectedVoters.length === 0) {
      alert('कृपया हटाउनको लागि कम्तिमा एउटा रेकर्ड चयन गर्नुहोस्।');
      return;
    }
    
    if (!window.confirm(`के तपाईं ${selectedVoters.length} रेकर्डहरू हटाउन चाहनुहुन्छ?`)) return;
    
    try {
      await api.post('/voters/delete-multiple', { sns: selectedVoters });
      setSelectedVoters([]);
      await fetchData();
      await fetchStats();
      alert('✅ चयन गरिएका रेकर्डहरू सफलतापूर्वक हटाइयो।');
    } catch (error) {
      alert('❌ रेकर्ड हटाउन सकिएन।');
      console.error('Delete multiple error:', error);
    }
  };

  const handleDelete = async (sn) => {
    if (!window.confirm('के तपाईं यो रेकर्ड हटाउन चाहनुहुन्छ?')) return;
    try {
      await api.delete(`/voters/${sn}`);
      await fetchData();
      await fetchStats();
      setSelectedVoters(selectedVoters.filter(s => s !== sn));
    } catch (error) {
      alert('रेकर्ड हटाउन सकिएन।');
    }
  };

  const handleEditSave = async (updated) => {
    try {
      await api.put(`/voters/${updated.sn}`, updated);
      await fetchData();
      await fetchStats();
      setEditingRow(null);
    } catch (error) {
      alert('रेकर्ड सुरक्षित गर्न सकिएन।');
    }
  };

  const handleSearch = async (query) => {
    setSearch(query);
    if (query.trim()) {
      try {
        const response = await api.get(`/voters/search?q=${query}`);
        setRecords(response.data);
      } catch (error) {
        console.error('Search error:', error);
      }
    } else {
      await fetchData();
    }
  };

  if (initialLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <div className="loading-title">मतदाता विवरण प्रणाली</div>
        <div className="loading-sub">डाटा लोड हुँदैछ...</div>
      </div>
    );
  }

  return (
    <div className="app-root">
      {view === 'home' ? (
        <HomeView
          records={filtered}
          total={records.length}
          missing={records.filter(isRowMissing).length}
          isAdmin={isAdmin}
          search={search}
          setSearch={handleSearch}
          onAdminClick={() => isAdmin ? setView('admin') : setShowLogin(true)}
          onEdit={(row) => setEditingRow(row)}
          hasDuplicate={hasDuplicate}
        />
      ) : (
        <AdminView
          records={records}
          total={records.length}
          missing={records.filter(isRowMissing).length}
          stats={stats}
          adminTab={adminTab}
          setAdminTab={setAdminTab}
          onLogout={() => {
            logout();
            setView('home');
          }}
          onUpload={handleFileUpload}
          fileInputRef={fileInputRef}
          uploadMsg={uploadMsg}
          pendingUpload={pendingUpload}
          pendingOverflow={pendingOverflow}
          onSaveUpload={handleSaveUpload}
          onDiscardUpload={() => {
            setPendingUpload([]);
            setPendingOverflow(false);
            setUploadMsg(null);
          }}
          onEdit={(row) => setEditingRow(row)}
          onDelete={handleDelete}
          onDeleteAll={handleDeleteAll}
          onDeleteMultiple={handleDeleteMultiple}
          onGoHome={() => setView('home')}
          loading={loading}
          hasDuplicate={hasDuplicate}
          selectedVoters={selectedVoters}
          setSelectedVoters={setSelectedVoters}
        />
      )}

      {showLogin && (
        <LoginModal
          onSubmit={handleLogin}
          onClose={() => setShowLogin(false)}
        />
      )}

      {editingRow && isAdmin && (
        <EditModal
          row={editingRow}
          onSave={handleEditSave}
          onClose={() => setEditingRow(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}