import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import pkg from 'pg';
import crypto from 'crypto';
import cron from 'node-cron';

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || '').padEnd(32, '0').slice(0,32);
const IV_LENGTH = 16;

function encrypt(text){
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-ctr', Buffer.from(ENCRYPTION_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(hash){
  const parts = hash.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-ctr', Buffer.from(ENCRYPTION_KEY), iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
}

app.post('/config', async (req,res) => {
  const { apiKey, keywords = [] } = req.body;
  if(!apiKey){
    return res.status(400).json({ error: 'apiKey required' });
  }
  const encryptedKey = encrypt(apiKey);
  await pool.query(
    `INSERT INTO config(id, api_key, keywords) VALUES (1,$1,$2)
     ON CONFLICT (id) DO UPDATE SET api_key=EXCLUDED.api_key, keywords=EXCLUDED.keywords`,
    [encryptedKey, keywords]
  );
  res.json({ status: 'saved' });
});

async function getApiKey(){
  const result = await pool.query('SELECT api_key FROM config WHERE id=1');
  if(result.rows.length === 0) return '';
  return decrypt(result.rows[0].api_key);
}

async function fetchMetrics(keywords=[], start, end){
  const params = new URLSearchParams();
  if(keywords.length){
    params.set('search[query]', keywords.join(' '));
  }
  params.set('limit','50');
  if(start) params.set('occurred_after', Math.floor(new Date(start)/1000));
  if(end) params.set('occurred_before', Math.floor(new Date(end)/1000));
  const url = `https://api.opensea.io/api/v1/events?${params.toString()}`;
  const apiKey = await getApiKey();
  const response = await fetch(url,{ headers: { 'X-API-KEY': apiKey }});
  const data = await response.json();
  const listings = (data.asset_events || []).map(ev => ({
    id: ev.asset?.id,
    name: ev.asset?.name,
    permalink: ev.asset?.permalink,
    seller: ev.seller?.address,
    buyer: ev.winner_account?.address,
    price: ev.total_price
  }));
  return {
    volume: listings.length,
    floorPrice: null,
    topSellers: [],
    topBuyers: [],
    listings
  };
}

app.get('/metrics', async (req,res) => {
  const { keywords = '', start, end } = req.query;
  const kw = keywords ? keywords.split(',').map(k => k.trim()) : [];
  try {
    const metrics = await fetchMetrics(kw, start, end);
    res.json(metrics);
  } catch(err){
    res.status(500).json({ error: err.message });
  }
});

cron.schedule('0 0 * * *', async () => {
  const cfg = await pool.query('SELECT keywords FROM config WHERE id=1');
  const keywords = cfg.rows[0]?.keywords || [];
  await fetchMetrics(keywords);
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on ${port}`));
