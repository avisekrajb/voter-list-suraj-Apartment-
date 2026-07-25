import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StatCard from './StatCard';
import RecordsTable from './RecordsTable';

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

// Required fields that must not be empty
const REQUIRED_FIELDS = ['name', 'district', 'municipality', 'ward', 'voterNo', 'citizenshipNo'];

export default function HomeView({ 
  records, 
  total, 
  missing, 
  isAdmin, 
  search, 
  setSearch, 
  onAdminClick, 
  onEdit,
  hasDuplicate 
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [marqueeIndex, setMarqueeIndex] = useState(0);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Marquee messages - moved to useMemo to prevent re-creation
  const marqueeMessages = useMemo(() => [
    "🎉 नयाँ पार्टीको घोषणा हुँदैछ - धवल शमशेर र दुर्गा प्रसाईंको नेतृत्वमा!",
    "🇳🇵 राष्ट्रिय एकता र समृद्धिको लागि नयाँ अभियान - धवल शमशेर",
    "🌟 दुर्गा प्रसाईंको नेतृत्वमा नेपालको भविष्य उज्ज्वल",
    "🗳️ आगामी निर्वाचनमा परिवर्तनको खबर - धवल शमशेर र दुर्गा प्रसाईं",
    "🔥 नयाँ पार्टीको पूर्वसन्ध्यामा देशभर जनताको उत्साह"
  ], []);

  // Timer for clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Timer for marquee
  useEffect(() => {
    const interval = setInterval(() => {
      setMarqueeIndex((prev) => (prev + 1) % marqueeMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [marqueeMessages.length]);

  // ===== MISSING DATA ANALYSIS - COMPLETE =====
  const missingData = useMemo(() => {
    const analysis = {};
    const missingRecords = [];
    
    // Initialize analysis for each column
    COLUMNS.forEach(col => {
      if (col.key !== 'sn') {
        analysis[col.key] = {
          label: col.label,
          count: 0,
          records: []
        };
      }
    });

    // Analyze each record - COMPLETE without truncation
    records.forEach(record => {
      let hasMissing = false;
      const recordMissingFields = [];
      const missingFieldDetails = [];
      
      COLUMNS.forEach(col => {
        if (col.key !== 'sn') {
          const value = record[col.key];
          const isEmpty = !value || String(value).trim() === '';
          if (isEmpty) {
            analysis[col.key].count++;
            analysis[col.key].records.push({
              sn: record.sn,
              name: record.name || 'N/A'
            });
            hasMissing = true;
            recordMissingFields.push(col.label);
            missingFieldDetails.push({
              field: col.label,
              key: col.key
            });
          }
        }
      });
      
      if (hasMissing) {
        missingRecords.push({
          sn: record.sn,
          name: record.name || 'N/A',
          missingFields: recordMissingFields,
          missingFieldDetails: missingFieldDetails,
          // Full record data for complete view
          fullRecord: { ...record }
        });
      }
    });

    let totalMissingCells = 0;
    Object.values(analysis).forEach(item => {
      totalMissingCells += item.count;
    });

    return {
      analysis,
      missingRecords,
      totalMissingCells,
      totalMissingRecords: missingRecords.length
    };
  }, [records]);

  // ===== DUPLICATE DETECTION =====
  const duplicates = useMemo(() => {
    const result = {
      voterNo: [],
      citizenshipNo: []
    };

    // Check duplicate voterNo
    const voterNoMap = {};
    records.forEach(record => {
      if (record.voterNo && record.voterNo.trim() !== '') {
        const key = record.voterNo.trim();
        if (!voterNoMap[key]) {
          voterNoMap[key] = [];
        }
        voterNoMap[key].push({
          sn: record.sn,
          name: record.name || 'N/A',
          voterNo: record.voterNo
        });
      }
    });
    Object.values(voterNoMap).forEach(group => {
      if (group.length > 1) {
        result.voterNo.push(group);
      }
    });

    // Check duplicate citizenshipNo
    const citizenshipNoMap = {};
    records.forEach(record => {
      if (record.citizenshipNo && record.citizenshipNo.trim() !== '') {
        const key = record.citizenshipNo.trim();
        if (!citizenshipNoMap[key]) {
          citizenshipNoMap[key] = [];
        }
        citizenshipNoMap[key].push({
          sn: record.sn,
          name: record.name || 'N/A',
          citizenshipNo: record.citizenshipNo
        });
      }
    });
    Object.values(citizenshipNoMap).forEach(group => {
      if (group.length > 1) {
        result.citizenshipNo.push(group);
      }
    });

    return result;
  }, [records]);

  const totalDuplicates = duplicates.voterNo.length + duplicates.citizenshipNo.length;

  // ===== EXPORT TO CSV =====
  const exportToCSV = useCallback(async () => {
    setExportLoading(true);
    try {
      const headers = COLUMNS.map(col => col.label);
      const rows = records.map(record => {
        return COLUMNS.map(col => {
          let value = record[col.key] || '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `voter_data_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('डाटा निर्यात गर्न सकिएन। कृपया पुनः प्रयास गर्नुहोस्।');
    }
    setExportLoading(false);
  }, [records]);

  // ===== MISSING DATA MODAL COMPONENT - SHOW ALL =====
  const MissingDataModal = useCallback(() => {
    const data = missingData;
    
    return (
      <div className="modal-overlay" onClick={() => setShowMissingModal(false)}>
        <div className="modal missing-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowMissingModal(false)}>×</button>
          <h3>📊 अपूर्ण डाटा विश्लेषण</h3>
          <p className="modal-sub">
            कुल {data.totalMissingRecords} रेकर्डमा {data.totalMissingCells} सेलहरू खाली छन्
          </p>
          
          {/* Category-wise Missing Summary */}
          <div className="missing-summary">
            <h4>📋 श्रेणी अनुसार खाली सेलहरू</h4>
            {Object.entries(data.analysis).map(([key, value]) => (
              <div key={key} className="missing-item">
                <span className="missing-label">{value.label}</span>
                <span className="missing-count">{value.count}</span>
                <div className="missing-bar">
                  <div 
                    className="missing-bar-fill" 
                    style={{ 
                      width: `${records.length > 0 ? (value.count / records.length) * 100 : 0}%`,
                      background: value.count > 0 ? '#FF6B35' : '#E7F6ED'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Complete List of Missing Records - NO TRUNCATION */}
          <div className="missing-records">
            <h4>📝 खाली भएका रेकर्डहरू (सबै)</h4>
            {data.missingRecords.length === 0 ? (
              <p className="no-missing">✅ सबै रेकर्ड पूर्ण छन्!</p>
            ) : (
              <div className="missing-records-list full-list">
                <table className="missing-table">
                  <thead>
                    <tr>
                      <th>क्र.सं.</th>
                      <th>नाम, थर</th>
                      <th>खाली भएका क्षेत्रहरू</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.missingRecords.map((record, index) => (
                      <tr key={index} className="missing-record-row">
                        <td className="missing-sn">{record.sn}</td>
                        <td className="missing-name">{record.name}</td>
                        <td className="missing-fields-list">
                          {record.missingFields.map((field, idx) => (
                            <span key={idx} className="missing-field-tag">
                              {field}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="missing-total">
                  <span>📊 कुल {data.missingRecords.length} रेकर्डहरूमा खाली सेलहरू छन्</span>
                </div>
              </div>
            )}
          </div>

          {/* Show complete record details for each missing record */}
          {data.missingRecords.length > 0 && (
            <div className="missing-details">
              <h4>🔍 पूर्ण विवरण</h4>
              <div className="missing-details-list">
                {data.missingRecords.map((record, index) => (
                  <details key={index} className="missing-detail-item">
                    <summary>
                      <span className="detail-sn">क्र.सं. {record.sn}</span>
                      <span className="detail-name">{record.name}</span>
                      <span className="detail-missing-count">
                        {record.missingFields.length} क्षेत्र खाली
                      </span>
                    </summary>
                    <div className="detail-content">
                      <table className="detail-table">
                        <thead>
                          <tr>
                            {COLUMNS.map(col => (
                              <th key={col.key}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {COLUMNS.map(col => {
                              const value = record.fullRecord[col.key];
                              const isEmpty = !value || String(value).trim() === '';
                              return (
                                <td key={col.key} className={isEmpty ? 'empty-cell' : ''}>
                                  {isEmpty ? '—' : value}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                      <div className="missing-fields-highlight">
                        <strong>खाली क्षेत्रहरू:</strong>
                        {record.missingFields.map((field, idx) => (
                          <span key={idx} className="highlight-tag">⚠️ {field}</span>
                        ))}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [missingData, records.length]);

  // ===== DUPLICATE MODAL COMPONENT =====
  const DuplicateModal = useCallback(() => {
    const dupData = duplicates;
    const totalDup = dupData.voterNo.length + dupData.citizenshipNo.length;
    
    return (
      <div className="modal-overlay" onClick={() => setShowDuplicateModal(false)}>
        <div className="modal duplicate-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowDuplicateModal(false)}>×</button>
          <h3>🔄 डुप्लिकेट डाटा विश्लेषण</h3>
          <p className="modal-sub">
            {totalDup} डुप्लिकेट समूह फेला पर्यो
          </p>
          
          {dupData.voterNo.length > 0 && (
            <div className="duplicate-group">
              <h4>🔴 मतदाता नम्बर डुप्लिकेट</h4>
              {dupData.voterNo.map((group, idx) => (
                <div key={idx} className="duplicate-item">
                  <span className="duplicate-value">{group[0].voterNo}</span>
                  <span className="duplicate-count">{group.length} पटक</span>
                  <div className="duplicate-records">
                    {group.map((record, ridx) => (
                      <span key={ridx} className="duplicate-record">
                        क्र.सं. {record.sn} - {record.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {dupData.citizenshipNo.length > 0 && (
            <div className="duplicate-group">
              <h4>🔴 नागरिकता नम्बर डुप्लिकेट</h4>
              {dupData.citizenshipNo.map((group, idx) => (
                <div key={idx} className="duplicate-item">
                  <span className="duplicate-value">{group[0].citizenshipNo}</span>
                  <span className="duplicate-count">{group.length} पटक</span>
                  <div className="duplicate-records">
                    {group.map((record, ridx) => (
                      <span key={ridx} className="duplicate-record">
                        क्र.सं. {record.sn} - {record.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {totalDup === 0 && (
            <div className="no-duplicates">
              <span className="no-duplicates-icon">✅</span>
              <p>कुनै डुप्लिकेट डाटा फेला परेन!</p>
            </div>
          )}
        </div>
      </div>
    );
  }, [duplicates]);

  const formatDate = useCallback((date) => {
    return date.toLocaleDateString('ne-NP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }, []);

  const formatTime = useCallback((date) => {
    return date.toLocaleTimeString('ne-NP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  return (
    <div className="page">
      {/* Modern Header */}
      <header className="navbar modern-navbar">
        <div className="brand">
          <div className="brand-mark modern-brand-mark">
            <span className="brand-icon">🗳️</span>
          </div>
          <div className="brand-text">
            <span className="brand-title">मतदाता विवरण प्रणाली</span>
            <span className="brand-sub">🇳🇵 नेपाल सरकार • निर्वाचन आयोग</span>
          </div>
        </div>
        
        <div className="datetime-display">
          <div className="date-display">
            <span className="date-icon">📅</span>
            <span>{formatDate(currentTime)}</span>
          </div>
          <div className="time-display">
            <span className="time-icon">🕐</span>
            <span>{formatTime(currentTime)}</span>
          </div>
        </div>

        <nav className="nav-links">
          <span className="nav-link active">🏠 Home</span>
          <span className="nav-link">📊 Statistics</span>
          <span className="nav-link">📰 News</span>
        </nav>
        <button className="btn btn-outline modern-btn" onClick={onAdminClick}>
          {isAdmin ? '🔐 Admin Dashboard →' : '🔑 Admin Login'}
        </button>
      </header>

      {/* Marquee Section */}
      <div className="marquee-container">
        <div className="marquee-wrapper">
          <div className="marquee-content">
            <span className="marquee-icon">🔥</span>
            <span className="marquee-text">
              {marqueeMessages[marqueeIndex]}
            </span>
            <span className="marquee-pulse"></span>
          </div>
        </div>
        <div className="marquee-progress">
          <div className="marquee-progress-bar"></div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">✨ नयाँ घोषणा</div>
          <h1 className="hero-title">
            नयाँ पार्टीको घोषणा
            <span className="hero-highlight"> धवल शमशेर </span>
            <span className="hero-and">&</span>
            <span className="hero-highlight"> दुर्गा प्रसाईं </span>
          </h1>
          <p className="hero-subtitle">
            राष्ट्रिय एकता, सुशासन र समृद्धिको लागि नयाँ अभियानको सुरुवात
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-number">2083</span>
              <span className="hero-stat-label">साल</span>
            </div>
            <div className="hero-stat-divider">|</div>
            <div className="hero-stat">
              <span className="hero-stat-number">नेपाल</span>
              <span className="hero-stat-label">राष्ट्रिय</span>
            </div>
            <div className="hero-stat-divider">|</div>
            <div className="hero-stat">
              <span className="hero-stat-number">🚀</span>
              <span className="hero-stat-label">नयाँ शुरुवात</span>
            </div>
          </div>
        </div>
        <div className="hero-decoration">
          <div className="hero-circle circle1"></div>
          <div className="hero-circle circle2"></div>
          <div className="hero-circle circle3"></div>
        </div>
      </section>

      <main className="container modern-container">
        {/* Stats with Enhanced Cards */}
        <section className="stats-row modern-stats">
          <StatCard label="कुल रेकर्ड" value={total} tone="navy" icon="▦" />
          <StatCard 
            label="अपूर्ण रेकर्ड" 
            value={missing} 
            tone="warning" 
            icon="!" 
            onClick={() => setShowMissingModal(true)}
          />
          <StatCard
            label="डुप्लिकेट"
            value={totalDuplicates}
            tone={totalDuplicates > 0 ? "warning" : "success"}
            icon={totalDuplicates > 0 ? "⚠️" : "✓"}
            onClick={() => setShowDuplicateModal(true)}
          />
          <StatCard 
            label="सम्पादन अनुमति" 
            value={isAdmin ? 'अनलक' : 'लक'} 
            tone={isAdmin ? 'success' : 'muted'} 
            icon={isAdmin ? '✓' : '🔒'} 
            small 
          />
        </section>

        {/* Search and Action Bar */}
        <section className="search-section modern-search">
          <div className="search-actions">
            <div className="search-box modern-search-box">
              <div className="search-icon-wrapper">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="🔍 नाम, जिल्ला, मतदाता नम्बर, वडा... खोज्नुहोस्"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="modern-input"
              />
              {search && (
                <button className="clear-search" onClick={() => setSearch('')}>
                  ✕
                </button>
              )}
              <div className="search-shortcut">⌘K</div>
            </div>
            
            <div className="action-buttons">
              <button className="btn action-btn export-btn" onClick={exportToCSV} disabled={exportLoading}>
                {exportLoading ? '⏳' : '📥'} निर्यात गर्नुहोस्
              </button>
              <button className="btn action-btn missing-btn" onClick={() => setShowMissingModal(true)}>
                📊 अपूर्ण हेर्नुहोस्
              </button>
              <button className="btn action-btn duplicate-btn" onClick={() => setShowDuplicateModal(true)}>
                🔄 डुप्लिकेट हेर्नुहोस्
              </button>
            </div>
          </div>
          
          <div className="search-tags">
            <span className="search-tag">#मतदाता</span>
            <span className="search-tag">#निर्वाचन</span>
            <span className="search-tag">#नेपाल</span>
            <span className="search-tag">#अभिलेख</span>
            <span className="search-tag" onClick={() => setShowMissingModal(true)}>
              ⚠️ {missingData.totalMissingRecords} अपूर्ण
            </span>
            {totalDuplicates > 0 && (
              <span className="search-tag duplicate-tag" onClick={() => setShowDuplicateModal(true)}>
                🔄 {totalDuplicates} डुप्लिकेट
              </span>
            )}
          </div>
        </section>

        {/* Table Section */}
        <section className="table-section modern-table-section">
          <div className="table-header-row modern-table-header">
            <div className="table-header-left">
              <h2>📋 सम्पूर्ण विवरण</h2>
              <div className="table-badge">
                <span className="badge-dot"></span>
                {records.length} नतिजा फेला पर्यो
              </div>
            </div>
            <div className="table-header-right">
              <button className="btn-icon" title="Refresh" onClick={() => window.location.reload()}>
                🔄
              </button>
              <button className="btn-icon" title="Export CSV" onClick={exportToCSV}>
                📥
              </button>
              <button className="btn-icon" title="Print" onClick={() => window.print()}>
                🖨️
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <RecordsTable 
              records={records} 
              isAdmin={isAdmin} 
              onEdit={onEdit} 
              columns={COLUMNS}
              hasDuplicate={hasDuplicate}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="modern-footer">
          <div className="footer-content">
            <div className="footer-left">
              <span className="footer-brand">🗳️ मतदाता विवरण प्रणाली</span>
              <span className="footer-divider">|</span>
              <span>© २०८१ सबै अधिकार सुरक्षित</span>
            </div>
            <div className="footer-center">
              <span>🇳🇵 नेपाल सरकार</span>
              <span className="footer-divider">|</span>
              <span>निर्वाचन आयोग</span>
            </div>
            <div className="footer-right">
              <span className="footer-status">
                <span className="status-dot"></span>
                सर्भर सक्रिय
              </span>
              <span className="footer-version">v2.0.1</span>
            </div>
          </div>
        </footer>
      </main>

      {/* Modals - Only render when needed */}
      {showMissingModal && <MissingDataModal />}
      {showDuplicateModal && <DuplicateModal />}
    </div>
  );
}