import React, { useState } from 'react';
import axios from 'axios';

export default function ReverseZoneForm({ onCreated }) {
  const [formData, setFormData] = useState({
    zoneName: '',
    soaEmail: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Suggest format for reverse zones
    if (name === 'zoneName' && value) {
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) {
        setSuggestion(`${value}.in-addr.arpa`);
      } else {
        setSuggestion(null);
      }
    }
  };

  const applySuggestion = () => {
    if (suggestion) {
      setFormData({
        ...formData,
        zoneName: suggestion,
      });
      setSuggestion(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.zoneName || !formData.soaEmail) {
      setError('Tous les champs sont requis');
      return;
    }

    // Validate reverse zone format
    const validFormat = /^([0-9]+\.)*in-addr\.arpa$/.test(formData.zoneName) ||
                       /^([0-9a-f]+\.)*ip6\.arpa$/.test(formData.zoneName);

    if (!validFormat) {
      setError('Format de zone inverse invalide. Utilisez le format: 1.168.192.in-addr.arpa ou format IPv6');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(
        `/api/reverse-zones`,
        formData
      );

      if (response.data.success) {
        setSuccess('Zone inverse créée avec succès!');
        setFormData({ zoneName: '', soaEmail: '' });
        setSuggestion(null);
        setTimeout(() => {
          onCreated();
        }, 500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #ff9800' }}>
      <h3>🔄 Créer une nouvelle zone inverse</h3>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Zone inverse (format: x.x.x.in-addr.arpa)</label>
          <input
            type="text"
            name="zoneName"
            value={formData.zoneName}
            onChange={handleChange}
            placeholder="1.168.192.in-addr.arpa"
          />
          {suggestion && (
            <div style={{ marginTop: '5px', fontSize: '12px', color: '#2196F3' }}>
              💡 Suggestion: <strong>{suggestion}</strong>
              <button
                type="button"
                onClick={applySuggestion}
                style={{
                  marginLeft: '10px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  backgroundColor: '#2196F3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Appliquer
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Email SOA</label>
          <input
            type="email"
            name="soaEmail"
            value={formData.soaEmail}
            onChange={handleChange}
            placeholder="admin@exemple.com"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Création...' : 'Créer la zone inverse'}
        </button>
      </form>

      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
        <strong>Formats acceptés:</strong><br/>
        IPv4: <code>1.168.192.in-addr.arpa</code> (pour réseau 192.168.1.0)<br/>
        IPv6: <code>2.1.0.0.d.f.ip6.arpa</code> (pour préfixe IPv6)
      </div>
    </div>
  );
}
