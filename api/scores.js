// /api/scores.js - Vercel Serverless Function for Monanimal Rescue Runner Leaderboard
// This handles global score storage and leaderboard for the Monad Mission 7 Game Jam

const scores = []; // In-memory storage for demo purposes
// In production, you would use a database like Vercel KV, Supabase, or MongoDB

export default function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Return top 10 scores sorted by score descending
      const topScores = scores
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));

      return res.status(200).json(topScores);

    } else if (req.method === 'POST') {
      const { address, username, score } = req.body;

      // Validate input
      if (!address || typeof score !== 'number') {
        return res.status(400).json({ 
          error: 'Missing required fields: address and score' 
        });
      }

      // Validate score is reasonable (prevent cheating)
      if (score < 0 || score > 1000000) {
        return res.status(400).json({ 
          error: 'Invalid score value' 
        });
      }

      // Create new score entry
      const newScore = {
        address: address.toLowerCase(),
        username: username || `${address.substring(0, 6)}...${address.substring(38)}`,
        score: Math.floor(score),
        timestamp: new Date().toISOString(),
        gameVersion: '1.0.0'
      };

      // Check if player already has a score and update if this is higher
      const existingIndex = scores.findIndex(
        entry => entry.address === newScore.address
      );

      if (existingIndex >= 0) {
        // Update if new score is higher
        if (newScore.score > scores[existingIndex].score) {
          scores[existingIndex] = newScore;
        }
      } else {
        // Add new score
        scores.push(newScore);
      }

      // Keep only top 100 scores to prevent memory bloat
      scores.sort((a, b) => b.score - a.score);
      if (scores.length > 100) {
        scores.splice(100);
      }

      return res.status(201).json({
        message: 'Score submitted successfully',
        score: newScore,
        currentRank: scores.findIndex(s => s.address === newScore.address) + 1,
        totalPlayers: scores.length
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/* 
ENHANCED VERSION FOR PRODUCTION WITH DATABASE:

import { createClient } from '@vercel/kv';

// Initialize KV database
const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // ... CORS headers same as above ...

  try {
    if (req.method === 'GET') {
      const scores = await kv.get('leaderboard') || [];
      const topScores = scores
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      
      return res.status(200).json(topScores);

    } else if (req.method === 'POST') {
      const { address, username, score } = req.body;
      
      // Validation same as above...
      
      const scores = await kv.get('leaderboard') || [];
      const existingIndex = scores.findIndex(s => s.address === address.toLowerCase());
      
      const newScore = {
        address: address.toLowerCase(),
        username: username || `${address.substring(0, 6)}...${address.substring(38)}`,
        score: Math.floor(score),
        timestamp: new Date().toISOString()
      };
      
      if (existingIndex >= 0 && newScore.score > scores[existingIndex].score) {
        scores[existingIndex] = newScore;
      } else if (existingIndex === -1) {
        scores.push(newScore);
      }
      
      scores.sort((a, b) => b.score - a.score);
      scores.splice(100); // Keep top 100
      
      await kv.set('leaderboard', scores);
      
      return res.status(201).json({
        message: 'Score submitted successfully',
        currentRank: scores.findIndex(s => s.address === address.toLowerCase()) + 1
      });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database error' });
  }
}

// To use the enhanced version:
// 1. Install Vercel KV: npm install @vercel/kv
// 2. Set up KV database in Vercel dashboard
// 3. Add environment variables: KV_REST_API_URL and KV_REST_API_TOKEN
// 4. Replace the simple in-memory version above with this code

*/