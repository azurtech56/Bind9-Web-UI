import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ServerList from './components/ServerList';
import ServerForm from './components/ServerForm';
import ZoneList from './components/ZoneList';
import ZoneDetails from './components/ZoneDetails';
import ZoneForm from './components/ZoneForm';

const API_URL = '';

export default function App() {
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewServerForm, setShowNewServerForm] = useState(false);
  const [showNewZoneForm, setShowNewZoneForm] = useState(false);

  // Récupérer les serveurs au démarrage
  useEffect(() => {
    fetchServers();
  }, []);

  // Récupérer les zones quand un serveur est sélectionné
  useEffect(() => {
    if (selectedServer) {
      fetchZones();
    } else {
      setZones([]);
      setSelectedZone(null);
    }
  }, [selectedServer]);

  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/servers`);
      setServers(response.data.data);
      setError(null);

      // Auto-sélectionner le premier serveur
      if (response.data.data.length > 0 && !selectedServer) {
        setSelectedServer(response.data.data[0]);
      }
    } catch (err) {
      setError('Erreur lors du chargement des serveurs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async () => {
    if (!selectedServer) return;

    try {
      const response = await axios.get(
        `${API_URL}/api/servers/${selectedServer.id}/zones`
      );
      setZones(response.data.data);
      setSelectedZone(null);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des zones');
      console.error(err);
    }
  };

  const handleServerSelect = (server) => {
    setSelectedServer(server);
  };

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
  };

  const handleServerCreated = () => {
    fetchServers();
    setShowNewServerForm(false);
  };

  const handleServerDeleted = () => {
    fetchServers();
    setSelectedServer(null);
  };

  const handleZoneCreated = () => {
    fetchZones();
    setShowNewZoneForm(false);
  };

  return (
    <div>
      <header>
        <h1>🌐 DNS Manager Multi-Serveurs</h1>
        <p>Gérez tous vos serveurs BIND9 depuis une interface centralisée</p>
      </header>

      <div className="container">
        <main>
          {/* Sidebar avec serveurs et zones */}
          <aside className="sidebar">
            {/* Section Serveurs */}
            <section className="sidebar-section">
              <h2>📡 Serveurs DNS</h2>
              <button
                className="btn-primary"
                style={{ width: '100%', marginBottom: '15px' }}
                onClick={() => setShowNewServerForm(!showNewServerForm)}
              >
                ➕ Ajouter un serveur
              </button>

              {showNewServerForm && (
                <ServerForm onCreated={handleServerCreated} />
              )}

              {loading ? (
                <div className="loader"></div>
              ) : error ? (
                <div className="alert alert-error">{error}</div>
              ) : (
                <ServerList
                  servers={servers}
                  selectedServer={selectedServer}
                  onSelectServer={handleServerSelect}
                />
              )}
            </section>

            {/* Section Zones */}
            {selectedServer && (
              <section className="sidebar-section" style={{ marginTop: '30px' }}>
                <h2>📋 Zones</h2>
                <p style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
                  Serveur: {selectedServer.name}
                </p>

                <button
                  className="btn-primary"
                  style={{ width: '100%', marginBottom: '15px' }}
                  onClick={() => setShowNewZoneForm(!showNewZoneForm)}
                >
                  ➕ Nouvelle zone
                </button>

                {showNewZoneForm && (
                  <ZoneForm
                    serverId={selectedServer.id}
                    onCreated={handleZoneCreated}
                  />
                )}

                <ZoneList
                  zones={zones}
                  selectedZone={selectedZone}
                  onSelectZone={handleZoneSelect}
                />
              </section>
            )}
          </aside>

          {/* Contenu principal */}
          <section className="content">
            {selectedZone && selectedServer ? (
              <ZoneDetails
                zone={selectedZone}
                server={selectedServer}
                apiUrl={API_URL}
                onZoneUpdated={fetchZones}
              />
            ) : selectedServer ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <h2>Bienvenue sur {selectedServer.name}</h2>
                <p style={{ marginTop: '20px', color: '#999' }}>
                  Sélectionnez une zone ou créez une nouvelle zone pour commencer.
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <h2>Bienvenue sur DNS Manager</h2>
                <p style={{ marginTop: '20px', color: '#999' }}>
                  Ajoutez un serveur DNS ou sélectionnez un serveur existant pour commencer.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
