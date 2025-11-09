import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Configuration BIND9 locale
const BIND_ZONES_PATH = process.env.BIND9_ZONES_PATH || '/etc/bind/zones';

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
 * Valider format de zone inverse PTR
 * Accepte: 1.168.192.in-addr.arpa, 2.1.0.0.d.f.ip6.arpa, etc.
 */
function isValidReverseZone(zoneName) {
  return /^([0-9]+\.)*in-addr\.arpa$/.test(zoneName) ||
         /^([0-9a-f]+\.)*ip6\.arpa$/.test(zoneName);
}

/**
 * Parser pour fichiers de zone inverse (PTR)
 */
function parseReverseZoneFile(content) {
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

      if (['PTR', 'NS', 'SOA'].includes(type)) {
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
 * Reconstruire le fichier de zone inverse
 */
function rebuildReverseZoneFile(originalContent, records) {
  const lines = originalContent.split('\n');
  const newLines = [];

  let soaFound = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('SOA') || line.startsWith('$')) {
      newLines.push(line);
      soaFound = true;
    } else if (soaFound && (trimmed === '' || trimmed.startsWith(';'))) {
      newLines.push(line);
    } else if (soaFound && (trimmed.includes('NS') || trimmed.includes('PTR'))) {
      // Arrêter à la première ligne de record (NS ou PTR)
      break;
    }
  }

  // Ajouter tous les records (NS et PTR)
  records.forEach(record => {
    newLines.push(
      `${record.name.padEnd(20)} IN  ${record.type.padEnd(10)} ${record.value}`
    );
  });

  return newLines.join('\n');
}

// ============================================
// ROUTES API
// ============================================

// GET - Santé de l'API
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'DNS Manager API is running' });
});

// GET - Lister toutes les zones (zones normales uniquement, pas les inverses)
app.get('/api/zones', async (req, res) => {
  try {
    const files = await fs.readdir(BIND_ZONES_PATH);
    const zones = files
      .filter(f => !f.startsWith('.') && !f.endsWith('.jnl') && !isValidReverseZone(f))
      .map(zone => ({
        name: zone
      }));

    res.json({
      success: true,
      data: zones,
      count: zones.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET - Récupérer les enregistrements d'une zone
app.get('/api/zones/:zoneName', async (req, res) => {
  try {
    const { zoneName } = req.params;
    const zonePath = path.join(BIND_ZONES_PATH, zoneName);

    // Sécurité: vérifier que le chemin est dans BIND_ZONES_PATH
    if (!zonePath.startsWith(BIND_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    const content = await fs.readFile(zonePath, 'utf-8');
    const records = parseZoneFile(content);

    res.json({
      success: true,
      data: {
        zone: zoneName,
        records: records,
        rawContent: content
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST - Créer une zone
app.post('/api/zones', async (req, res) => {
  try {
    const { zoneName, soaEmail, serial } = req.body;

    if (!zoneName || !soaEmail) {
      return res.status(400).json({
        success: false,
        error: 'zoneName et soaEmail requis'
      });
    }

    const zonePath = path.join(BIND_ZONES_PATH, zoneName);

    // Sécurité: vérifier que le chemin est dans BIND_ZONES_PATH
    if (!zonePath.startsWith(BIND_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    if (await fs.pathExists(zonePath)) {
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

    await fs.writeFile(zonePath, zoneContent);

    res.json({
      success: true,
      message: `Zone ${zoneName} créée`,
      data: { zoneName }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST - Ajouter un enregistrement
app.post('/api/zones/:zoneName/records', async (req, res) => {
  try {
    const { zoneName } = req.params;
    const { name, type, value, ttl = 3600 } = req.body;

    if (!name || !type || !value) {
      return res.status(400).json({
        success: false,
        error: 'name, type et value requis'
      });
    }

    const zonePath = path.join(BIND_ZONES_PATH, zoneName);

    // Sécurité: vérifier que le chemin est dans BIND_ZONES_PATH
    if (!zonePath.startsWith(BIND_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    let content = await fs.readFile(zonePath, 'utf-8');
    const lines = content.split('\n');

    const newRecord = `${name.padEnd(20)} IN  ${type.padEnd(10)} ${value}`;
    lines.splice(lines.length - 1, 0, newRecord);

    await fs.writeFile(zonePath, lines.join('\n'));

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
  }
});

// DELETE - Supprimer une zone
app.delete('/api/zones/:zoneName', async (req, res) => {
  try {
    const { zoneName } = req.params;
    const zonePath = path.join(BIND_ZONES_PATH, zoneName);

    // Sécurité: vérifier que le chemin est dans BIND_ZONES_PATH
    if (!zonePath.startsWith(BIND_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    await fs.remove(zonePath);

    res.json({
      success: true,
      message: `Zone ${zoneName} supprimée`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE - Supprimer un enregistrement
app.delete('/api/zones/:zoneName/records/:recordId', async (req, res) => {
  try {
    const { zoneName, recordId } = req.params;
    const zonePath = path.join(BIND_ZONES_PATH, zoneName);

    // Sécurité: vérifier que le chemin est dans BIND_ZONES_PATH
    if (!zonePath.startsWith(BIND_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    let content = await fs.readFile(zonePath, 'utf-8');
    const records = parseZoneFile(content);

    const newRecords = records.filter(r => r.id !== recordId);

    if (newRecords.length === records.length) {
      return res.status(404).json({
        success: false,
        error: 'Enregistrement non trouvé'
      });
    }

    const newContent = rebuildZoneFile(content, newRecords);
    await fs.writeFile(zonePath, newContent);

    res.json({
      success: true,
      message: 'Enregistrement supprimé'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ZONES INVERSES (PTR)
// ============================================

// GET - Lister les zones inverses
app.get('/api/reverse-zones', async (req, res) => {
  try {
    const files = await fs.readdir(BIND_ZONES_PATH);
    const reverseZones = files
      .filter(f => !f.startsWith('.') && !f.endsWith('.jnl') && isValidReverseZone(f))
      .map(zone => ({
        name: zone,
        type: 'reverse'
      }));

    res.json({
      success: true,
      data: reverseZones,
      count: reverseZones.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET - Récupérer les enregistrements d'une zone inverse
app.get('/api/reverse-zones/:zoneName', async (req, res) => {
  try {
    const { zoneName } = req.params;

    // Valider le format de zone inverse
    if (!isValidReverseZone(zoneName)) {
      return res.status(400).json({
        success: false,
        error: 'Format de zone inverse invalide'
      });
    }

    const zonePath = path.join(BIND_ZONES_PATH, zoneName);

    // Sécurité: vérifier que le chemin est dans BIND_ZONES_PATH
    if (!zonePath.startsWith(BIND_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    const content = await fs.readFile(zonePath, 'utf-8');
    const records = parseReverseZoneFile(content);

    res.json({
      success: true,
      data: {
        zone: zoneName,
        records: records,
        rawContent: content
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST - Créer une zone inverse
app.post('/api/reverse-zones', async (req, res) => {
  try {
    const { zoneName, soaEmail, serial } = req.body;

    if (!zoneName || !soaEmail) {
      return res.status(400).json({
        success: false,
        error: 'zoneName et soaEmail requis'
      });
    }

    // Valider le format de zone inverse
    if (!isValidReverseZone(zoneName)) {
      return res.status(400).json({
        success: false,
        error: 'Format de zone inverse invalide. Utilisez le format: 1.168.192.in-addr.arpa'
      });
    }

    const zonePath = path.join(BIND_ZONES_PATH, zoneName);

    // Sécurité: vérifier que le chemin est dans BIND_ZONES_PATH
    if (!zonePath.startsWith(BIND_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    if (await fs.pathExists(zonePath)) {
      return res.status(400).json({
        success: false,
        error: 'La zone inverse existe déjà'
      });
    }

    const currentSerial = serial || Math.floor(Date.now() / 1000);
    const zoneContent = `$TTL 3600
@   IN  SOA     ns1.example.com. ${soaEmail}. (
                ${currentSerial}  ; serial
                3600           ; refresh
                1800           ; retry
                604800         ; expire
                86400 )        ; minimum

@   IN  NS      ns1.example.com.
`;

    await fs.writeFile(zonePath, zoneContent);

    res.json({
      success: true,
      message: `Zone inverse ${zoneName} créée`,
      data: { zoneName }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST - Ajouter un enregistrement PTR
app.post('/api/reverse-zones/:zoneName/records', async (req, res) => {
  try {
    const { zoneName } = req.params;
    const { name, type, value, ttl = 3600 } = req.body;

    // Valider le format de zone inverse
    if (!isValidReverseZone(zoneName)) {
      return res.status(400).json({
        success: false,
        error: 'Format de zone inverse invalide'
      });
    }

    if (!name || !type || !value) {
      return res.status(400).json({
        success: false,
        error: 'name, type et value requis'
      });
    }

    if (type !== 'PTR') {
      return res.status(400).json({
        success: false,
        error: 'Seul le type PTR est accepté pour les zones inverses'
      });
    }

    const zonePath = path.join(BIND_ZONES_PATH, zoneName);

    // Sécurité: vérifier que le chemin est dans BIND_ZONES_PATH
    if (!zonePath.startsWith(BIND_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    let content = await fs.readFile(zonePath, 'utf-8');
    const lines = content.split('\n');

    const newRecord = `${name.padEnd(20)} IN  ${type.padEnd(10)} ${value}`;
    lines.splice(lines.length - 1, 0, newRecord);

    await fs.writeFile(zonePath, lines.join('\n'));

    res.json({
      success: true,
      message: 'Enregistrement PTR ajouté',
      data: { name, type, value, ttl }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE - Supprimer une zone inverse
app.delete('/api/reverse-zones/:zoneName', async (req, res) => {
  try {
    const { zoneName } = req.params;

    // Valider le format de zone inverse
    if (!isValidReverseZone(zoneName)) {
      return res.status(400).json({
        success: false,
        error: 'Format de zone inverse invalide'
      });
    }

    const zonePath = path.join(BIND_ZONES_PATH, zoneName);

    // Sécurité: vérifier que le chemin est dans BIND_ZONES_PATH
    if (!zonePath.startsWith(BIND_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    await fs.remove(zonePath);

    res.json({
      success: true,
      message: `Zone inverse ${zoneName} supprimée`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE - Supprimer un enregistrement PTR
app.delete('/api/reverse-zones/:zoneName/records/:recordId', async (req, res) => {
  try {
    const { zoneName, recordId } = req.params;

    // Valider le format de zone inverse
    if (!isValidReverseZone(zoneName)) {
      return res.status(400).json({
        success: false,
        error: 'Format de zone inverse invalide'
      });
    }

    const zonePath = path.join(BIND_ZONES_PATH, zoneName);

    // Sécurité: vérifier que le chemin est dans BIND_ZONES_PATH
    if (!zonePath.startsWith(BIND_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    let content = await fs.readFile(zonePath, 'utf-8');
    const records = parseReverseZoneFile(content);

    const newRecords = records.filter(r => r.id !== recordId);

    if (newRecords.length === records.length) {
      return res.status(404).json({
        success: false,
        error: 'Enregistrement non trouvé'
      });
    }

    const newContent = rebuildReverseZoneFile(content, newRecords);
    await fs.writeFile(zonePath, newContent);

    res.json({
      success: true,
      message: 'Enregistrement PTR supprimé'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 DNS Manager API running on port ${PORT}`);
  console.log(`📂 BIND9 zones path: ${BIND_ZONES_PATH}`);
});
