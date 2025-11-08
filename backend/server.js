import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Configuration des chemins BIND9
const BIND9_ZONES_PATH = process.env.BIND9_ZONES_PATH || '/etc/bind/zones';
const BIND9_CONFIG_PATH = process.env.BIND9_CONFIG_PATH || '/etc/bind/named.conf';

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// ROUTES API
// ============================================

// GET - Lister toutes les zones DNS
app.get('/api/zones', async (req, res) => {
  try {
    const files = await fs.readdir(BIND9_ZONES_PATH);
    const zones = files
      .filter(f => !f.startsWith('.') && !f.endsWith('.jnl'))
      .map(zone => ({
        name: zone,
        path: path.join(BIND9_ZONES_PATH, zone)
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

// GET - Récupérer les détails d'une zone (enregistrements DNS)
app.get('/api/zones/:zoneName', async (req, res) => {
  try {
    const { zoneName } = req.params;
    const zonePath = path.join(BIND9_ZONES_PATH, zoneName);

    // Vérifier que le fichier existe et est dans le répertoire autorisé
    if (!zonePath.startsWith(BIND9_ZONES_PATH)) {
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

// POST - Créer une nouvelle zone
app.post('/api/zones', async (req, res) => {
  try {
    const { zoneName, soaEmail, serial } = req.body;

    if (!zoneName || !soaEmail) {
      return res.status(400).json({
        success: false,
        error: 'zoneName et soaEmail requis'
      });
    }

    const zonePath = path.join(BIND9_ZONES_PATH, zoneName);

    // Vérifier que la zone n'existe pas
    if (await fs.pathExists(zonePath)) {
      return res.status(400).json({
        success: false,
        error: 'La zone existe déjà'
      });
    }

    // Créer le fichier de zone avec structure de base
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
      message: `Zone ${zoneName} créée avec succès`,
      data: { zoneName }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT - Modifier un enregistrement DNS
app.put('/api/zones/:zoneName/records/:recordId', async (req, res) => {
  try {
    const { zoneName, recordId } = req.params;
    const { name, type, value, ttl } = req.body;

    const zonePath = path.join(BIND9_ZONES_PATH, zoneName);

    if (!zonePath.startsWith(BIND9_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    let content = await fs.readFile(zonePath, 'utf-8');
    const records = parseZoneFile(content);

    // Trouver et modifier l'enregistrement
    const recordIndex = records.findIndex(r => r.id === recordId);
    if (recordIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Enregistrement non trouvé'
      });
    }

    records[recordIndex] = {
      ...records[recordIndex],
      name: name || records[recordIndex].name,
      type: type || records[recordIndex].type,
      value: value || records[recordIndex].value,
      ttl: ttl || records[recordIndex].ttl
    };

    // Reconstruire le fichier de zone
    const newContent = rebuildZoneFile(content, records);
    await fs.writeFile(zonePath, newContent);

    res.json({
      success: true,
      message: 'Enregistrement modifié avec succès',
      data: records[recordIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST - Ajouter un enregistrement DNS
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

    const zonePath = path.join(BIND9_ZONES_PATH, zoneName);

    if (!zonePath.startsWith(BIND9_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    let content = await fs.readFile(zonePath, 'utf-8');
    const lines = content.split('\n');

    // Ajouter le nouvel enregistrement avant la dernière ligne
    const newRecord = `${name.padEnd(20)} IN  ${type.padEnd(10)} ${value}`;
    lines.splice(lines.length - 1, 0, newRecord);

    await fs.writeFile(zonePath, lines.join('\n'));

    res.json({
      success: true,
      message: 'Enregistrement ajouté avec succès',
      data: { name, type, value, ttl }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE - Supprimer un enregistrement DNS
app.delete('/api/zones/:zoneName/records/:recordId', async (req, res) => {
  try {
    const { zoneName, recordId } = req.params;
    const zonePath = path.join(BIND9_ZONES_PATH, zoneName);

    if (!zonePath.startsWith(BIND9_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    let content = await fs.readFile(zonePath, 'utf-8');
    const records = parseZoneFile(content);

    // Supprimer l'enregistrement
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
      message: 'Enregistrement supprimé avec succès'
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
    const zonePath = path.join(BIND9_ZONES_PATH, zoneName);

    if (!zonePath.startsWith(BIND9_ZONES_PATH)) {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    await fs.remove(zonePath);

    res.json({
      success: true,
      message: `Zone ${zoneName} supprimée avec succès`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// UTILITAIRES
// ============================================

// Parser simple pour les fichiers de zone DNS
function parseZoneFile(content) {
  const lines = content.split('\n');
  const records = [];
  let id = 0;

  lines.forEach(line => {
    line = line.trim();

    // Ignorer les commentaires et lignes vides
    if (!line || line.startsWith(';') || line.startsWith('$')) {
      return;
    }

    // Ignorer les blocs SOA multi-lignes
    if (line.includes('SOA') && !line.includes(';')) {
      return;
    }

    const parts = line.split(/\s+/);
    if (parts.length >= 4) {
      const [name, , type, value] = parts;

      // Vérifier que c'est un type DNS valide
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

// Reconstruire le fichier de zone
function rebuildZoneFile(originalContent, records) {
  const lines = originalContent.split('\n');
  const newLines = [];

  // Garder le header (SOA, NS, etc.)
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

  // Ajouter les nouveaux enregistrements
  records.forEach(record => {
    newLines.push(
      `${record.name.padEnd(20)} IN  ${record.type.padEnd(10)} ${record.value}`
    );
  });

  return newLines.join('\n');
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 DNS Manager API running on port ${PORT}`);
  console.log(`BIND9 zones path: ${BIND9_ZONES_PATH}`);
});
