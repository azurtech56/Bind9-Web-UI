# DNS Manager - Interface Web BIND9

Interface web moderne et intuitive pour gérer vos zones BIND9 DNS sous Linux.

## 🚀 Caractéristiques

✅ **Gestion complète des zones DNS**
- Créer et supprimer des zones
- Ajouter/modifier/supprimer des enregistrements DNS

✅ **Types d'enregistrements supportés**
- A (IPv4)
- AAAA (IPv6)
- CNAME
- MX
- NS
- TXT
- SRV

✅ **Architecture containerisée**
- Backend Node.js/Express
- Frontend React
- Nginx Reverse Proxy
- Déploiement facile avec Docker Compose

✅ **Interface intuitive**
- Dashboard responsive
- Gestion des zones par panneaux
- Validation des enregistrements

## 📋 Prérequis

- **Docker** (v20.10+)
- **Docker Compose** (v1.29+)
- **BIND9** installé et configuré sur le serveur hôte
- **Droits d'accès** aux fichiers de BIND9 (`/etc/bind/zones`)

## 🔧 Installation

### 1. Cloner/Télécharger le projet

```bash
cd /path/to/dns-manager
```

### 2. Configurer les permissions BIND9

```bash
# S'assurer que le conteneur peut accéder aux fichiers BIND9
sudo chown -R 1000:1000 /etc/bind/zones
sudo chmod -R 755 /etc/bind/zones
```

### 3. Démarrer avec Docker Compose

```bash
docker-compose up -d
```

### 4. Accéder à l'interface

- **Frontend** : http://localhost:3000
- **API Backend** : http://localhost:3001
- **Reverse Proxy** : http://localhost

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│          Navigateur Web (Port 80/3000)         │
├─────────────────────────────────────────────────┤
│              Nginx Reverse Proxy                │
├──────────────────┬──────────────────────────────┤
│   Frontend React │       Backend API            │
│   (Port 3000)    │     (Port 3001)              │
├──────────────────┼──────────────────────────────┤
│      dist/       │  Node.js / Express           │
│    (React App)   │  Fichiers BIND9              │
└──────────────────┴──────────────────────────────┘
         │                    │
         └────────┬───────────┘
                  │
          ┌───────▼────────┐
          │  BIND9 Server  │
          │  /etc/bind/    │
          │  /var/lib/bind/│
          └────────────────┘
```

## 📝 API Endpoints

### Zones

```bash
# Récupérer toutes les zones
GET /api/zones

# Récupérer les détails d'une zone
GET /api/zones/{zoneName}

# Créer une nouvelle zone
POST /api/zones
# Body: { zoneName: "exemple.com", soaEmail: "admin@exemple.com" }

# Supprimer une zone
DELETE /api/zones/{zoneName}
```

### Enregistrements

```bash
# Ajouter un enregistrement
POST /api/zones/{zoneName}/records
# Body: { name: "www", type: "A", value: "192.168.1.1", ttl: 3600 }

# Modifier un enregistrement
PUT /api/zones/{zoneName}/records/{recordId}
# Body: { name: "www", type: "A", value: "192.168.1.2", ttl: 3600 }

# Supprimer un enregistrement
DELETE /api/zones/{zoneName}/records/{recordId}
```

## 🔒 Sécurité

### Recommandations

1. **HTTPS en production** : Configurer les certificats SSL/TLS
2. **Authentification** : Ajouter une couche d'authentification (JWT, OAuth)
3. **Validation** : Toutes les entrées sont validées côté serveur
4. **Permissions** : Limiter l'accès aux fichiers BIND9
5. **Firewall** : Restreindre l'accès à l'interface web (IP whitelist)

### Configuration HTTPS (Production)

1. Obtenir un certificat (Let's Encrypt)
```bash
certbot certonly --standalone -d dns-manager.example.com
```

2. Mettre à jour `docker-compose.yml` :
```yaml
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

3. Modifier `nginx/nginx.conf` pour HTTPS

## 🐛 Dépannage

### Le conteneur ne démarre pas

```bash
# Vérifier les logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Erreur de permissions sur BIND9

```bash
# Vérifier les permissions
ls -la /etc/bind/zones

# Corriger les permissions
sudo chmod 755 /etc/bind/zones
sudo chown -R root:bind /etc/bind/zones
```

### L'API ne peut pas accéder aux fichiers BIND9

Vérifier que les volumes sont montés correctement :
```bash
docker-compose exec backend ls -la /etc/bind/
```

### La base de données est verrouillée

BIND9 peut verrouiller les fichiers. Redémarrer BIND9 :
```bash
sudo systemctl restart bind9
```

## 📦 Fichiers du projet

```
dns-manager/
├── docker-compose.yml        # Orchestration Docker
├── README.md                 # Cette documentation
│
├── backend/
│   ├── Dockerfile            # Image Docker Node.js
│   ├── package.json          # Dépendances npm
│   ├── server.js             # Serveur Express principal
│   └── .env.example          # Variables d'environnement
│
├── frontend/
│   ├── Dockerfile            # Image Docker React/Vite
│   ├── package.json          # Dépendances npm
│   ├── vite.config.js        # Config Vite
│   ├── index.html            # HTML principal
│   └── src/
│       ├── main.jsx          # Point d'entrée React
│       ├── App.jsx           # Composant principal
│       ├── styles.css        # Styles globaux
│       └── components/
│           ├── ZoneList.jsx
│           ├── ZoneDetails.jsx
│           ├── ZoneForm.jsx
│           ├── RecordList.jsx
│           └── RecordForm.jsx
│
└── nginx/
    ├── Dockerfile            # Image Nginx
    └── nginx.conf            # Configuration Nginx
```

## 🚀 Déploiement en Production

### Sur un VPS/Serveur Linux

```bash
# 1. Cloner le repo
git clone https://github.com/votre-repo/dns-manager.git
cd dns-manager

# 2. Configurer les variables d'environnement
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Démarrer avec Docker Compose
docker-compose up -d

# 4. Vérifier le statut
docker-compose ps
docker-compose logs -f
```

### Mise à jour

```bash
# Récupérer les nouvelles versions
git pull origin main

# Rebuild et restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📚 Documentation supplémentaire

- [BIND9 Documentation](https://www.isc.org/bind/)
- [Docker Documentation](https://docs.docker.com/)
- [React Documentation](https://react.dev/)
- [Express.js Documentation](https://expressjs.com/)

## 📄 Licence

MIT License

## 🤝 Contribution

Les contributions sont bienvenues! Merci de:
1. Fork le projet
2. Créer une branche pour votre feature
3. Commit vos changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 💬 Support

Pour les questions ou problèmes, créez une issue sur GitHub.

---

**Développé avec ❤️ pour simplifier la gestion de BIND9**
