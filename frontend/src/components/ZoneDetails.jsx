import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RecordList from './RecordList';
import RecordForm from './RecordForm';

export default function ZoneDetails({ zone, server, apiUrl, onZoneUpdated }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchZoneDetails();
  }, [zone, server]);

  const fetchZoneDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${apiUrl}/api/servers/${server.id}/zones/${zone.name}`
      );
      setRecords(response.data.data.records);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des enregistrements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordAdded = async (newRecord) => {
    try {
      const response = await axios.post(
        `${apiUrl}/api/servers/${server.id}/zones/${zone.name}/records`,
        newRecord
      );
      if (response.data.success) {
        fetchZoneDetails();
        setShowForm(false);
      }
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const handleRecordDeleted = async (recordId) => {
    try {
      await axios.delete(
        `${apiUrl}/api/servers/${server.id}/zones/${zone.name}/records/${recordId}`
      );
      fetchZoneDetails();
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const handleZoneDeleted = async () => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la zone ${zone.name}?`)) {
      try {
        await axios.delete(`${apiUrl}/api/servers/${server.id}/zones/${zone.name}`);
        onZoneUpdated();
      } catch (err) {
        console.error('Erreur:', err);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>{zone.name}</h2>
          <p style={{ fontSize: '12px', color: '#999', margin: '5px 0 0 0' }}>
            📡 Serveur: {server.name}
          </p>
        </div>
        <div>
          <button
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
            style={{ marginRight: '10px' }}
          >
            ➕ Ajouter un enregistrement
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
        <RecordForm
          zone={zone.name}
          onRecordAdded={handleRecordAdded}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="loader"></div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : records.length === 0 ? (
        <div className="alert alert-info">Aucun enregistrement dans cette zone</div>
      ) : (
        <RecordList
          records={records}
          onDelete={handleRecordDeleted}
        />
      )}
    </div>
  );
}
