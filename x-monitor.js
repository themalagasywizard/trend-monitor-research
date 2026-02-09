#!/usr/bin/env node
/**
 * X/Twitter Trends Fetcher
 * Uses X API v2 with Bearer Token
 */

const https = require('https');

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

// Search tweets using Bearer Token
async function searchTweets(bearerToken, query, maxResults = 10) {
  const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}&tweet.fields=created_at,author_id,public_metrics,context_annotations`;
  
  return makeRequest(url, {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'User-Agent': 'OpenClaw-TrendMonitor/1.0'
    }
  });
}

// Get recent popular tweets about a topic
async function getTopicTweets(bearerToken, topic, limit = 15) {
  // Build query for pain points/struggles around the topic
  const query = `${topic} (pain OR problem OR struggle OR challenge OR "how to" OR looking for) -is:retweet lang:en`;
  return searchTweets(bearerToken, query, limit);
}

// Extract trends and insights
async function extractTrends(bearerToken, topics) {
  const results = {};
  
  for (const topic of topics) {
    try {
      const tweets = await getTopicTweets(bearerToken, topic, 10);
      results[topic] = tweets.data || [];
    } catch (err) {
      results[topic] = { error: err.message };
    }
  }
  
  return results;
}

// Main execution
async function main() {
  const bearerToken = process.env.X_BEARER_TOKEN;
  
  if (!bearerToken) {
    console.error('Error: X_BEARER_TOKEN not set');
    process.exit(1);
  }
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'search':
        const query = args[1] || 'startup SaaS pain point';
        const maxResults = parseInt(args[2]) || 10;
        const tweets = await searchTweets(bearerToken, query, maxResults);
        console.log(JSON.stringify(tweets, null, 2));
        break;
        
      case 'pain-points':
        const topics = args[1] ? args[1].split(',') : ['SaaS', 'startup', 'founder'];
        const painPoints = await extractTrends(bearerToken, topics);
        console.log(JSON.stringify(painPoints, null, 2));
        break;
        
      default:
        console.log(`
Usage: x-monitor.js <command> [options]

Commands:
  search <query> [limit]        Search recent tweets
  pain-points [topics]          Extract pain points from topics (comma-separated)

Environment Variables:
  X_BEARER_TOKEN    - X API Bearer Token (required)

Examples:
  X_BEARER_TOKEN=xxx node x-monitor.js search "SaaS startup"
  X_BEARER_TOKEN=xxx node x-monitor.js pain-points "SaaS,AI,founder"
`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { searchTweets, getTopicTweets, extractTrends };
