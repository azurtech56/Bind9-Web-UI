import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RecordList from './RecordList';

export default function ReverseZoneDetails({ zone, onZoneUpdated }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'PTR',
    value: ''
  });

  useEffect(() => {
    fetchZoneDetails();
  }, [zone]);

  const fetchZoneDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/reverse-zones/${zone.name}`
      );
      setRecords(response.data.data.records);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des enregistrements PTR');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleRecordAdded = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.value) {
      alert('Tous les champs sont requis');
      return;
    }

    try {
      const response = await axios.post(
        `/api/reverse-zones/${zone.name}/records`,
        {
          name: formData.name,
          type: 'PTR',
          value: formData.value,
          ttl: 3600
        }
      );
      if (response.data.success) {
        fetchZoneDetails();
        setFormData({ name: '', type: 'PTR', value: '' });
        setShowForm(false);
      }
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message));
      console.error('Erreur:', err);
    }
  };

  const handleRecordDeleted = async (recordId) => {
    try {
      await axios.delete(
        `/api/reverse-zones/${zone.name}/records/${recordId}`
      );
      fetchZoneDetails();
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleZoneDeleted = async () => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la zone inverse ${zone.name}?`)) {
      try {
        await axios.delete(`/api/reverse-zones/${zone.name}`);
        onZoneUpdated();
      } catch (err) {
        console.error('Erreur:', err);
        alert('Erreur lors de la suppression');
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>🔄 {zone.name}</h2>
          <p style={{ fontSize: '12px', color: '#999', margin: '5px 0 0 0' }}>
            Zone inverse PTR
          </p>
        </div>
        <div>
          <button
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
            style={{ marginRight: '10px' }}
          >
            ➕ Ajouter un enregistrement PTR
          </button>
          <button
            className="btn-danger"
            onClick={handleZoneDeleted}
          >
            🗑️ Supprimer la zone
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '20px', backgroundColor: '#f9f9f9' }}>
          <h4>Nouvel enregistrement PTR</h4>
          <form onSubmit={handleRecordAdded}>
            <div className="form-group">
              <label>IP inversée (ex: 1 pour 192.168.1.1)</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Nom d'hôte (FQDN)</label>
              <input
                type="text"
                name="value"
                value={formData.value}
                onChange={handleFormChange}
                placeholder="server.example.com."
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary">
                Ajouter
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', type: 'PTR', value: '' });
                }}
                style={{ padding: '10px 20px', backgroundColor: '#ddd', border: '1px solid #999', borderRadius: '4px', cursor: 'pointer' }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loader"></div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : records.length === 0 ? (
        <div className="alert alert-info">Aucun enregistrement PTR dans cette zone</div>
      ) : (
        <RecordList
          records={records}
          onDelete={handleRecordDeleted}
        />
      )}
    </div>
  );
}
