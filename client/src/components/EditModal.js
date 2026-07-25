import React, { useState } from 'react';

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

export default function EditModal({ row, onSave, onClose }) {
  const [form, setForm] = useState({ ...row });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal edit-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>रेकर्ड सम्पादन गर्नुहोस्</h3>
        <div className="edit-grid">
          {COLUMNS.filter(c => c.key !== 'sn').map(c => (
            <div key={c.key} className="edit-field">
              <label>{c.label}</label>
              <input
                type="text"
                value={form[c.key] || ''}
                onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>रद्द गर्नुहोस्</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>
            सुरक्षित गर्नुहोस्
          </button>
        </div>
      </div>
    </div>
  );
}