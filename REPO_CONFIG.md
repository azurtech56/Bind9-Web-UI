# Configuration du Repository

## 📍 Repository GitHub

**URL du projet:** `https://github.com/azurtech56/dns-manager.git`

### Si vous avez un repository différent

Remplacez `https://github.com/azurtech56/dns-manager.git` par votre URL dans les fichiers suivants :

```bash
# Fichiers à mettre à jour:
- README.md (ligne 224)
- QUICK_START.md (ligne 16)
- DISTRIBUTED_SETUP.md (ligne 42)
- READY_TO_DEPLOY.md (ligne 22)
```

### Commandes de clone

**Avec HTTPS:**
```bash
git clone https://github.com/azurtech56/dns-manager.git /opt/dns-manager
```

**Avec SSH (si clé SSH configurée):**
```bash
git clone git@github.com:azurtech56/dns-manager.git /opt/dns-manager
```

**Avec token (pour private repo):**
```bash
git clone https://username:token@github.com/azurtech56/dns-manager.git /opt/dns-manager
```

## 📋 Informations du Repository

| Info | Valeur |
|------|--------|
| **Propriétaire** | azurtech56 |
| **Nom du repo** | dns-manager |
| **URL HTTP** | https://github.com/azurtech56/dns-manager.git |
| **URL SSH** | git@github.com:azurtech56/dns-manager.git |
| **Branche principale** | main (ou master) |
| **Licence** | MIT |

## 🔄 Mises à jour

Pour mettre à jour depuis le repository :

```bash
cd /opt/dns-manager
git fetch origin
git pull origin main  # ou master
docker-compose build --no-cache
docker-compose up -d
```

## 🚀 Pousser des changements

```bash
git add .
git commit -m "Description du changement"
git push origin main
```

---

**Note:** Si vous utilisez un fork ou un repository différent, mettez à jour cette configuration.
