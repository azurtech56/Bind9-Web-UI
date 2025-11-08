import React, { useState } from 'react';

export default function RecordForm({ zone, onRecordAdded, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'A',
    value: '',
    ttl: '3600',
  });

  const dnsTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SRV'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.value) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    onRecordAdded(formData);
    setFormData({
      name: '',
      type: 'A',
      value: '',
      ttl: '3600',
    });
  };

  return (
    <div className="card" style={{ marginBottom: '20px', background: '#f9f9f9' }}>
      <h3>Ajouter un nouvel enregistrement</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>Nom (sous-domaine)</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="www ou mail ou @"
              required
            />
          </div>

          <div className="form-group">
            <label>Type d'enregistrement</label>
            <select name="type" value={formData.type} onChange={handleChange}>
              {dnsTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Valeur</label>
            <input
              type="text"
              name="value"
              value={formData.value}
              onChange={handleChange}
              placeholder="192.168.1.1 ou mail.exemple.com"
              required
            />
          </div>

          <div className="form-group">
            <label>TTL (secondes)</label>
            <input
              type="number"
              name="ttl"
              value={formData.ttl}
              onChange={handleChange}
              min="60"
              max="2592000"
            />
          </div>
        </div>

        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn-primary">
            ✅ Ajouter
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
          >
            ❌ Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
