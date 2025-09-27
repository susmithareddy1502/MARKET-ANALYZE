// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import LLMStockEvaluator from './llmStockEvaluator.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize LLM service
const stockEvaluator = new LLMStockEvaluator(process.env.OPENAI_API_KEY);

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/analyze-stock', async (req, res) => {
    try {
        const { stockSymbol, parameters } = req.body;
        
        if (!stockSymbol || !parameters) {
            return res.status(400).json({
                error: 'Missing required fields: stockSymbol and parameters'
            });
        }

        // Validate required parameters
        const requiredParams = [
            'priceEarningsRatio', 'earningsPerShare', 'dividendYield', 
            'marketCap', 'debtToEquityRatio', 'returnOnEquity', 
            'returnOnAssets', 'currentRatio', 'quickRatio', 'bookValuePerShare'
        ];

        for (const param of requiredParams) {
            if (parameters[param] === undefined) {
                return res.status(400).json({
                    error: `Missing parameter: ${param}`
                });
            }
        }

        const analysis = await stockEvaluator.evaluateStock({
            stockSymbol,
            parameters
        });

        res.json({
            success: true,
            ...analysis,
            analyzedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Stock analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze stock',
            details: error.message
        });
    }
});

app.get('/api/sample-data', (req, res) => {
    try {
        const dataset = require('stocks.json');
        
        if (!dataset || dataset.length === 0) {
            return res.status(404).json({ error: "No data found" });
        }
        
        res.json(dataset);
    } catch (error) {
        res.status(500).json({ error: "Failed to load dataset" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Stock LLM Evaluator running on port ${3000}`);
    console.log(`📊 Open http://localhost:${3000} to use the application`);
});