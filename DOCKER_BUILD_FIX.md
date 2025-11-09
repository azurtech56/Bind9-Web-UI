# Docker Build - Correction npm ci

## Problème

Lors du build Docker, l'erreur suivante s'affichait :

```
npm error code EUSAGE
npm error The `npm ci` command can only install with an existing
npm error package-lock.json or npm-shrinkwrap.json with lockfileVersion >= 1.
```

## Cause

Docker utilise `npm ci` qui nécessite un fichier `package-lock.json` pour fonctionner. Ce fichier n'existait pas dans le repository.

## Solution

### 1. Générer les lock files

```bash
# Dans chaque dossier (backend et frontend)
npm install
```

Cela crée un `package-lock.json` avec les versions exactes.

### 2. Inclure les lock files dans Git

Modification de `.gitignore` :

```diff
- package-lock.json
- yarn.lock
+ # Note: package-lock.json and yarn.lock are INCLUDED (needed for Docker builds)
```

### 3. Mettre à jour les Dockerfiles

**backend/Dockerfile :**
```dockerfile
RUN npm install --omit=dev
```

**frontend/Dockerfile :**
```dockerfile
RUN npm install
```

### Pourquoi c'est important pour Docker ?

- **`npm ci`** : Install exact versions from lock file (production)
- **`npm install`** : Can update versions (development)

Pour Docker, nous utilisons `npm install` qui :
- ✅ Fonctionne avec ou sans lock file
- ✅ Génère un lock file s'il n'existe pas
- ✅ Garde les versions stables si lock file existe
- ✅ Est compatible avec les anciennes versions de Node

## Vérification

Pour vérifier que tout fonctionne :

```bash
# Build les images
docker-compose build

# Vérifier les logs
docker-compose logs backend
docker-compose logs frontend

# Lancer
docker-compose up -d

# Tester
curl http://localhost:3001/health
curl http://localhost:3000
```

## Fichiers modifiés

- `backend/Dockerfile` - `npm install --omit=dev`
- `frontend/Dockerfile` - `npm install`
- `.gitignore` - Inclure les lock files
- `backend/package-lock.json` - ✅ Ajouté
- `frontend/package-lock.json` - ✅ Ajouté

## Meilleure pratique

**En production :**
```dockerfile
# Utiliser npm ci si on a le lock file
RUN npm ci --only=production
```

**En développement ou Docker simple :**
```dockerfile
# Utiliser npm install
RUN npm install --omit=dev
```

## Références

- [npm install vs npm ci](https://docs.npmjs.com/cli/v7/commands/npm-ci)
- [Docker best practices for Node](https://docs.docker.com/language/nodejs/build-images/)
