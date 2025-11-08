import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { ServersManager } from './serversManager.js';
import { SSHManager } from './sshManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Gestionnaires
const serversManager = new ServersManager('servers.config.json');

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// UTILITAIRES
// ============================================

/**
 * Parser simple pour les fichiers de zone DNS
 */
function parseZoneFile(content) {
  const lines = content.split('\n');
  const records = [];
  let id = 0;

  lines.forEach(line => {
    line = line.trim();

    if (!line || line.startsWith(';') || line.startsWith('$')) {
      return;
    }

    if (line.includes('SOA') && !line.includes(';')) {
      return;
    }

    const parts = line.split(/\s+/);
    if (parts.length >= 4) {
      const [name, , type, value] = parts;

      if (['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'SRV'].includes(type)) {
        records.push({
          id: `record-${id++}`,
          name,
          type,
          value,
          ttl: 3600
        });
      }
    }
  });

  return records;
}

/**
 * Reconstruire le fichier de zone
 */
function rebuildZoneFile(originalContent, records) {
  const lines = originalContent.split('\n');
  const newLines = [];

  let soaFound = false;
  for (const line of lines) {
    if (line.includes('SOA') || line.startsWith('$')) {
      newLines.push(line);
      soaFound = true;
    } else if (soaFound && (line.trim() === '' || line.startsWith(';'))) {
      newLines.push(line);
    } else if (soaFound && line.includes('NS')) {
      newLines.push(line);
      break;
    }
  }

  records.forEach(record => {
    newLines.push(
      `${record.name.padEnd(20)} IN  ${record.type.padEnd(10)} ${record.value}`
    );
  });

  return newLines.join('\n');
}

/**
 * Obtenir le gestionnaire de fichiers (local ou SSH)
 */
async function getFileManager(serverId) {
  const server = serversManager.getServerById(serverId);
  if (!server) {
    throw new Error(`Serveur ${serverId} non trouvé`);
  }

  if (serversManager.isLocalServer(serverId)) {
    // Serveur local
    return {
      readFile: (filePath) => fs.readFile(filePath, 'utf-8'),
      writeFile: (filePath, content) => fs.writeFile(filePath, content),
      readdir: (dirPath) => fs.readdir(dirPath),
      pathExists: (filePath) => fs.pathExists(filePath),
      remove: (filePath) => fs.remove(filePath),
      disconnect: () => Promise.resolve(),
    };
  } else {
    // Serveur distant via SSH
    const ssh = new SSHManager(server);
    await ssh.connect();
    return {
      readFile: (filePath) => ssh.readFile(filePath),
      writeFile: (filePath, content) => ssh.writeFile(filePath, content),
      readdir: (dirPath) => ssh.listFiles(dirPath).then(files => files.map(f => f.name)),
      pathExists: async (filePath) => {
        try {
          await ssh.readFile(filePath);
          return true;
        } catch {
          return false;
        }
      },
      remove: async (filePath) => {
        await ssh.executeCommand(`rm -rf "${filePath}"`);
      },
      disconnect: () => ssh.disconnect(),
    };
  }
}

// ============================================
// ROUTES API - SERVEURS
// ============================================

// GET - Lister tous les serveurs
app.get('/api/servers', (req, res) => {
  try {
    const servers = serversManager.getAllServers();
    const safeServers = servers.map(s => ({
      id: s.id,
      name: s.name,
      host: s.host,
      port: s.port,
      enabled: s.enabled,
      description: s.description,
      isLocal: serversManager.isLocalServer(s.id),
    }));

    res.json({
      success: true,
      data: safeServers,
      count: safeServers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET - Obtenir un serveur
app.get('/api/servers/:serverId', (req, res) => {
  try {
    const server = serversManager.getServerById(req.params.serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Serveur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        id: server.id,
        name: server.name,
        host: server.host,
        port: server.port,
        username: server.username,
        bindZonesPath: server.bindZonesPath,
        bindConfigPath: server.bindConfigPath,
        enabled: server.enabled,
        description: server.description,
        isLocal: serversManager.isLocalServer(server.id),
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST - Ajouter un serveur
app.post('/api/servers', async (req, res) => {
  try {
    const newServer = serversManager.addServer(req.body);

    res.json({
      success: true,
      message: `Serveur ${newServer.name} ajouté`,
      data: {
        id: newServer.id,
        name: newServer.name,
        host: newServer.host
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// PUT - Modifier un serveur
app.put('/api/servers/:serverId', (req, res) => {
  try {
    const updated = serversManager.updateServer(req.params.serverId, req.body);

    res.json({
      success: true,
      message: 'Serveur modifié',
      data: {
        id: updated.id,
        name: updated.name,
        host: updated.host
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE - Supprimer un serveur
app.delete('/api/servers/:serverId', (req, res) => {
  try {
    serversManager.deleteServer(req.params.serverId);

    res.json({
      success: true,
      message: 'Serveur supprimé'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST - Tester la connexion à un serveur
app.post('/api/servers/:serverId/test', async (req, res) => {
  try {
    const server = serversManager.getServerById(req.params.serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Serveur non trouvé'
      });
    }

    if (serversManager.isLocalServer(req.params.serverId)) {
      res.json({
        success: true,
        message: 'Serveur local',
        data: { connected: true }
      });
    } else {
      const ssh = new SSHManager(server);
      const result = await ssh.testConnection();

      res.json({
        success: result.success,
        message: result.message || result.error,
        data: { connected: result.success }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: { connected: false }
    });
  }
});

// ============================================
// ROUTES API - ZONES
// ============================================

// GET - Lister les zones d'un serveur
app.get('/api/servers/:serverId/zones', async (req, res) => {
  let manager = null;
  try {
    const server = serversManager.getServerById(req.params.serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Serveur non trouvé'
      });
    }

    manager = await getFileManager(req.params.serverId);
    const files = await manager.readdir(server.bindZonesPath);
    const zones = files
      .filter(f => !f.startsWith('.') && !f.endsWith('.jnl'))
      .map(zone => ({
        name: zone,
        server: req.params.serverId
      }));

    res.json({
      success: true,
      data: zones,
      count: zones.length,
      server: req.params.serverId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (manager) await manager.disconnect();
  }
});

// GET - Récupérer les enregistrements d'une zone
app.get('/api/servers/:serverId/zones/:zoneName', async (req, res) => {
  let manager = null;
  try {
    const { serverId, zoneName } = req.params;
    const server = serversManager.getServerById(serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Serveur non trouvé'
      });
    }

    manager = await getFileManager(serverId);
    const zonePath = path.join(server.bindZonesPath, zoneName);
    const content = await manager.readFile(zonePath);
    const records = parseZoneFile(content);

    res.json({
      success: true,
      data: {
        zone: zoneName,
        server: serverId,
        records: records,
        rawContent: content
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (manager) await manager.disconnect();
  }
});

// POST - Créer une zone
app.post('/api/servers/:serverId/zones', async (req, res) => {
  let manager = null;
  try {
    const { serverId } = req.params;
    const { zoneName, soaEmail, serial } = req.body;

    if (!zoneName || !soaEmail) {
      return res.status(400).json({
        success: false,
        error: 'zoneName et soaEmail requis'
      });
    }

    const server = serversManager.getServerById(serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Serveur non trouvé'
      });
    }

    manager = await getFileManager(serverId);
    const zonePath = path.join(server.bindZonesPath, zoneName);

    if (await manager.pathExists(zonePath)) {
      return res.status(400).json({
        success: false,
        error: 'La zone existe déjà'
      });
    }

    const currentSerial = serial || Math.floor(Date.now() / 1000);
    const zoneContent = `$TTL 3600
@   IN  SOA     ns1.${zoneName}. ${soaEmail}. (
                ${currentSerial}  ; serial
                3600           ; refresh
                1800           ; retry
                604800         ; expire
                86400 )        ; minimum

@   IN  NS      ns1.${zoneName}.
@   IN  A       192.168.1.1

ns1 IN  A       192.168.1.1
`;

    await manager.writeFile(zonePath, zoneContent);

    res.json({
      success: true,
      message: `Zone ${zoneName} créée sur ${server.name}`,
      data: { zoneName, serverId }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (manager) await manager.disconnect();
  }
});

// POST - Ajouter un enregistrement
app.post('/api/servers/:serverId/zones/:zoneName/records', async (req, res) => {
  let manager = null;
  try {
    const { serverId, zoneName } = req.params;
    const { name, type, value, ttl = 3600 } = req.body;

    if (!name || !type || !value) {
      return res.status(400).json({
        success: false,
        error: 'name, type et value requis'
      });
    }

    const server = serversManager.getServerById(serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Serveur non trouvé'
      });
    }

    manager = await getFileManager(serverId);
    const zonePath = path.join(server.bindZonesPath, zoneName);
    let content = await manager.readFile(zonePath);
    const lines = content.split('\n');

    const newRecord = `${name.padEnd(20)} IN  ${type.padEnd(10)} ${value}`;
    lines.splice(lines.length - 1, 0, newRecord);

    await manager.writeFile(zonePath, lines.join('\n'));

    res.json({
      success: true,
      message: 'Enregistrement ajouté',
      data: { name, type, value, ttl }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (manager) await manager.disconnect();
  }
});

// DELETE - Supprimer une zone
app.delete('/api/servers/:serverId/zones/:zoneName', async (req, res) => {
  let manager = null;
  try {
    const { serverId, zoneName } = req.params;
    const server = serversManager.getServerById(serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Serveur non trouvé'
      });
    }

    manager = await getFileManager(serverId);
    const zonePath = path.join(server.bindZonesPath, zoneName);
    await manager.remove(zonePath);

    res.json({
      success: true,
      message: `Zone ${zoneName} supprimée`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (manager) await manager.disconnect();
  }
});

// DELETE - Supprimer un enregistrement
app.delete('/api/servers/:serverId/zones/:zoneName/records/:recordId', async (req, res) => {
  let manager = null;
  try {
    const { serverId, zoneName, recordId } = req.params;
    const server = serversManager.getServerById(serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Serveur non trouvé'
      });
    }

    manager = await getFileManager(serverId);
    const zonePath = path.join(server.bindZonesPath, zoneName);
    let content = await manager.readFile(zonePath);
    const records = parseZoneFile(content);

    const newRecords = records.filter(r => r.id !== recordId);

    if (newRecords.length === records.length) {
      return res.status(404).json({
        success: false,
        error: 'Enregistrement non trouvé'
      });
    }

    const newContent = rebuildZoneFile(content, newRecords);
    await manager.writeFile(zonePath, newContent);

    res.json({
      success: true,
      message: 'Enregistrement supprimé'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (manager) await manager.disconnect();
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 DNS Manager API running on port ${PORT}`);
  console.log(`📋 Serveurs configurés: ${serversManager.getAllServers().length}`);
  serversManager.getAllServers().forEach(s => {
    console.log(`   - ${s.name} (${s.host})`);
  });
});
