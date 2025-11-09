# Guide de gestion des zones inverses PTR

**Date:** 2025-11-09
**Version:** 1.0

---

## 📖 Table des matières

1. [Qu'est-ce qu'une zone inverse ?](#quest-ce-quune-zone-inverse)
2. [Formats acceptés](#formats-acceptés)
3. [Gestion via l'API](#gestion-via-lapi)
4. [Gestion via l'interface web](#gestion-via-linterface-web)
5. [Exemples pratiques](#exemples-pratiques)
6. [Configuration BIND9](#configuration-bind9)

---

## Qu'est-ce qu'une zone inverse ?

Une **zone inverse (reverse zone)** est utilisée pour les requêtes DNS inverses (reverse DNS lookups). Elle permet de résoudre une adresse IP en nom de domaine via les enregistrements **PTR (Pointer)**.

### Exemple
- **Zone normale:** `example.com` → Résout `www.example.com` en IP
- **Zone inverse:** `1.168.192.in-addr.arpa` → Résout IP `192.168.1.1` en nom d'hôte

---

## Formats acceptés

### IPv4 - Format in-addr.arpa

La zone inverse IPv4 suit le format **`x.x.x.in-addr.arpa`** où les octets sont inversés.

**Exemples:**

| Réseau | Zone inverse |
|--------|-------------|
| 192.168.1.0/24 | `1.168.192.in-addr.arpa` |
| 10.0.0.0/8 | `0.10.in-addr.arpa` |
| 172.16.0.0/16 | `16.172.in-addr.arpa` |
| 203.0.113.0/24 | `113.0.203.in-addr.arpa` |

### IPv6 - Format ip6.arpa

Pour IPv6, le format est similaire mais avec chaque nibble (demi-octet) inversé.

**Exemple:**
- Préfixe: `2001:db8::/32` → Zone: `8.b.d.0.1.0.0.2.ip6.arpa`

---

## Gestion via l'API

### Endpoints disponibles

#### 1. Lister toutes les zones inverses
```bash
GET /api/reverse-zones
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    { "name": "1.168.192.in-addr.arpa", "type": "reverse" },
    { "name": "16.172.in-addr.arpa", "type": "reverse" }
  ],
  "count": 2
}
```

#### 2. Récupérer les enregistrements d'une zone inverse
```bash
GET /api/reverse-zones/1.168.192.in-addr.arpa
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "zone": "1.168.192.in-addr.arpa",
    "records": [
      {
        "id": "record-0",
        "name": "1",
        "type": "PTR",
        "value": "server1.example.com.",
        "ttl": 3600
      }
    ],
    "rawContent": "..."
  }
}
```

#### 3. Créer une nouvelle zone inverse
```bash
POST /api/reverse-zones

Body:
{
  "zoneName": "1.168.192.in-addr.arpa",
  "soaEmail": "admin@example.com"
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Zone inverse 1.168.192.in-addr.arpa créée",
  "data": { "zoneName": "1.168.192.in-addr.arpa" }
}
```

#### 4. Ajouter un enregistrement PTR
```bash
POST /api/reverse-zones/1.168.192.in-addr.arpa/records

Body:
{
  "name": "10",
  "type": "PTR",
  "value": "server.example.com.",
  "ttl": 3600
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Enregistrement PTR ajouté",
  "data": {
    "name": "10",
    "type": "PTR",
    "value": "server.example.com.",
    "ttl": 3600
  }
}
```

#### 5. Supprimer un enregistrement PTR
```bash
DELETE /api/reverse-zones/1.168.192.in-addr.arpa/records/record-0
```

#### 6. Supprimer une zone inverse
```bash
DELETE /api/reverse-zones/1.168.192.in-addr.arpa
```

---

## Gestion via l'interface web

### Onglet "Zones Inverses"

L'interface web propose un onglet dédié aux zones inverses avec les mêmes fonctionnalités que les zones normales.

#### Créer une zone inverse

1. Cliquez sur l'onglet **🔄 Zones Inverses**
2. Cliquez sur **➕ Nouvelle zone inverse**
3. Entrez le nom de la zone (ex: `1.168.192.in-addr.arpa`)
4. L'interface peut suggérer le format si vous entrez juste les trois octets (ex: `1.168.192`)
5. Entrez l'email SOA (ex: `admin@example.com`)
6. Cliquez sur **Créer la zone inverse**

**Aide au format:**
- Si vous tapez `192.168.1`, le système suggère `192.168.1.in-addr.arpa` ✅
- Les suggestions peuvent être appliquées en un clic

#### Ajouter un enregistrement PTR

1. Sélectionnez la zone inverse
2. Cliquez sur **➕ Ajouter un enregistrement PTR**
3. Entrez l'IP inversée (ex: `10` pour `192.168.1.10`)
4. Entrez le nom d'hôte (ex: `server.example.com.`)
5. Cliquez sur **Ajouter**

**Note:** L'interface accepte uniquement les enregistrements PTR dans les zones inverses.

---

## Exemples pratiques

### Exemple 1: Configuration d'une zone /24 (255 adresses)

**Zone inverse pour 192.168.1.0/24:**

```bind9
$TTL 3600
@   IN  SOA     ns1.example.com. admin.example.com. (
                2025110901 ; serial
                3600       ; refresh
                1800       ; retry
                604800     ; expire
                86400 )    ; minimum

@   IN  NS      ns1.example.com.

1   IN  PTR     router.example.com.
5   IN  PTR     dns1.example.com.
6   IN  PTR     dns2.example.com.
10  IN  PTR     server1.example.com.
20  IN  PTR     server2.example.com.
50  IN  PTR     workstation1.example.com.
```

**Résolution inverse:**
- `192.168.1.1` → `router.example.com`
- `192.168.1.10` → `server1.example.com`
- `192.168.1.50` → `workstation1.example.com`

### Exemple 2: Zone /16 (plusieurs segments)

**Zone inverse pour 172.16.0.0/16:**

Créer la zone: `0.16.172.in-addr.arpa`

```bind9
@   IN  SOA     ns1.example.com. admin.example.com. (...)
@   IN  NS      ns1.example.com.

1.0     IN  PTR     server1.example.com.
2.0     IN  PTR     server2.example.com.
1.1     IN  PTR     client1.example.com.
```

---

## Configuration BIND9

### Déclarer la zone dans named.conf

Ajoutez à `/etc/bind/named.conf.local`:

```bind9
zone "1.168.192.in-addr.arpa" {
    type master;
    file "/etc/bind/zones/1.168.192.in-addr.arpa";
};
```

### Vérifier la configuration

```bash
# Vérifier la syntaxe
sudo named-checkconf

# Vérifier la zone
sudo named-checkzone 1.168.192.in-addr.arpa /etc/bind/zones/1.168.192.in-addr.arpa
```

### Recharger BIND9

```bash
# Recharger la configuration
sudo systemctl reload bind9

# Ou avec rndc
sudo rndc reload
```

---

## Validation et sécurité

### Validation du backend

Le backend valide automatiquement:

✅ Format de zone inverse (doit terminer par `.in-addr.arpa` ou `.ip6.arpa`)
✅ Chemins de fichiers (prévention de directory traversal)
✅ Type d'enregistrement (seulement `PTR` accepté)
✅ Accès aux fichiers de zone

### Exemples de validation

**Format invalide:**
```bash
POST /api/reverse-zones
{
  "zoneName": "example.com",  # ❌ Pas un format inverse
  "soaEmail": "admin@example.com"
}
```
Réponse: `400 - Format de zone inverse invalide`

**Type de record invalide:**
```bash
POST /api/reverse-zones/1.168.192.in-addr.arpa/records
{
  "name": "1",
  "type": "A",  # ❌ Doit être PTR
  "value": "192.168.1.1"
}
```
Réponse: `400 - Seul le type PTR est accepté pour les zones inverses`

---

## Cas d'usage courants

### 1. Configuration SPF/DKIM
Les serveurs de courrier utilisent les requêtes inverses pour valider les expéditeurs.

### 2. Authentification SSH
Les logs SSH peuvent afficher les noms d'hôte au lieu des adresses IP.

### 3. Logs d'audit
Les zones inverses permettent de lier des adresses IP à des noms pour meilleure traçabilité.

### 4. Services réseau
Certains services (NFS, RPC) utilisent les requêtes inverses pour la sécurité.

---

## Dépannage

### Le test de zone inverse échoue

```bash
# Tester la requête inverse avec dig
dig -x 192.168.1.1 @localhost

# Si pas de réponse, vérifier:
# 1. La zone est bien créée
curl http://localhost:3001/api/reverse-zones

# 2. BIND9 est rechargé
sudo systemctl reload bind9

# 3. L'enregistrement PTR existe
curl http://localhost:3001/api/reverse-zones/1.168.192.in-addr.arpa
```

### Zone pas visible dans l'interface

1. Vérifier que le format est valide: `X.X.X.in-addr.arpa` ou `*.ip6.arpa`
2. Vérifier les permissions des fichiers
3. Recharger l'interface (F5)

---

## Référence rapide

| Action | Endpoint | Méthode |
|--------|----------|---------|
| Lister zones inverses | `/api/reverse-zones` | GET |
| Voir zone | `/api/reverse-zones/:zoneName` | GET |
| Créer zone | `/api/reverse-zones` | POST |
| Ajouter PTR | `/api/reverse-zones/:zoneName/records` | POST |
| Supprimer PTR | `/api/reverse-zones/:zoneName/records/:recordId` | DELETE |
| Supprimer zone | `/api/reverse-zones/:zoneName` | DELETE |

---

**Version:** 1.0
**Dernière mise à jour:** 2025-11-09
**Statut:** ✅ Complété
