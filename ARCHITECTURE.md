# Architecture - DNS Manager Multi-Serveurs

## Vue d'ensemble

DNS Manager est une application web permettant de gérer **plusieurs serveurs BIND9 distants** depuis une interface centralisée.

```
┌─────────────────────────────────────────────────────┐
│              Interface Web (Navigateur)             │
│              http://dns-manager:3000                │
└──────────────────────┬──────────────────────────────┘
                       │
            ┌──────────▼──────────┐
            │   Frontend React    │
            │   (Vite Build)      │
            │  Port 3000/80       │
            └──────────┬──────────┘
                       │
    ┌──────────────────▼──────────────────┐
    │      Backend API (Node.js)          │
    │      Express Server                 │
    │      Port 3001                      │
    │                                     │
    │  - REST API                         │
    │  - SSH Client                       │
    │  - Config Manager                   │
    └──────┬────────┬─────────┬──────────┘
           │        │         │
        SSH│     SSH│      SSH│
           │        │         │
    ┌──────▼──┐ ┌───▼──┐ ┌───▼──┐
    │ BIND9   │ │BIND9 │ │BIND9 │
    │ Master  │ │Slave1│ │Slave2│
    │10.0.0.51│ │10.0..│ │10.0..│
    │:53      │ │:53   │ │:53   │
    └─────────┘ └──────┘ └──────┘
```

## Composants

### 1. Frontend (React + Vite)

**Responsabilités :**
- Interface utilisateur responsive
- Sélection des serveurs
- Gestion des zones et enregistrements
- Affichage en temps réel

**Technologie :**
- React 18
- Vite (build tool)
- Axios (HTTP client)
- CSS vanilla

**Déploiement :**
- Build: `npm run build`
- Output: `dist/`
- Servi par: Nginx (dans Docker)

### 2. Backend (Node.js + Express)

**Responsabilités :**
- REST API pour la gestion des serveurs
- Gestion des connexions SSH
- Parsing et manipulation des fichiers de zones
- Validation et sécurité

**Composants clés :**

#### server.js
- Serveur Express principal
- Routes API
- Intégration des managers

#### serversManager.js
- Charge/sauvegarde la configuration
- Gestion du cycle de vie des serveurs
- Validation des configurations

#### sshManager.js
- Établit les connexions SSH
- Gère l'authentification par clé
- Lecture/écriture de fichiers distants
- Exécution de commandes

#### servers.config.json
- Configuration des serveurs BIND9
- Définition des chemins d'accès
- Authentification SSH

**API Endpoints :**

```
GET    /api/servers                    # Lister tous les serveurs
POST   /api/servers                    # Ajouter un serveur
GET    /api/servers/{id}               # Détails d'un serveur
PUT    /api/servers/{id}               # Modifier un serveur
DELETE /api/servers/{id}               # Supprimer un serveur
POST   /api/servers/{id}/test          # Tester la connexion

GET    /api/servers/{id}/zones         # Zones du serveur
POST   /api/servers/{id}/zones         # Créer une zone
GET    /api/servers/{id}/zones/{name}  # Détails zone
DELETE /api/servers/{id}/zones/{name}  # Supprimer zone

POST   /api/servers/{id}/zones/{name}/records   # Ajouter enregistrement
DELETE /api/servers/{id}/zones/{name}/records/{rid}  # Supprimer enregistrement
```

### 3. Nginx (Reverse Proxy)

**Responsabilités :**
- Proxy vers le frontend (port 3000)
- Proxy vers le backend (port 3001)
- SSL/TLS (optionnel)
- Load balancing (futur)

### 4. Docker Compose

**Services :**
- **frontend** : React app + Nginx
- **backend** : Node.js API
- **nginx** : Reverse proxy

**Volumes :**
- Clés SSH : `/etc/dns-manager/ssh-keys`
- Configuration : `servers.config.json`

## Flux de données

### Exemple : Créer une zone

```
1. Utilisateur → Interface web
   └─ Click: "Nouvelle zone"

2. Frontend → API Backend
   └─ POST /api/servers/{id}/zones

3. Backend → SSHManager
   └─ Connect SSH
   └─ Create zone file
   └─ Close SSH

4. Serveur BIND9
   └─ Zone file créé
   └─ Zone chargée par BIND9

5. Backend → Frontend
   └─ Retour succès/erreur

6. Frontend → Utilisateur
   └─ Affiche la zone
```

## Sécurité

### Authentification SSH

```
┌─────────────────────┐
│ Serveur DNS Manager │
│                     │
│ /etc/dns-manager/   │
│ ssh-keys/           │
│ ├─ bind9-master     │ ◄─┐
│ ├─ bind9-slave1     │   │ Clés privées
│ └─ bind9-slave2     │ ◄─┘
└─────────────────────┘
         │ SSH
         ▼
┌─────────────────────┐
│   Serveur BIND9     │
│                     │
│ /home/bind-admin/   │
│ .ssh/               │
│ authorized_keys ◄───┼─── Clés publiques
└─────────────────────┘
```

### Validation

- ✅ Validation des chemins (pas de traversal)
- ✅ Authentification SSH par clé obligatoire
- ✅ Gestion des erreurs SSH
- ✅ Logs d'accès

### Restrictions recommandées

- Firewall : SSH depuis DNS Manager uniquement
- SSH : authentification par clé seulement
- BIND9 : utilisateur dédié bind-admin
- ACL : limiter les permissions sur les fichiers

## Déploiement

### Option 1 : Docker Compose (Recommandé)

```bash
docker-compose up -d
# → DNS Manager accessible sur http://localhost:3000
```

### Option 2 : Développement

```bash
# Terminal 1
cd backend && npm install && npm run dev

# Terminal 2
cd frontend && npm install && npm run dev
```

### Option 3 : Production

```bash
# Build Docker
docker-compose build --no-cache

# Push vers registry
docker tag dns-manager:latest registry/dns-manager:latest
docker push registry/dns-manager:latest

# Déployer
docker-compose up -d
```

## Monitoring

### Logs

```bash
# Backend
docker logs -f dns-manager-backend

# Frontend
docker logs -f dns-manager-frontend

# Nginx
docker logs -f dns-manager-nginx
```

### Santé de l'application

```bash
# Health check
curl http://localhost:3001/health

# Vérifier les serveurs
curl http://localhost:3001/api/servers

# Test SSH
curl -X POST http://localhost:3001/api/servers/{id}/test
```

## Scalabilité

### Horizontal

```
LB (Load Balancer)
├─ DNS Manager #1
├─ DNS Manager #2
└─ DNS Manager #3
```

### Vertical

- Augmenter les ressources Docker
- Optimiser la base de données (future)
- Cache (future)

## Roadmap

### V2.0
- [ ] Authentification des utilisateurs (JWT)
- [ ] Base de données (PostgreSQL)
- [ ] Audit logging
- [ ] DNSSEC support
- [ ] Zone transfer automatique
- [ ] Monitoring intégré

### V2.5
- [ ] API GraphQL
- [ ] WebSocket pour updates en temps réel
- [ ] Terraform provider
- [ ] Kubernetes deployment

### V3.0
- [ ] Multi-tenancy
- [ ] SaaS offering
- [ ] Analytics
- [ ] Machine learning pour optimization

## Support et Documentation

- [README.md](README.md) - Guide général
- [QUICK_START.md](QUICK_START.md) - Démarrage rapide
- [MULTI_SERVER_SETUP.md](MULTI_SERVER_SETUP.md) - Multi-serveurs
- [DISTRIBUTED_SETUP.md](DISTRIBUTED_SETUP.md) - Architecture distribuée

## Contact

Pour les questions, consultez la documentation ou ouvrez une issue GitHub.
