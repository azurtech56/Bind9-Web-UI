# Configuration Multi-Serveurs - DNS Manager

Guide complet pour configurer et gérer plusieurs serveurs BIND9 à partir d'une seule interface.

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Configuration des serveurs](#configuration-des-serveurs)
3. [Authentification SSH](#authentification-ssh)
4. [Utilisation](#utilisation)
5. [Dépannage](#dépannage)

## Vue d'ensemble

Le DNS Manager supporte maintenant la gestion de **plusieurs serveurs BIND9** en parallèle :

- **Serveurs locaux** : Accès direct aux fichiers (`localhost`)
- **Serveurs distants** : Accès via SSH avec authentification par clé

### Architecture

```
┌─────────────────────────────────┐
│      Interface Web Centralisée   │
│     (Frontend React/Vite)        │
└────────────────┬────────────────┘
                 │
         ┌───────▼────────┐
         │   Backend API  │
         │   (Node.js)    │
         └───────┬────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
  Server1     Server2     Server3
  (Local)     (Remote)    (Remote)
BIND9/zones   SSH/BIND9   SSH/BIND9
```

## Configuration des serveurs

### 1. Éditer le fichier de configuration

Modifiez `backend/servers.config.json` :

```json
{
  "servers": [
    {
      "id": "master-dns",
      "name": "Serveur DNS Master",
      "host": "localhost",
      "port": 22,
      "username": "root",
      "bindZonesPath": "/etc/bind/zones",
      "bindConfigPath": "/etc/bind/named.conf",
      "enabled": true,
      "description": "Serveur master en production"
    },
    {
      "id": "secondary-dns-1",
      "name": "Serveur DNS Secondaire 1",
      "host": "192.168.1.20",
      "port": 22,
      "username": "bind",
      "sshKeyPath": "/home/user/.ssh/id_rsa",
      "bindZonesPath": "/etc/bind/zones",
      "bindConfigPath": "/etc/bind/named.conf",
      "enabled": true,
      "description": "Serveur slave en datacenter 1"
    },
    {
      "id": "secondary-dns-2",
      "name": "Serveur DNS Secondaire 2",
      "host": "10.0.0.5",
      "port": 2222,
      "username": "dnsadmin",
      "sshKeyPath": "/home/user/.ssh/backup_key",
      "bindZonesPath": "/var/named/zones",
      "bindConfigPath": "/etc/named.conf",
      "enabled": true,
      "description": "Serveur backup en datacenter 2"
    }
  ]
}
```

### Configuration requise pour chaque serveur

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `id` | string | ✅ | Identifiant unique du serveur |
| `name` | string | ✅ | Nom lisible du serveur |
| `host` | string | ✅ | IP ou domaine (localhost pour local) |
| `port` | number | ❌ | Port SSH (défaut: 22) |
| `username` | string | ❌ | Utilisateur SSH (défaut: root) |
| `sshKeyPath` | string | ❌ | Chemin vers la clé SSH |
| `password` | string | ❌ | Mot de passe SSH (non recommandé) |
| `bindZonesPath` | string | ❌ | Chemin des zones BIND9 (défaut: /etc/bind/zones) |
| `bindConfigPath` | string | ❌ | Chemin config BIND9 (défaut: /etc/bind/named.conf) |
| `enabled` | boolean | ❌ | Activer/désactiver le serveur |
| `description` | string | ❌ | Description du serveur |

## Authentification SSH

### Configuration recommandée : Clé SSH

**1. Générer une clé SSH (sur votre serveur DNS Manager)**

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/dns-manager -C "dns-manager"
```

**2. Copier la clé publique sur les serveurs distants**

```bash
# Pour chaque serveur BIND9 distant
ssh-copy-id -i ~/.ssh/dns-manager.pub user@remote-server

# Ou manuellement:
cat ~/.ssh/dns-manager.pub | ssh user@remote-server 'cat >> ~/.ssh/authorized_keys'
```

**3. Configurer les permissions**

```bash
# Sur les serveurs distants
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

**4. Ajouter la clé au serveur.config.json**

```json
{
  "id": "remote-server",
  "host": "192.168.1.10",
  "sshKeyPath": "/home/dns-manager/.ssh/dns-manager",
  ...
}
```

**5. Vérifier la connexion**

```bash
ssh -i ~/.ssh/dns-manager user@remote-server "ls /etc/bind/zones"
```

### Configuration alternative : Mot de passe (⚠️ moins sécurisé)

```json
{
  "id": "remote-server",
  "host": "192.168.1.10",
  "password": "your-ssh-password",
  ...
}
```

## Utilisation

### Via l'interface web

**1. Ajouter un serveur**

- Cliquez sur "➕ Ajouter un serveur"
- Remplissez les informations du serveur
- Cliquez sur "✅ Ajouter le serveur"

**2. Tester la connexion**

- Dans la liste des serveurs, cliquez sur le serveur
- Le système teste automatiquement la connexion SSH

**3. Gérer les zones**

- Sélectionnez un serveur
- Cliquez sur "➕ Nouvelle zone"
- Les zones du serveur sélectionné s'affichent

**4. Gérer les enregistrements**

- Sélectionnez une zone
- Cliquez sur "➕ Ajouter un enregistrement"
- Les modifications sont appliquées au serveur sélectionné

### Via l'API

**Récupérer tous les serveurs**

```bash
curl http://localhost:3001/api/servers
```

**Ajouter un serveur**

```bash
curl -X POST http://localhost:3001/api/servers \
  -H "Content-Type: application/json" \
  -d '{
    "id": "new-server",
    "name": "Nouveau Serveur",
    "host": "192.168.1.30",
    "username": "root",
    "bindZonesPath": "/etc/bind/zones"
  }'
```

**Tester la connexion**

```bash
curl -X POST http://localhost:3001/api/servers/server-id/test
```

**Récupérer les zones d'un serveur**

```bash
curl http://localhost:3001/api/servers/server-id/zones
```

**Créer une zone**

```bash
curl -X POST http://localhost:3001/api/servers/server-id/zones \
  -H "Content-Type: application/json" \
  -d '{
    "zoneName": "example.com",
    "soaEmail": "admin@example.com"
  }'
```

## Dépannage

### Erreur: "Pas de connexion SSH établie"

**Cause** : La clé SSH n'est pas trouvée ou les permissions sont incorrectes

**Solution** :
```bash
# Vérifier le chemin de la clé
ls -la ~/.ssh/dns-manager

# Vérifier les permissions
chmod 600 ~/.ssh/dns-manager
chmod 700 ~/.ssh
```

### Erreur: "Permission denied (publickey)"

**Cause** : La clé publique n'est pas autorisée sur le serveur distant

**Solution** :
```bash
# Sur le serveur distant
ssh-copy-id -i ~/.ssh/dns-manager.pub user@remote

# Vérifier les permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Erreur: "ECONNREFUSED" ou "Connection refused"

**Cause** : Le serveur est inaccessible ou SSH n'est pas actif

**Solution** :
```bash
# Vérifier la connectivité
ping 192.168.1.10

# Vérifier SSH
ssh -v user@192.168.1.10 "echo test"

# Vérifier que BIND9 existe
ssh user@192.168.1.10 "ls /etc/bind/zones"
```

### Les fichiers BIND9 ne sont pas modifiables

**Cause** : L'utilisateur SSH n'a pas les permissions

**Solution** :
```bash
# Sur le serveur distant
sudo chown -R bind:bind /etc/bind/zones
sudo chmod -R 755 /etc/bind/zones

# Ou autoriser l'utilisateur SSH
sudo usermod -a -G bind username
```

### La zone n'apparaît pas après sa création

**Cause** : BIND9 doit être redémarré ou reloadé

**Solution** :
```bash
# Sur le serveur distant
sudo systemctl restart bind9
# ou
sudo rndc reload
```

## Bonnes pratiques de sécurité

### 1. **Utiliser une clé SSH dédiée**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/dns-manager -C "dns-manager"
```

### 2. **Limiter les accès SSH**

```bash
# Dans /etc/ssh/sshd_config du serveur distant
AllowUsers dns-manager
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

### 3. **Restreindre les commandes SSH**

```bash
# Dans ~/.ssh/authorized_keys du serveur distant
command="cd /etc/bind/zones && /usr/bin/test -d .",restrict ssh-ed25519 ...
```

### 4. **Protéger le fichier de configuration**

```bash
# Sur le serveur DNS Manager
chmod 600 backend/servers.config.json
chown dnsmanager:dnsmanager backend/servers.config.json
```

### 5. **Monitorer les connexions**

```bash
# Vérifier les logs SSH
ssh user@remote-server "sudo tail -f /var/log/auth.log | grep sshd"
```

## Architecture réseau recommandée

```
┌─────────────────────────────────────┐
│      DNS Manager (le serveur)       │
│    (Backend API + Frontend)         │
│    IP: 192.168.1.5                  │
└────────────────┬────────────────────┘
                 │
         ┌───────┴─────────┐
         │                 │
    ┌────▼──────┐   ┌──────▼────┐
    │ BIND9 #1  │   │ BIND9 #2  │
    │ (Master)  │   │ (Slave)   │
    │ 192.168..│   │ 192.168..│
    │ Port 53  │   │ Port 53  │
    └─────┬────┘   └──────┬───┘
          │               │
          └───────┬───────┘
                  │
            ┌─────▼──────┐
            │ Firewall   │
            │ Rules      │
            └────────────┘
```

### Firewall (iptables)

```bash
# Autoriser SSH depuis le serveur DNS Manager
iptables -A INPUT -s 192.168.1.5 -p tcp --dport 22 -j ACCEPT

# Restreindre SSH à une plage
iptables -A INPUT -p tcp --dport 22 -j DROP
iptables -I INPUT -p tcp --dport 22 -s 192.168.1.0/24 -j ACCEPT
```

## Synchronisation multi-serveurs

Pour maintenir les zones synchronisées entre serveurs :

### Option 1 : BIND9 Zone Transfer (Recommandé)

```bash
# Sur le serveur master, permettre les transferts
# Dans named.conf:
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";
    allow-transfer { 192.168.1.20; 192.168.1.30; };
};

# Sur les serveurs slaves:
zone "example.com" {
    type slave;
    masters { 192.168.1.10; };
    file "/var/cache/bind/db.example.com";
};
```

### Option 2 : Synchronisation manuelle

```bash
# Exporter une zone
dig @192.168.1.10 example.com AXFR > example.com.zone

# Importer sur un autre serveur
ssh user@192.168.1.20 "cat > /etc/bind/zones/db.example.com" < example.com.zone
ssh user@192.168.1.20 "sudo systemctl restart bind9"
```

---

**Pour toute question ou problème**, consultez les logs :

```bash
# Logs du backend
docker logs dns-manager-backend

# Logs SSH
ssh user@remote-server "sudo journalctl -u ssh -f"

# Logs BIND9
ssh user@remote-server "sudo tail -f /var/log/syslog | grep named"
```
