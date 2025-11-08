import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Gestionnaire des serveurs DNS
 */
export class ServersManager {
  constructor(configPath = 'servers.config.json') {
    this.configPath = path.resolve(__dirname, configPath);
    this.servers = [];
    this.loadServers();
  }

  /**
   * Charger la configuration des serveurs
   */
  loadServers() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readJsonSync(this.configPath);
        this.servers = configData.servers || [];
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
      this.servers = [];
    }
  }

  /**
   * Sauvegarder la configuration
   */
  saveServers() {
    try {
      fs.writeJsonSync(this.configPath, { servers: this.servers }, { spaces: 2 });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      throw error;
    }
  }

  /**
   * Obtenir tous les serveurs
   */
  getAllServers() {
    return this.servers.filter((s) => s.enabled !== false);
  }

  /**
   * Obtenir un serveur par ID
   */
  getServerById(serverId) {
    return this.servers.find((s) => s.id === serverId);
  }

  /**
   * Ajouter un nouveau serveur
   */
  addServer(serverConfig) {
    if (!serverConfig.id || !serverConfig.name || !serverConfig.host) {
      throw new Error('id, name et host sont requis');
    }

    // Vérifier que l'ID est unique
    if (this.servers.some((s) => s.id === serverConfig.id)) {
      throw new Error(`Un serveur avec l'ID '${serverConfig.id}' existe déjà`);
    }

    const newServer = {
      id: serverConfig.id,
      name: serverConfig.name,
      host: serverConfig.host,
      port: serverConfig.port || 22,
      username: serverConfig.username || 'root',
      sshKeyPath: serverConfig.sshKeyPath,
      password: serverConfig.password,
      bindZonesPath: serverConfig.bindZonesPath || '/etc/bind/zones',
      bindConfigPath: serverConfig.bindConfigPath || '/etc/bind/named.conf',
      enabled: serverConfig.enabled !== false,
      description: serverConfig.description || '',
      createdAt: new Date().toISOString(),
    };

    this.servers.push(newServer);
    this.saveServers();
    return newServer;
  }

  /**
   * Modifier un serveur
   */
  updateServer(serverId, updates) {
    const serverIndex = this.servers.findIndex((s) => s.id === serverId);
    if (serverIndex === -1) {
      throw new Error(`Serveur ${serverId} non trouvé`);
    }

    this.servers[serverIndex] = {
      ...this.servers[serverIndex],
      ...updates,
      id: this.servers[serverIndex].id, // L'ID ne peut pas être modifié
      createdAt: this.servers[serverIndex].createdAt, // La date de création ne change pas
    };

    this.saveServers();
    return this.servers[serverIndex];
  }

  /**
   * Supprimer un serveur
   */
  deleteServer(serverId) {
    const serverIndex = this.servers.findIndex((s) => s.id === serverId);
    if (serverIndex === -1) {
      throw new Error(`Serveur ${serverId} non trouvé`);
    }

    const deleted = this.servers.splice(serverIndex, 1)[0];
    this.saveServers();
    return deleted;
  }

  /**
   * Désactiver/Activer un serveur
   */
  toggleServer(serverId) {
    const server = this.getServerById(serverId);
    if (!server) {
      throw new Error(`Serveur ${serverId} non trouvé`);
    }

    server.enabled = !server.enabled;
    this.saveServers();
    return server;
  }

  /**
   * Vérifier si c'est un serveur local
   */
  isLocalServer(serverId) {
    const server = this.getServerById(serverId);
    if (!server) return false;

    return (
      server.host === 'localhost' ||
      server.host === '127.0.0.1' ||
      server.host === '::1'
    );
  }
}
