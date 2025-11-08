import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ServerForm({ onCreated }) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    host: '',
    port: 22,
    username: 'root',
    bindZonesPath: '/etc/bind/zones',
    bindConfigPath: '/etc/bind/named.conf',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [testing, setTesting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'port' ? parseInt(value) : value,
    });
  };

  const handleTestConnection = async (e) => {
    e.preventDefault();
    if (!formData.id) {
      setError('Veuillez d\'abord remplir l\'ID du serveur');
      return;
    }

    try {
      setTesting(true);
      const response = await axios.post(
        `${API_URL}/api/servers`,
        formData
      );

      if (response.data.success) {
        // Tester la connexion
        const testResponse = await axios.post(
          `${API_URL}/api/servers/${formData.id}/test`
        );

        if (testResponse.data.success) {
          setSuccess('✅ Connexion réussie!');
        } else {
          setError('❌ Connexion échouée: ' + testResponse.data.message);
        }
      }
    } catch (err) {
      setError('Erreur: ' + (err.response?.data?.error || err.message));
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.id || !formData.name || !formData.host) {
      setError('Les champs id, nom et hôte sont requis');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/api/servers`, formData);

      if (response.data.success) {
        setSuccess('Serveur ajouté avec succès!');
        setFormData({
          id: '',
          name: '',
          host: '',
          port: 22,
          username: 'root',
          bindZonesPath: '/etc/bind/zones',
          bindConfigPath: '/etc/bind/named.conf',
          description: '',
        });
        setTimeout(() => {
          onCreated();
        }, 500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <h3>Ajouter un serveur</h3>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>ID (identifiant unique)</label>
          <input
            type="text"
            name="id"
            value={formData.id}
            onChange={handleChange}
            placeholder="server1"
            required
          />
        </div>

        <div className="form-group">
          <label>Nom du serveur</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Serveur DNS Principal"
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>Hôte (IP ou domaine)</label>
            <input
              type="text"
              name="host"
              value={formData.host}
              onChange={handleChange}
              placeholder="192.168.1.10 ou localhost"
              required
            />
          </div>

          <div className="form-group">
            <label>Port SSH</label>
            <input
              type="number"
              name="port"
              value={formData.port}
              onChange={handleChange}
              min="1"
              max="65535"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Utilisateur SSH</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="root"
          />
        </div>

        <div className="form-group">
          <label>Chemin des zones BIND9</label>
          <input
            type="text"
            name="bindZonesPath"
            value={formData.bindZonesPath}
            onChange={handleChange}
            placeholder="/etc/bind/zones"
          />
        </div>

        <div className="form-group">
          <label>Chemin de la config BIND9</label>
          <input
            type="text"
            name="bindConfigPath"
            value={formData.bindConfigPath}
            onChange={handleChange}
            placeholder="/etc/bind/named.conf"
          />
        </div>

        <div className="form-group">
          <label>Description (optionnel)</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Ex: Serveur master en production"
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Ajout en cours...' : '✅ Ajouter le serveur'}
          </button>
        </div>

        <small style={{ display: 'block', marginTop: '10px', color: '#999' }}>
          ℹ️ Pour les serveurs distants, assurez-vous que vous avez une clé SSH configurée.
        </small>
      </form>
    </div>
  );
}
