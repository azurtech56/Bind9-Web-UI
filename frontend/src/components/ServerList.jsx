import React from 'react';

export default function ServerList({ servers, selectedServer, onSelectServer }) {
  return (
    <div>
      <ul className="zones-list">
        {servers.length === 0 ? (
          <li style={{ color: '#999', cursor: 'default' }}>Aucun serveur</li>
        ) : (
          servers.map((server) => (
            <li
              key={server.id}
              className={selectedServer?.id === server.id ? 'active' : ''}
              onClick={() => onSelectServer(server)}
              title={server.description}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    background: server.isLocal ? '#667eea' : '#764ba2',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '3px',
                  }}
                >
                  {server.isLocal ? 'LOCAL' : 'REMOTE'}
                </span>
                <span>{server.name}</span>
              </div>
              <small style={{ display: 'block', opacity: 0.7, marginTop: '4px' }}>
                {server.host}:{server.port}
              </small>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
