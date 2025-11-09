FROM node:18-alpine

WORKDIR /app

# Copier les dépendances
COPY package*.json ./

# Installer les dépendances (prod uniquement)
RUN npm install --omit=dev

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3001

# Démarrer l'application
CMD ["npm", "start"]
