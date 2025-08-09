import React, { useState } from 'react';

const ranges = [
  { label: 'Last 24 Hours', value: '24h' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Custom', value: 'custom' }
];

export default function App(){
  const [apiKey, setApiKey] = useState('');
  const [keywords, setKeywords] = useState('');
  const [range, setRange] = useState('24h');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [metrics, setMetrics] = useState(null);

  const save = async () => {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, keywords: keywords.split(',').map(k => k.trim()) })
    });
  };

  const fetchMetrics = async () => {
    const params = new URLSearchParams();
    if(keywords) params.set('keywords', keywords);
    if(range === 'custom'){
      if(start) params.set('start', start);
      if(end) params.set('end', end);
    }else{
      const now = new Date();
      let from;
      switch(range){
        case '24h': from = new Date(now - 24*60*60*1000); break;
        case '7d': from = new Date(now - 7*24*60*60*1000); break;
        case '30d': from = new Date(now - 30*24*60*60*1000); break;
        default: from = new Date(now - 24*60*60*1000);
      }
      params.set('start', from.toISOString());
      params.set('end', now.toISOString());
    }
    const res = await fetch('/api/metrics?' + params.toString());
    const data = await res.json();
    setMetrics(data);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <h1>OpenSea Monitoring</h1>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input placeholder="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
        <input placeholder="Keywords (comma separated)" value={keywords} onChange={e => setKeywords(e.target.value)} />
        <select value={range} onChange={e => setRange(e.target.value)}>
          {ranges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {range === 'custom' && (
          <>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} />
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </>
        )}
        <button onClick={save}>Save</button>
        <button onClick={fetchMetrics}>Fetch</button>
      </div>

      {metrics && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Metrics</h2>
          <p>Volume: {metrics.volume}</p>
          <h3>Listings</h3>
          <ul>
            {metrics.listings.map(l => (
              <li key={l.id}>
                <a href={l.permalink} target="_blank" rel="noreferrer">{l.name}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
