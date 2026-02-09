#!/usr/bin/env node
/**
 * X/Twitter Trends Fetcher
 * Uses X API v2 with OAuth 1.0a or Bearer Token
 */

const https = require('https');
const crypto = require('crypto');

// Configuration - set these via environment variables
const CONFIG = {
  apiKey: process.env.X_API_KEY,
  apiSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET,
  bearerToken: process.env.X_BEARER_TOKEN
};

// OAuth 1.0a signature generation
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort().map(k => 
    `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`
  ).join('&');
  
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');
  
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret || '')}`;
  
  return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

// Make authenticated request
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Search tweets using Bearer Token (simpler)
async function searchTweets(query, maxResults = 10) {
  if (!CONFIG.bearerToken) {
    throw new Error('X_BEARER_TOKEN not set');
  }
  
  const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}&tweet.fields=created_at,author_id,public_metrics`;
  
  return makeRequest(url, {
    headers: {
      'Authorization': `Bearer ${CONFIG.bearerToken}`,
      'User-Agent': 'OpenClaw-TrendMonitor/1.0'
    }
  });
}

// Get trending topics (requires OAuth 1.0a)
async function getTrends(woeid = 1) {
  if (!CONFIG.apiKey || !CONFIG.apiSecret || !CONFIG.accessToken || !CONFIG.accessTokenSecret) {
    throw new Error('OAuth 1.0a credentials not fully configured');
  }
  
  const url = 'https://api.twitter.com/1.1/trends/place.json';
  const params = {
    id: woeid.toString(),
    oauth_consumer_key: CONFIG.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: CONFIG.accessToken,
    oauth_version: '1.0'
  };
  
  params.oauth_signature = generateOAuthSignature(
    'GET',
    url,
    params,
    CONFIG.apiSecret,
    CONFIG.accessTokenSecret
  );
  
  const authHeader = 'OAuth ' + Object.keys(params).map(k => 
    `${encodeURIComponent(k)}="${encodeURIComponent(params[k])}"`
  ).join(', ');
  
  return makeRequest(`${url}?id=${woeid}`, {
    headers: {
      'Authorization': authHeader,
      'User-Agent': 'OpenClaw-TrendMonitor/1.0'
    }
  });
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'trends':
        const woeid = args[1] || 1;
        const trends = await getTrends(woeid);
        console.log(JSON.stringify(trends, null, 2));
        break;
        
      case 'search':
        const query = args[1] || 'startup tech';
        const maxResults = parseInt(args[2]) || 10;
        const tweets = await searchTweets(query, maxResults);
        console.log(JSON.stringify(tweets, null, 2));
        break;
        
      default:
        console.log(`
Usage: node x-monitor.mjs <command> [options]

Commands:
  trends [woeid]           Get trending topics (default: 1 = worldwide)
  search <query> [limit]   Search recent tweets

Environment Variables:
  X_BEARER_TOKEN          - Bearer token for search (recommended)
  X_API_KEY               - OAuth 1.0a API Key
  X_API_SECRET            - OAuth 1.0a API Secret  
  X_ACCESS_TOKEN          - OAuth 1.0a Access Token
  X_ACCESS_TOKEN_SECRET   - OAuth 1.0a Access Token Secret

Examples:
  X_BEARER_TOKEN=xxx node x-monitor.mjs search "SaaS startup"
  node x-monitor.mjs trends 23424977  # USA trends
`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
