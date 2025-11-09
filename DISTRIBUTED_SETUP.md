# Configuration Distribuée - DNS Manager

Guide pour déployer le DNS Manager sur un serveur et gérer BIND9 sur d'autres serveurs.

## 📊 Architecture

```
┌──────────────────────────────┐
│  Serveur DNS Manager          │
│  (Frontend + Backend API)     │
│  IP: 10.0.0.100               │
│  Port: 80, 443, 3001          │
└────────────┬───────────────────┘
             │ SSH
    ┌────────┼────────┬──────────┐
    │        │        │          │
    │        │        │          │
┌───▼──┐ ┌──▼───┐ ┌──▼───┐ ┌──▼───┐
│BIND9 │ │BIND9 │ │BIND9 │ │BIND9 │
│Master│ │Slave1│ │Slave2│ │Slave3│
│:53   │ │:53   │ │:53   │ │:53   │
└──────┘ └──────┘ └──────┘ └──────┘
```

## 🚀 Déploiement

### Étape 1 : Serveur DNS Manager (avec Docker)

#### 1.1 Prérequis
```bash
# Sur le serveur DNS Manager
apt-get update && apt-get install -y docker.io docker-compose

# Vérifier l'installation
docker --version
docker-compose --version
```

#### 1.2 Cloner et configurer
```bash
# Cloner le projet
git clone https://github.com/azurtech56/Bind9-Web-UI.git /opt/dns-manager
cd /opt/dns-manager

# Copier l'environnement
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

#### 1.3 Configurer les serveurs distants

Éditez `backend/servers.config.json` :

```json
{
  "servers": [
    {
      "id": "bind9-master",
      "name": "BIND9 Master - Production",
      "host": "10.0.0.51",
      "port": 22,
      "username": "bind-admin",
      "sshKeyPath": "/etc/dns-manager/ssh-keys/bind9-master",
      "bindZonesPath": "/etc/bind/zones",
      "bindConfigPath": "/etc/bind/named.conf",
      "enabled": true,
      "description": "Serveur DNS master principal"
    },
    {
      "id": "bind9-slave1",
      "name": "BIND9 Slave 1 - Datacenter 1",
      "host": "10.0.0.52",
      "port": 22,
      "username": "bind-admin",
      "sshKeyPath": "/etc/dns-manager/ssh-keys/bind9-slave1",
      "bindZonesPath": "/etc/bind/zones",
      "bindConfigPath": "/etc/bind/named.conf",
      "enabled": true,
      "description": "Serveur DNS slave dans DC1"
    },
    {
      "id": "bind9-slave2",
      "name": "BIND9 Slave 2 - Datacenter 2",
      "host": "10.0.0.53",
      "port": 22,
      "username": "bind-admin",
      "sshKeyPath": "/etc/dns-manager/ssh-keys/bind9-slave2",
      "bindZonesPath": "/etc/bind/zones",
      "bindConfigPath": "/etc/bind/named.conf",
      "enabled": true,
      "description": "Serveur DNS slave dans DC2"
    }
  ]
}
```

#### 1.4 Gérer les clés SSH

```bash
# Créer le répertoire des clés
mkdir -p /etc/dns-manager/ssh-keys
chmod 700 /etc/dns-manager/ssh-keys

# Générer une clé SSH unique pour chaque serveur BIND9
ssh-keygen -t ed25519 -f /etc/dns-manager/ssh-keys/bind9-master \
  -N "" -C "dns-manager@bind9-master"
ssh-keygen -t ed25519 -f /etc/dns-manager/ssh-keys/bind9-slave1 \
  -N "" -C "dns-manager@bind9-slave1"
ssh-keygen -t ed25519 -f /etc/dns-manager/ssh-keys/bind9-slave2 \
  -N "" -C "dns-manager@bind9-slave2"

# Vérifier les clés
ls -la /etc/dns-manager/ssh-keys/
```

#### 1.5 Monter les clés dans Docker

Modifiez `docker-compose.yml` :

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: dns-manager-backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    volumes:
      # Monter les clés SSH
      - /etc/dns-manager/ssh-keys:/app/ssh-keys:ro
      # Monter la config serveurs
      - ./backend/servers.config.json:/app/servers.config.json:rw
    networks:
      - dns-network
    restart: unless-stopped
```

#### 1.6 Lancer l'application

```bash
# Construire les images
docker-compose build

# Démarrer l'application
docker-compose up -d

# Vérifier le statut
docker-compose ps
docker-compose logs -f backend
```

### Étape 2 : Configuration des serveurs BIND9

#### 2.1 Sur chaque serveur BIND9

```bash
# Installation de BIND9
apt-get update && apt-get install -y bind9 bind9-utils

# Créer l'utilisateur pour le DNS Manager
useradd -m -s /bin/bash bind-admin
usermod -a -G bind bind-admin

# Donner les permissions sur BIND9
chown -R bind:bind /etc/bind/
chmod -R 755 /etc/bind/zones
chmod -R 755 /var/lib/bind

# Autoriser bind-admin à lire/modifier les fichiers
setfacl -R -m u:bind-admin:rwx /etc/bind/zones/
setfacl -R -m u:bind-admin:rwx /var/lib/bind/
```

#### 2.2 Configurer SSH pour bind-admin

```bash
# Créer le répertoire SSH
mkdir -p /home/bind-admin/.ssh
chmod 700 /home/bind-admin/.ssh

# Sur le serveur DNS Manager, copier les clés publiques
for server in bind9-master bind9-slave1 bind9-slave2; do
  cat /etc/dns-manager/ssh-keys/$server.pub >> /home/bind-admin/.ssh/authorized_keys
done

# Définir les permissions
chmod 600 /home/bind-admin/.ssh/authorized_keys
chown -R bind-admin:bind-admin /home/bind-admin/.ssh/
```

#### 2.3 Tester la connexion SSH

```bash
# Depuis le serveur DNS Manager
ssh -i /etc/dns-manager/ssh-keys/bind9-master bind-admin@10.0.0.51 "ls /etc/bind/zones"
```

#### 2.4 Configurer BIND9 pour la réplication (optionnel)

**Sur le serveur MASTER** (`/etc/bind/named.conf.local`) :

```bind
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";

    // Autoriser les transferts aux serveurs slaves
    allow-transfer {
        10.0.0.52;  // Slave 1
        10.0.0.53;  // Slave 2
    };

    // Notifier les slaves de la mise à jour
    notify yes;
    also-notify {
        10.0.0.52;
        10.0.0.53;
    };
};
```

**Sur les serveurs SLAVES** (`/etc/bind/named.conf.local`) :

```bind
zone "example.com" {
    type slave;
    masters { 10.0.0.51; };  // IP du master
    file "/var/lib/bind/db.example.com";
};
```

**Redémarrer BIND9** :

```bash
systemctl restart bind9
systemctl status bind9
```

## 🔐 Sécurité - Bonnes pratiques

### 1. Restreindre SSH

**Sur chaque serveur BIND9**, modifier `/etc/ssh/sshd_config` :

```bash
# Restreindre SSH à l'utilisateur bind-admin
AllowUsers bind-admin

# Désactiver l'authentification par mot de passe
PasswordAuthentication no
PubkeyAuthentication yes

# Désactiver root login
PermitRootLogin no

# Limiter les tentatives
MaxAuthTries 3
MaxSessions 2

# Limiter les connexions par IP
Match Address 10.0.0.100
    AllowUsers bind-admin
    PasswordAuthentication no
```

Redémarrer SSH :
```bash
systemctl restart ssh
```

### 2. Firewall - Restreindre les accès

**Sur chaque serveur BIND9** :

```bash
# UFW
ufw allow from 10.0.0.100 to any port 22  # SSH depuis DNS Manager
ufw allow 53/tcp                            # DNS TCP
ufw allow 53/udp                            # DNS UDP
ufw enable

# iptables
iptables -A INPUT -s 10.0.0.100 -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 53 -j ACCEPT
iptables -A INPUT -p udp --dport 53 -j ACCEPT
iptables -P INPUT DROP
```

### 3. Audit et Logs

```bash
# Sur le serveur DNS Manager
docker logs dns-manager-backend | tail -100

# Sur chaque serveur BIND9
journalctl -u ssh -f  # Logs SSH
tail -f /var/log/syslog | grep named  # Logs BIND9
```

### 4. Sauvegardes

```bash
# Sauvegarder les zones BIND9
backup_script="/opt/backup-bind9.sh"
cat > $backup_script <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/bind9"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/zones-$(date +%Y%m%d-%H%M%S).tar.gz /etc/bind/zones/
find $BACKUP_DIR -type f -mtime +30 -delete  # Garder 30 jours
EOF

chmod +x $backup_script

# Ajouter au cron
0 2 * * * /opt/backup-bind9.sh
```

## 📋 Checklist de déploiement

- [ ] Serveur DNS Manager préparé avec Docker
- [ ] Clés SSH générées et configurées
- [ ] Serveurs BIND9 préparés
- [ ] Utilisateur bind-admin créé et autorisé
- [ ] Connexion SSH testée depuis DNS Manager
- [ ] DNS Manager lancé avec `docker-compose up -d`
- [ ] Interface web accessible : `http://<dns-manager-ip>:3000`
- [ ] Serveurs visibles dans l'interface
- [ ] Zones créées et répliquées
- [ ] Tests DNS effectués : `dig @<dns-server-ip> example.com`

## 🧪 Tests et validation

### Test 1 : Connectivité

```bash
# Depuis le serveur DNS Manager
ping 10.0.0.51
ping 10.0.0.52
ping 10.0.0.53

# SSH vers chaque serveur
ssh -i /etc/dns-manager/ssh-keys/bind9-master bind-admin@10.0.0.51 "uname -a"
```

### Test 2 : Accès BIND9

```bash
# Vérifier que l'utilisateur peut lire les zones
ssh -i /etc/dns-manager/ssh-keys/bind9-master bind-admin@10.0.0.51 \
  "ls -la /etc/bind/zones/"
```

### Test 3 : Interface web

```bash
# Accéder à http://<dns-manager-ip>:3000
# - Ajouter les serveurs
# - Créer une zone
# - Vérifier la réplication
```

### Test 4 : DNS queries

```bash
# Tester les serveurs DNS
dig @10.0.0.51 example.com
dig @10.0.0.52 example.com
dig @10.0.0.53 example.com
```

## 🐛 Dépannage

### Erreur : "Permission denied" sur les fichiers BIND9

```bash
# Sur le serveur BIND9
sudo chown -R bind:bind /etc/bind/zones
sudo chmod -R 755 /etc/bind/zones
sudo setfacl -R -m u:bind-admin:rwx /etc/bind/zones/
```

### Erreur : SSH connexion refusée

```bash
# Vérifier que SSH est actif
sudo systemctl status ssh

# Vérifier les logs SSH
sudo journalctl -u ssh -n 50

# Vérifier les permissions des clés
ls -la /etc/dns-manager/ssh-keys/
```

### Zones non synchronisées entre Master et Slaves

```bash
# Sur le master, forcer la notification
rndc notify example.com

# Sur les slaves, vérifier les transfers
tail -f /var/log/syslog | grep "Transfer of zone"
```

### L'interface web n'affiche pas les zones

```bash
# Vérifier les logs du backend
docker logs dns-manager-backend

# Tester l'API
curl http://localhost:3001/api/servers
curl http://localhost:3001/api/servers/bind9-master/zones
```

## 📈 Monitoring et maintenance

### Monitoring avec Prometheus (optionnel)

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'dns-manager'
    static_configs:
      - targets: ['10.0.0.100:3001']
```

### Backup automatique des configurations

```bash
# Créer un job cron
0 * * * * docker exec dns-manager-backend \
  tar -czf /app/backups/zones-$(date +\%Y\%m\%d-\%H\%M\%S).tar.gz \
  /etc/bind/zones/
```

---

**Pour des questions**, consultez [MULTI_SERVER_SETUP.md](MULTI_SERVER_SETUP.md) pour les détails techniques.
