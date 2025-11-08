import React from 'react';

export default function RecordList({ records, onDelete }) {
  const typeColors = {
    A: '#667eea',
    AAAA: '#764ba2',
    CNAME: '#f093fb',
    MX: '#4facfe',
    NS: '#00f2fe',
    TXT: '#43e97b',
    SOA: '#fa709a',
    SRV: '#fee140',
  };

  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th style={{ width: '20%' }}>Nom</th>
            <th style={{ width: '12%' }}>Type</th>
            <th style={{ width: '50%' }}>Valeur</th>
            <th style={{ width: '18%' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td style={{ fontWeight: 'bold' }}>{record.name}</td>
              <td>
                <span
                  style={{
                    background: typeColors[record.type] || '#999',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {record.type}
                </span>
              </td>
              <td style={{ wordBreak: 'break-all' }}>{record.value}</td>
              <td>
                <button
                  className="btn-danger btn-small"
                  onClick={() => onDelete(record.id)}
                  style={{ marginRight: '5px' }}
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
