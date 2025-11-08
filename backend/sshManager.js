import { Client } from 'ssh2';
import fs from 'fs-extra';

/**
 * Gestionnaire SSH pour accéder aux serveurs BIND9 distants
 */
export class SSHManager {
  constructor(serverConfig) {
    this.config = serverConfig;
    this.client = null;
  }

  /**
   * Établir une connexion SSH
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.client = new Client();

      const connectionConfig = {
        host: this.config.host,
        port: this.config.port || 22,
        username: this.config.username,
      };

      // Utiliser la clé SSH si disponible, sinon le mot de passe
      if (this.config.sshKeyPath) {
        try {
          connectionConfig.privateKey = fs.readFileSync(this.config.sshKeyPath);
        } catch (err) {
          reject(new Error(`Impossible de lire la clé SSH: ${err.message}`));
          return;
        }
      } else if (this.config.password) {
        connectionConfig.password = this.config.password;
      } else {
        reject(new Error('Clé SSH ou mot de passe requis'));
        return;
      }

      this.client.on('ready', () => {
        resolve();
      });

      this.client.on('error', (err) => {
        reject(err);
      });

      this.client.connect(connectionConfig);
    });
  }

  /**
   * Fermer la connexion SSH
   */
  async disconnect() {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end();
        this.client = null;
      }
      resolve();
    });
  }

  /**
   * Exécuter une commande SSH
   */
  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Pas de connexion SSH établie'));
        return;
      }

      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code) => {
          resolve({
            stdout,
            stderr,
            code,
          });
        });

        stream.on('data', (data) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });
  }

  /**
   * Lire un fichier sur le serveur distant
   */
  async readFile(filePath) {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Pas de connexion SSH établie'));
        return;
      }

      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        sftp.readFile(filePath, (err, data) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(data.toString());
        });
      });
    });
  }

  /**
   * Écrire un fichier sur le serveur distant
   */
  async writeFile(filePath, content) {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Pas de connexion SSH établie'));
        return;
      }

      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        sftp.writeFile(filePath, Buffer.from(content), (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * Lister les fichiers d'un répertoire
   */
  async listFiles(dirPath) {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Pas de connexion SSH établie'));
        return;
      }

      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        sftp.readdir(dirPath, (err, files) => {
          if (err) {
            reject(err);
            return;
          }

          const fileList = files.map((file) => ({
            name: file.filename,
            isDirectory: file.longname.startsWith('d'),
            size: file.attrs.size,
          }));

          resolve(fileList);
        });
      });
    });
  }

  /**
   * Tester la connexion
   */
  async testConnection() {
    try {
      await this.connect();
      const result = await this.executeCommand('echo "SSH connection successful"');
      await this.disconnect();
      return {
        success: true,
        message: 'Connexion SSH réussie',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
