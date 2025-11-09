import React from 'react';

export default function ReverseZoneList({ zones, selectedZone, onSelectZone }) {
  return (
    <div>
      {zones.length === 0 ? (
        <p style={{ color: '#999', fontSize: '14px', marginTop: '10px' }}>
          Aucune zone inverse créée
        </p>
      ) : (
        <div>
          {zones.map(zone => (
            <div
              key={zone.name}
              style={{
                padding: '10px',
                margin: '5px 0',
                backgroundColor:
                  selectedZone?.name === zone.name ? '#007bff' : '#f0f0f0',
                color: selectedZone?.name === zone.name ? '#fff' : '#000',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => onSelectZone(zone)}
            >
              🔄 {zone.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
