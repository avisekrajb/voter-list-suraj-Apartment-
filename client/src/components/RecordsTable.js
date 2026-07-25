import React from 'react';

export default function RecordsTable({ 
  records, 
  isAdmin, 
  onEdit, 
  onDelete, 
  columns, 
  hasDuplicate,
  selectedVoters = [],
  onSelectVoter 
}) {
  if (!records || records.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⌕</div>
        <p>माफ गर्नुहोस्, डाटा उपलब्ध छैन।</p>
        <span>अर्को शब्द वा वर्तनी प्रयोग गरी पुनः खोज्नुहोस्।</span>
      </div>
    );
  }

  const isRowMissing = (row) => {
    return columns.some(c => 
      c.key !== 'sn' && 
      c.key !== 'province' && 
      c.key !== 'citizenshipIssue' && 
      c.key !== 'parentName' && 
      c.key !== 'spouseName' &&
      (!row[c.key] || String(row[c.key]).trim() === '')
    );
  };

  const isDuplicateField = (row, field) => {
    if (!hasDuplicate) return false;
    return hasDuplicate(row, field);
  };

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {isAdmin && onSelectVoter && (
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={selectedVoters.length === records.length && records.length > 0}
                  onChange={() => {
                    if (selectedVoters.length === records.length) {
                      // Deselect all
                      records.forEach(r => onSelectVoter(r.sn));
                    } else {
                      // Select all
                      records.forEach(r => {
                        if (!selectedVoters.includes(r.sn)) {
                          onSelectVoter(r.sn);
                        }
                      });
                    }
                  }}
                />
              </th>
            )}
            {columns.map(c => (
              <th key={c.key}>{c.label}</th>
            ))}
            {isAdmin && <th className="action-col">कार्य</th>}
          </tr>
        </thead>
        <tbody>
          {records.map(row => (
            <tr key={row.sn || row._id} className={isRowMissing(row) ? 'row-missing' : ''}>
              {isAdmin && onSelectVoter && (
                <td style={{ textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedVoters.includes(row.sn)}
                    onChange={() => onSelectVoter(row.sn)}
                  />
                </td>
              )}
              {columns.map(c => {
                let cellClass = '';
                if (c.key === 'voterNo' && isDuplicateField(row, 'voterNo')) {
                  cellClass = 'duplicate-cell';
                }
                if (c.key === 'citizenshipNo' && isDuplicateField(row, 'citizenshipNo')) {
                  cellClass = 'duplicate-cell';
                }
                return (
                  <td key={c.key} className={cellClass}>
                    {row[c.key] ? row[c.key] : <span className="cell-empty">—</span>}
                    {(c.key === 'voterNo' || c.key === 'citizenshipNo') && isDuplicateField(row, c.key) && (
                      <span className="duplicate-badge" title="यो मान पहिले नै अर्को रेकर्डमा छ">⚠️</span>
                    )}
                  </td>
                );
              })}
              {isAdmin && (
                <td className="action-col action-col-multi">
                  <button 
                    className="icon-btn" 
                    onClick={() => onEdit(row)} 
                    title="सम्पादन"
                  >
                    ✎
                  </button>
                  <button 
                    className="icon-btn icon-btn-danger" 
                    onClick={() => onDelete(row.sn)} 
                    title="हटाउनुहोस्"
                  >
                    🗑
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}