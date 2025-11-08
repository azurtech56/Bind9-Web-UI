import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ZoneList from './components/ZoneList';
import ZoneDetails from './components/ZoneDetails';
import ZoneForm from './components/ZoneForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewZoneForm, setShowNewZoneForm] = useState(false);

  // Récupérer la liste des zones
  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/zones`);
      setZones(response.data.data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des zones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
  };

  const handleZoneCreated = () => {
    fetchZones();
    setShowNewZoneForm(false);
  };

  return (
    <div>
      <header>
        <h1>🌐 DNS Manager</h1>
        <p>Gérez vos zones BIND9 facilement</p>
      </header>

      <div className="container">
        <main>
          <aside className="sidebar">
            <h2>Zones DNS</h2>
            <button
              className="btn-primary"
              style={{ width: '100%', marginBottom: '15px' }}
              onClick={() => setShowNewZoneForm(!showNewZoneForm)}
            >
              ➕ Nouvelle zone
            </button>

            {showNewZoneForm && (
              <ZoneForm onCreated={handleZoneCreated} />
            )}

            {loading ? (
              <div className="loader"></div>
            ) : error ? (
              <div className="alert alert-error">{error}</div>
            ) : (
              <ZoneList
                zones={zones}
                selectedZone={selectedZone}
                onSelectZone={handleZoneSelect}
              />
            )}
          </aside>

          <section className="content">
            {selectedZone ? (
              <ZoneDetails
                zone={selectedZone}
                apiUrl={API_URL}
                onZoneUpdated={fetchZones}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <h2>Bienvenue sur DNS Manager</h2>
                <p style={{ marginTop: '20px', color: '#999' }}>
                  Sélectionnez une zone à gauche ou créez une nouvelle zone pour commencer.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
