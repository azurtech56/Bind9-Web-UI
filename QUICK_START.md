# 🚀 Quick Start - DNS Manager

Démarrez en 5 minutes!

## Étapes rapides

### 1️⃣ Prérequis
- Docker et Docker Compose installés
- BIND9 sur votre serveur Linux
- Accès aux fichiers `/etc/bind/`

### 2️⃣ Cloner et configurer

```bash
# Clone le repo
git clone https://github.com/azurtech56/Bind9-Web-UI.git
cd Bind9-Web-UI

# Configure les permissions BIND9
sudo chown -R 1000:1000 /etc/bind/zones
sudo chmod -R 755 /etc/bind/zones
```

### 3️⃣ Lancer avec Docker

```bash
# Démarrer l'application
docker-compose up -d

# Vérifier que tout fonctionne
docker-compose ps
```

### 4️⃣ Accéder à l'interface

Ouvrez votre navigateur et allez à:
```
http://localhost:3000
```

ou si vous utilisez Nginx:
```
http://localhost
```

## 🎯 Premiers pas

1. **Créer une zone**
   - Cliquez sur "➕ Nouvelle zone"
   - Entrez le nom (exemple.com) et l'email SOA
   - Cliquez "Créer la zone"

2. **Ajouter des enregistrements**
   - Sélectionnez une zone à gauche
   - Cliquez "➕ Ajouter un enregistrement"
   - Remplissez les champs (nom, type, valeur)
   - Cliquez "✅ Ajouter"

3. **Modifier/Supprimer**
   - Cliquez "Supprimer" à côté d'un enregistrement
   - Cliquez "🗑️ Supprimer la zone" pour supprimer une zone

## 🐛 Problèmes courants

### "Permission denied" sur BIND9

```bash
# Corriger les permissions
sudo chown -R 1000:1000 /etc/bind/zones
sudo chmod -R 755 /etc/bind/zones

# Redémarrer BIND9
sudo systemctl restart bind9
```

### Le backend ne démarre pas

```bash
# Vérifier les logs
docker-compose logs backend

# Redémarrer
docker-compose down
docker-compose up -d
```

### L'API est inaccessible

```bash
# Vérifier que l'API fonctionne
curl http://localhost:3001/health

# Vérifier les logs
docker-compose logs backend
```

## 📊 Vérifier que tout fonctionne

```bash
# Vérifier l'API
curl http://localhost:3001/api/zones

# Vérifier le frontend
curl http://localhost:3000

# Vérifier le reverse proxy
curl http://localhost/health
```

## 🛑 Arrêter l'application

```bash
docker-compose down
```

## 📖 Documentation complète

Voir [README.md](README.md) pour une documentation complète.

---

**Besoin d'aide?** Ouvrez une issue sur GitHub ou consultez la documentation BIND9.
