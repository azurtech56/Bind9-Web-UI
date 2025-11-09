import React, { useState } from 'react';
import axios from 'axios';

const API_URL = '';

export default function ZoneForm({ serverId, onCreated }) {
  const [formData, setFormData] = useState({
    zoneName: '',
    soaEmail: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.zoneName || !formData.soaEmail) {
      setError('Tous les champs sont requis');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(
        `${API_URL}/api/servers/${serverId}/zones`,
        formData
      );

      if (response.data.success) {
        setSuccess('Zone créée avec succès!');
        setFormData({ zoneName: '', soaEmail: '' });
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
    <div className="card" style={{ marginBottom: '20px' }}>
      <h3>Créer une nouvelle zone</h3>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nom de la zone</label>
          <input
            type="text"
            name="zoneName"
            value={formData.zoneName}
            onChange={handleChange}
            placeholder="exemple.com"
          />
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
          {loading ? 'Création...' : 'Créer la zone'}
        </button>
      </form>
    </div>
  );
}
