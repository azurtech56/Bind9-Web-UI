import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ZoneList from './components/ZoneList';
import ZoneDetails from './components/ZoneDetails';
import ZoneForm from './components/ZoneForm';
import ReverseZoneList from './components/ReverseZoneList';
import ReverseZoneDetails from './components/ReverseZoneDetails';
import ReverseZoneForm from './components/ReverseZoneForm';

export default function App() {
  const [zones, setZones] = useState([]);
  const [reverseZones, setReverseZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedReverseZone, setSelectedReverseZone] = useState(null);
  const [activeTab, setActiveTab] = useState('zones'); // 'zones' ou 'reverse-zones'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewZoneForm, setShowNewZoneForm] = useState(false);
  const [showNewReverseZoneForm, setShowNewReverseZoneForm] = useState(false);

  // Récupérer les zones au démarrage
  useEffect(() => {
    fetchAllZones();
  }, []);

  const fetchAllZones = async () => {
    try {
      setLoading(true);
      const [zoneResponse, reverseZoneResponse] = await Promise.all([
        axios.get(`/api/zones`),
        axios.get(`/api/reverse-zones`)
      ]);

      setZones(zoneResponse.data.data);
      setReverseZones(reverseZoneResponse.data.data);
      setError(null);

      // Auto-sélectionner la première zone
      if (activeTab === 'zones' && zoneResponse.data.data.length > 0 && !selectedZone) {
        setSelectedZone(zoneResponse.data.data[0]);
      } else if (activeTab === 'reverse-zones' && reverseZoneResponse.data.data.length > 0 && !selectedReverseZone) {
        setSelectedReverseZone(reverseZoneResponse.data.data[0]);
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

  const handleReverseZoneSelect = (zone) => {
    setSelectedReverseZone(zone);
  };

  const handleZoneCreated = () => {
    fetchAllZones();
    setShowNewZoneForm(false);
  };

  const handleReverseZoneCreated = () => {
    fetchAllZones();
    setShowNewReverseZoneForm(false);
  };

  return (
    <div>
      <header>
        <h1>🌐 DNS Manager</h1>
        <p>Gérez vos zones DNS et inverses BIND9 locales</p>
      </header>

      <div className="container">
        <main>
          {/* Sidebar avec onglets */}
          <aside className="sidebar">
            {/* Onglets */}
            <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
              <button
                onClick={() => {
                  setActiveTab('zones');
                  setSelectedZone(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: activeTab === 'zones' ? '#007bff' : '#f0f0f0',
                  color: activeTab === 'zones' ? '#fff' : '#000',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                📋 Zones DNS
              </button>
              <button
                onClick={() => {
                  setActiveTab('reverse-zones');
                  setSelectedReverseZone(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: activeTab === 'reverse-zones' ? '#ff9800' : '#f0f0f0',
                  color: activeTab === 'reverse-zones' ? '#fff' : '#000',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🔄 Zones Inverses
              </button>
            </div>

            {/* Contenu zones normales */}
            {activeTab === 'zones' && (
              <section className="sidebar-section">
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
            )}

            {/* Contenu zones inverses */}
            {activeTab === 'reverse-zones' && (
              <section className="sidebar-section">
                <button
                  className="btn-primary"
                  style={{ width: '100%', marginBottom: '15px', backgroundColor: '#ff9800', borderColor: '#ff9800' }}
                  onClick={() => setShowNewReverseZoneForm(!showNewReverseZoneForm)}
                >
                  ➕ Nouvelle zone inverse
                </button>

                {showNewReverseZoneForm && (
                  <ReverseZoneForm onCreated={handleReverseZoneCreated} />
                )}

                {loading ? (
                  <div className="loader"></div>
                ) : error ? (
                  <div className="alert alert-error">{error}</div>
                ) : (
                  <ReverseZoneList
                    zones={reverseZones}
                    selectedZone={selectedReverseZone}
                    onSelectZone={handleReverseZoneSelect}
                  />
                )}
              </section>
            )}
          </aside>

          {/* Contenu principal */}
          <section className="content">
            {activeTab === 'zones' ? (
              selectedZone ? (
                <ZoneDetails
                  zone={selectedZone}
                  onZoneUpdated={fetchAllZones}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <h2>Bienvenue sur DNS Manager</h2>
                  <p style={{ marginTop: '20px', color: '#999' }}>
                    Sélectionnez une zone ou créez une nouvelle zone pour commencer.
                  </p>
                </div>
              )
            ) : (
              selectedReverseZone ? (
                <ReverseZoneDetails
                  zone={selectedReverseZone}
                  onZoneUpdated={fetchAllZones}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <h2>Zones Inverses PTR</h2>
                  <p style={{ marginTop: '20px', color: '#999' }}>
                    Sélectionnez une zone inverse ou créez une nouvelle zone pour commencer.
                  </p>
                </div>
              )
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
