import React from 'react';

export default function ZoneList({ zones, selectedZone, onSelectZone }) {
  return (
    <div>
      <ul className="zones-list">
        {zones.length === 0 ? (
          <li style={{ color: '#999', cursor: 'default' }}>Aucune zone</li>
        ) : (
          zones.map((zone) => (
            <li
              key={zone.name}
              className={selectedZone?.name === zone.name ? 'active' : ''}
              onClick={() => onSelectZone(zone)}
            >
              {zone.name}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
