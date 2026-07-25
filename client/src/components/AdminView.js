import React, { useState, useRef } from 'react';
import api from '../services/api';
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

export default function AdminView({
  records,
  total,
  missing,
  stats,
  adminTab,
  setAdminTab,
  onLogout,
  onUpload,
  fileInputRef,
  uploadMsg,
  pendingUpload,
  pendingOverflow,
  onSaveUpload,
  onDiscardUpload,
  onEdit,
  onDelete,
  onDeleteAll,
  onDeleteMultiple,
  onGoHome,
  loading,
  hasDuplicate,
  selectedVoters,
  setSelectedVoters
}) {
  const [viewMode, setViewMode] = useState('all');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [expandedFile, setExpandedFile] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState(null);
  const folderInputRef = useRef(null);

  const tabs = [
    { key: 'dashboard', label: 'ड्यासबोर्ड', icon: '▦' },
    { key: 'upload', label: 'डाटा अपलोड', icon: '⭱' },
    { key: 'records', label: 'रेकर्डहरू', icon: '☰' },
    { key: 'users', label: 'प्रयोगकर्ता', icon: '◎' },
  ];

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

  // Load file-wise data
  const loadFileWiseData = async () => {
    setLoadingFiles(true);
    setFileError(null);
    try {
      console.log('Fetching file-wise data...');
      const token = localStorage.getItem('adminToken');
      console.log('Token exists:', !!token);
      
      const response = await api.get('/voters/file-wise');
      console.log('File-wise response:', response.data);
      
      setFileList(response.data.files || []);
      setShowFileModal(true);
      
      if (response.data.files && response.data.files.length === 0) {
        setFileError('कुनै फाइल डाटा छैन। कृपया पहिले फोल्डर अपलोड गर्नुहोस्।');
      }
    } catch (error) {
      console.error('Error loading file-wise data:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMsg = 'फाइल डाटा लोड गर्न सकिएन। कृपया पुनः प्रयास गर्नुहोस्।';
      if (error.response?.status === 401) {
        errorMsg = 'लगइन सत्र समाप्त भयो। कृपया पुनः लगइन गर्नुहोस्।';
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      setFileError(errorMsg);
      alert(errorMsg);
    }
    setLoadingFiles(false);
  };

  const handleFolderUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const excelFiles = Array.from(files).filter(f => 
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );

    if (excelFiles.length === 0) {
      alert('❌ कुनै .xlsx फाइल फेला परेन। कृपया मान्य Excel फाइलहरू भएको फोल्डर चयन गर्नुहोस्।');
      return;
    }

    if (excelFiles.length !== files.length) {
      alert(`⚠️ ${files.length - excelFiles.length} गैर-Excel फाइलहरू स्किप गरियो।`);
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const oversizedFiles = excelFiles.filter(f => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`❌ ${oversizedFiles.length} फाइल(हरू) धेरै ठूलो छन्। अधिकतम 10MB।`);
      return;
    }

    const totalSize = excelFiles.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 50 * 1024 * 1024) {
      alert('❌ कुल फाइल साइज धेरै ठूलो छ। अधिकतम 50MB।');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const fileList = [];
    const totalFiles = excelFiles.length;
    let processedFiles = 0;

    for (const file of excelFiles) {
      try {
        const reader = new FileReader();
        const fileData = await new Promise((resolve, reject) => {
          reader.onload = (evt) => {
            const base64Content = evt.target.result.split(',')[1];
            resolve({
              fileName: file.name,
              content: base64Content
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        fileList.push(fileData);
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
      }
      processedFiles++;
      setUploadProgress(Math.round((processedFiles / totalFiles) * 100));
    }

    if (fileList.length === 0) {
      alert('❌ फाइलहरू पढ्न सकिएन। कृपया पुनः प्रयास गर्नुहोस्।');
      setIsUploading(false);
      return;
    }

    try {
      const response = await api.post('/voters/upload-folder', { files: fileList }, {
        timeout: 300000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      let message = `✅ ${response.data.saved} रेकर्ड सुरक्षित भयो!`;
      if (response.data.totalInvalid > 0) {
        message += `\n⚠️ ${response.data.totalInvalid} रेकर्ड अमान्य थिए।`;
      }
      if (response.data.skippedFiles > 0) {
        message += `\n📁 ${response.data.skippedFiles} गैर-Excel फाइलहरू स्किप गरियो।`;
      }
      alert(message);
      
      window.location.reload();
      
    } catch (error) {
      console.error('Upload error:', error);
      
      if (error.response?.status === 413) {
        alert('❌ फाइल धेरै ठूलो छ। कृपया सानो फाइल वा कम फाइलहरू अपलोड गर्नुहोस्।');
      } else {
        alert('❌ फोल्डर अपलोड गर्न सकिएन। कृपया पुनः प्रयास गर्नुहोस्।');
      }
    }
    
    setIsUploading(false);
    setUploadProgress(0);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const toggleSelectAll = () => {
    if (selectedVoters.length === records.length) {
      setSelectedVoters([]);
    } else {
      setSelectedVoters(records.map(r => r.sn));
    }
  };

  const toggleSelect = (sn) => {
    if (selectedVoters.includes(sn)) {
      setSelectedVoters(selectedVoters.filter(s => s !== sn));
    } else {
      setSelectedVoters([...selectedVoters, sn]);
    }
  };

  const toggleFileExpand = (fileName) => {
    if (expandedFile === fileName) {
      setExpandedFile(null);
    } else {
      setExpandedFile(fileName);
    }
  };

  const renderTabContent = () => {
    switch(adminTab) {
      case 'dashboard':
        return (
          <div>
            <section className="stats-row">
              <StatCard label="कुल रेकर्ड" value={stats.total || total} tone="navy" icon="▦" />
              <StatCard label="अपूर्ण रेकर्ड" value={stats.missing || missing} tone="warning" icon="!" />
              <StatCard label="सम्पादन अनुमति" value="अनलक" tone="success" small icon="✓" />
            </section>

            <div className="table-header-row">
              <h2>हालैका रेकर्डहरू</h2>
              <span className="table-count">{Math.min(records.length, 50)} रेकर्ड</span>
            </div>
            <RecordsTable 
              records={records.slice(0, 50)} 
              isAdmin 
              onEdit={onEdit} 
              onDelete={onDelete}
              columns={COLUMNS}
              hasDuplicate={hasDuplicate}
            />
          </div>
        );
      
      case 'upload':
        return (
          <div>
            <div className="admin-card upload-card">
              <h3>📁 फोल्डर अपलोड गर्नुहोस्</h3>
              <p style={{ marginBottom: '12px', color: '#6B7684' }}>
                सबै .xlsx फाइलहरू एकैपटक अपलोड गर्न फोल्डर चयन गर्नुहोस्।
                <br />
                <span style={{ fontSize: '12px', color: '#A9182F' }}>
                  ⚠️ केवल .xlsx फाइलहरू मात्र अपलोड गरिनेछ
                </span>
              </p>
              
              <div 
                className={`upload-zone ${isUploading ? 'uploading' : ''}`} 
                onClick={() => !isUploading && folderInputRef.current && folderInputRef.current.click()}
                style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}
              >
                <div className="upload-icon">{isUploading ? '⏳' : '📂'}</div>
                <p><strong>{isUploading ? 'अपलोड हुँदैछ...' : 'फोल्डर छान्नुहोस्'}</strong></p>
                <span>सबै .xlsx फाइलहरू स्वचालित रूपमा पढिनेछ</span>
                <span style={{ display: 'block', fontSize: '12px', color: '#6B7684' }}>
                  (अन्य फाइलहरू स्वचालित रूपमा स्किप गरिनेछ)
                </span>
                
                {isUploading && (
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${uploadProgress}%` }}>
                      <span className="progress-text">{uploadProgress}%</span>
                    </div>
                  </div>
                )}
              </div>
              
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory="true"
                directory="true"
                multiple
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFolderUpload}
                disabled={isUploading}
              />
              
              {uploadMsg && (
                <div className={`upload-msg upload-msg-${uploadMsg.type}`}>
                  {uploadMsg.text}
                </div>
              )}
              
              <div className="upload-hint">
                <strong>📋 अपेक्षित फाइल संरचना:</strong>
                <ol>
                  {COLUMNS.map(c => (
                    <li key={c.key}>
                      {c.label} 
                      {['name', 'district', 'municipality', 'ward', 'voterNo', 'citizenshipNo'].includes(c.key) 
                        ? ' *' 
                        : ''}
                    </li>
                  ))}
                </ol>
                <span style={{ fontSize: '12px', color: '#6B7684', marginTop: '8px', display: 'block' }}>
                  * आवश्यक क्षेत्रहरू
                </span>
              </div>
            </div>

            {pendingUpload && pendingUpload.length > 0 && (
              <div className="admin-card">
                <div className="table-header-row">
                  <h3 style={{ margin: 0 }}>पूर्वावलोकन — सुरक्षित गर्न बाँकी</h3>
                  <span className="table-count">{pendingUpload.length} रेकर्ड तयार</span>
                </div>
                <div className="table-wrap admin-table-wrap" style={{ marginTop: 10 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        {COLUMNS.map(c => (
                          <th key={c.key}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUpload.map((row, i) => (
                        <tr key={i} className={isRowMissing(row) ? 'row-missing' : ''}>
                          {COLUMNS.map(c => (
                            <td key={c.key}>
                              {row[c.key] ? row[c.key] : <span className="cell-empty">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-outline" onClick={onDiscardUpload}>
                    रद्द गर्नुहोस्
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={onSaveUpload}
                    disabled={loading}
                  >
                    {loading ? 'सुरक्षित गर्दै...' : `सुरक्षित गर्नुहोस् (${pendingUpload.length})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'records':
        return (
          <div>
            <div className="table-header-row">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>सबै रेकर्ड</h2>
                <div className="view-toggle">
                  <button 
                    className={`view-btn ${viewMode === 'all' ? 'active' : ''}`}
                    onClick={() => setViewMode('all')}
                  >
                    सबै हेर्नुहोस्
                  </button>
                  <button 
                    className={`view-btn ${viewMode === 'file' ? 'active' : ''}`}
                    onClick={() => {
                      setViewMode('file');
                      loadFileWiseData();
                    }}
                  >
                    फाइल अनुसार
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="table-count">{records.length} रेकर्ड</span>
                {records.length > 0 && (
                  <>
                    <button 
                      className="btn btn-danger" 
                      onClick={onDeleteAll}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      🗑️ सबै हटाउनुहोस्
                    </button>
                    {selectedVoters.length > 0 && (
                      <button 
                        className="btn btn-danger" 
                        onClick={onDeleteMultiple}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        🗑️ {selectedVoters.length} हटाउनुहोस्
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {viewMode === 'all' ? (
              <>
                {records.length > 0 && (
                  <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button 
                      className="btn btn-outline" 
                      onClick={toggleSelectAll}
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                    >
                      {selectedVoters.length === records.length ? 'सबै अचयन गर्नुहोस्' : 'सबै चयन गर्नुहोस्'}
                    </button>
                    <span style={{ fontSize: '13px', color: '#6B7684' }}>
                      {selectedVoters.length} चयन गरियो
                    </span>
                  </div>
                )}
                <RecordsTable 
                  records={records} 
                  isAdmin 
                  onEdit={onEdit} 
                  onDelete={onDelete}
                  columns={COLUMNS}
                  hasDuplicate={hasDuplicate}
                  selectedVoters={selectedVoters}
                  onSelectVoter={toggleSelect}
                />
              </>
            ) : (
              <div className="file-wise-view">
                <div className="admin-card">
                  <p>📂 फाइल अनुसार डाटा हेर्नको लागि "फाइल अनुसार" बटन थिच्नुहोस्।</p>
                  <p style={{ fontSize: '13px', color: '#6B7684' }}>
                    प्रत्येक फाइलको डाटा छुट्टाछुट्टै देखाइनेछ।
                  </p>
                  <button 
                    className="btn btn-primary" 
                    onClick={loadFileWiseData}
                    style={{ marginTop: '12px' }}
                    disabled={loadingFiles}
                  >
                    {loadingFiles ? 'लोड हुँदैछ...' : '📂 फाइलहरू हेर्नुहोस्'}
                  </button>
                  {fileError && (
                    <p style={{ color: '#A9182F', marginTop: '8px', fontSize: '13px' }}>
                      ⚠️ {fileError}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      
      case 'users':
        return (
          <div>
            <div className="admin-card user-card">
              <div className="user-avatar">A</div>
              <div>
                <h3>Admin</h3>
                <p>a@gmail.com</p>
                <span className="badge badge-success">पूर्ण पहुँच (Full Access)</span>
              </div>
            </div>
            <div className="admin-card">
              <p className="muted-note">
                हाल एउटा मात्र प्रशासक खाता सक्रिय छ। 
                थप प्रशासक खाताहरू भविष्यमा यहाँबाट थप्न सकिनेछ।
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">म</div>
          <span>Admin Panel</span>
        </div>
        <nav className="sidebar-nav">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`sidebar-link ${adminTab === t.key ? 'active' : ''}`}
              onClick={() => setAdminTab(t.key)}
            >
              <span className="sidebar-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={onGoHome}>
            <span className="sidebar-icon">⌂</span> सार्वजनिक पृष्ठ
          </button>
          <button className="sidebar-link logout" onClick={onLogout}>
            <span className="sidebar-icon">⏻</span> लगआउट
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <h2 className="admin-title">
              {adminTab === 'dashboard' && 'ड्यासबोर्ड'}
              {adminTab === 'upload' && 'डाटा अपलोड'}
              {adminTab === 'records' && 'रेकर्डहरू व्यवस्थापन'}
              {adminTab === 'users' && 'प्रयोगकर्ता व्यवस्थापन'}
            </h2>
            <p className="admin-subtitle">
              {adminTab === 'dashboard' && 'समग्र तथ्याङ्क र हालैका रेकर्डहरू'}
              {adminTab === 'upload' && 'फोल्डरबाट .xlsx फाइलहरू अपलोड गर्नुहोस्'}
              {adminTab === 'records' && 'सबै रेकर्ड हेर्नुहोस्, सम्पादन वा हटाउनुहोस्'}
              {adminTab === 'users' && 'प्रशासक पहुँच नियन्त्रण'}
            </p>
          </div>
          <div className="admin-avatar-chip">
            <div className="user-avatar-sm">A</div>
            <span>Admin</span>
          </div>
        </div>

        {renderTabContent()}
      </main>

      {/* File Wise Modal */}
      {showFileModal && (
        <div className="modal-overlay" onClick={() => setShowFileModal(false)}>
          <div className="modal file-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowFileModal(false)}>×</button>
            <h3>📂 फाइल अनुसार डाटा</h3>
            <p className="modal-sub">
              अपलोड गरिएका फाइलहरू अनुसार रेकर्डहरू
              {fileList.length > 0 && ` (${fileList.length} फाइलहरू)`}
            </p>
            
            {fileList.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 20px' }}>
                <p>कुनै फाइल डाटा छैन।</p>
                <span>पहिले फोल्डर अपलोड गर्नुहोस्।</span>
              </div>
            ) : (
              <div className="file-list">
                {fileList.map((file, index) => (
                  <div key={index} className={`file-item ${expandedFile === file.fileName ? 'expanded' : ''}`}>
                    <div className="file-item-header" onClick={() => toggleFileExpand(file.fileName)}>
                      <span className="file-item-icon">📄</span>
                      <span className="file-item-name">{file.fileName || 'Unknown File'}</span>
                      <span className="file-item-count">{file.count || 0} रेकर्ड</span>
                      <span className="file-item-arrow">{expandedFile === file.fileName ? '▼' : '▶'}</span>
                    </div>
                    {expandedFile === file.fileName && (
                      <div className="file-item-content">
                        <div className="table-wrap" style={{ marginTop: '10px' }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                {COLUMNS.map(c => (
                                  <th key={c.key}>{c.label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(file.voters || []).map((row, i) => (
                                <tr key={i} className={isRowMissing(row) ? 'row-missing' : ''}>
                                  {COLUMNS.map(c => (
                                    <td key={c.key}>
                                      {row[c.key] ? row[c.key] : <span className="cell-empty">—</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                              {(!file.voters || file.voters.length === 0) && (
                                <tr>
                                  <td colSpan={COLUMNS.length} style={{ textAlign: 'center', padding: '20px' }}>
                                    कुनै रेकर्ड छैन
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}