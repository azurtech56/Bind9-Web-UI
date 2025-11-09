import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ZoneList from './components/ZoneList';
import ZoneDetails from './components/ZoneDetails';
import ZoneForm from './components/ZoneForm';

export default function App() {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewZoneForm, setShowNewZoneForm] = useState(false);

  // Récupérer les zones au démarrage
  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/zones`);
      setZones(response.data.data);
      setError(null);

      // Auto-sélectionner la première zone
      if (response.data.data.length > 0 && !selectedZone) {
        setSelectedZone(response.data.data[0]);
      }
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
        <p>Gérez vos zones DNS BIND9 locales</p>
      </header>

      <div className="container">
        <main>
          {/* Sidebar avec zones */}
          <aside className="sidebar">
            <section className="sidebar-section">
              <h2>📋 Zones DNS</h2>
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
            </section>
          </aside>

          {/* Contenu principal */}
          <section className="content">
            {selectedZone ? (
              <ZoneDetails
                zone={selectedZone}
                onZoneUpdated={fetchZones}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <h2>Bienvenue sur DNS Manager</h2>
                <p style={{ marginTop: '20px', color: '#999' }}>
                  Sélectionnez une zone ou créez une nouvelle zone pour commencer.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
