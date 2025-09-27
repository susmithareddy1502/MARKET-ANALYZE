// llmStockEvaluator.js
import axios from 'axios';
import NodeCache from 'node-cache';

class LLMStockEvaluator {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.cache = new NodeCache({ stdTTL: 3600 });
        this.baseURL = 'https://api.openai.com/v1/chat/completions';
    }

    async evaluateStock(stockData) {
        const cacheKey = `stock_${stockData.stockSymbol}_${JSON.stringify(stockData.parameters)}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached) {
            console.log('Returning cached analysis');
            return cached;
        }

        try {
            const analysis = await this.generateLLMAnalysis(stockData);
            this.cache.set(cacheKey, analysis);
            return analysis;
        } catch (error) {
            console.error('LLM Analysis Error:', error);
            return this.generateFallbackAnalysis(stockData);
        }
    }

    async generateLLMAnalysis(stockData) {
        const prompt = this.createAnalysisPrompt(stockData);
        
        const response = await axios.post(this.baseURL, {
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are a professional financial analyst with 20 years of experience. 
                    Analyze stocks based on financial metrics and provide structured JSON output with:
                    - Detailed feedback for each parameter
                    - Overall summary
                    - Investment recommendation
                    - Risk assessment
                    
                    Return ONLY valid JSON, no additional text.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 2000,
            temperature: 0.1
        }, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return this.parseLLMResponse(response.data.choices[0].message.content);
    }

    createAnalysisPrompt(stockData) {
        const { stockSymbol, parameters } = stockData;
        
        return `Analyze this stock and return JSON in this exact format:

{
    "stockSymbol": "${stockSymbol}",
    "feedback": {
        "priceEarningsRatio": "analysis here",
        "earningsPerShare": "analysis here", 
        "dividendYield": "analysis here",
        "marketCap": "analysis here",
        "debtToEquityRatio": "analysis here",
        "returnOnEquity": "analysis here",
        "returnOnAssets": "analysis here",
        "currentRatio": "analysis here",
        "quickRatio": "analysis here",
        "bookValuePerShare": "analysis here"
    },
    "summary": "overall summary here",
    "recommendation": "Buy/Hold/Sell",
    "riskLevel": "Low/Medium/High",
    "confidenceScore": 85
}

STOCK: ${stockSymbol}

FINANCIAL METRICS:
- P/E Ratio: ${parameters.priceEarningsRatio}
- EPS: $${parameters.earningsPerShare}
- Dividend Yield: ${(parameters.dividendYield * 100).toFixed(2)}%
- Market Cap: $${this.formatMarketCap(parameters.marketCap)}
- Debt/Equity: ${parameters.debtToEquityRatio}
- ROE: ${(parameters.returnOnEquity * 100).toFixed(1)}%
- ROA: ${(parameters.returnOnAssets * 100).toFixed(1)}%
- Current Ratio: ${parameters.currentRatio}
- Quick Ratio: ${parameters.quickRatio}
- Book Value/Share: $${parameters.bookValuePerShare}

Provide professional financial analysis comparing to industry averages.`;
    }

    formatMarketCap(marketCap) {
        if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(2)}T`;
        if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(2)}B`;
        if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(2)}M`;
        return marketCap.toString();
    }

    parseLLMResponse(llmResponse) {
        try {
            // Clean the response and parse JSON
            const cleanedResponse = llmResponse.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleanedResponse);
            
            // Validate required fields
            if (!parsed.stockSymbol || !parsed.feedback || !parsed.summary) {
                throw new Error('Invalid response structure');
            }
            
            return parsed;
        } catch (error) {
            console.error('Failed to parse LLM response:', error);
            throw new Error('Invalid response from AI');
        }
    }

    generateFallbackAnalysis(stockData) {
        const { stockSymbol, parameters } = stockData;
        
        // Simple rule-based fallback
        const peAssessment = parameters.priceEarningsRatio < 20 ? 'attractive' : 
                           parameters.priceEarningsRatio < 30 ? 'fair' : 'expensive';
        
        const recommendation = parameters.priceEarningsRatio < 25 && 
                              parameters.returnOnEquity > 0.15 ? 'BUY' : 'HOLD';

        const riskLevel = parameters.debtToEquityRatio > 1.5 ? 'HIGH' : 
                         parameters.currentRatio < 1 ? 'MEDIUM' : 'LOW';

        return {
            stockSymbol,
            feedback: {
                priceEarningsRatio: `P/E ratio of ${parameters.priceEarningsRatio} suggests ${peAssessment} valuation.`,
                earningsPerShare: `EPS of $${parameters.earningsPerShare} indicates ${parameters.earningsPerShare > 5 ? 'strong' : 'moderate'} profitability.`,
                dividendYield: `Dividend yield of ${(parameters.dividendYield * 100).toFixed(2)}% provides ${parameters.dividendYield > 0.02 ? 'good' : 'modest'} income.`,
                marketCap: `Market cap of $${this.formatMarketCap(parameters.marketCap)} indicates ${parameters.marketCap > 1e11 ? 'large' : 'mid'} capitalization.`,
                debtToEquityRatio: `Debt-to-equity ratio of ${parameters.debtToEquityRatio} shows ${parameters.debtToEquityRatio < 1 ? 'conservative' : 'moderate'} leverage.`,
                returnOnEquity: `ROE of ${(parameters.returnOnEquity * 100).toFixed(1)}% indicates ${parameters.returnOnEquity > 0.15 ? 'efficient' : 'reasonable'} equity usage.`,
                returnOnAssets: `ROA of ${(parameters.returnOnAssets * 100).toFixed(1)}% shows ${parameters.returnOnAssets > 0.08 ? 'good' : 'adequate'} asset efficiency.`,
                currentRatio: `Current ratio of ${parameters.currentRatio} suggests ${parameters.currentRatio > 1.5 ? 'strong' : 'adequate'} short-term liquidity.`,
                quickRatio: `Quick ratio of ${parameters.quickRatio} indicates ${parameters.quickRatio > 1 ? 'good' : 'moderate'} immediate liquidity.`,
                bookValuePerShare: `Book value of $${parameters.bookValuePerShare} per share provides ${parameters.bookValuePerShare > 10 ? 'solid' : 'modest'} asset backing.`
            },
            summary: `${stockSymbol} shows ${peAssessment} valuation with ${riskLevel.toLowerCase()} risk profile. ${recommendation} recommendation based on current metrics.`,
            recommendation,
            riskLevel,
            confidenceScore: 75,
            isFallback: true
        };
    }
}

export default LLMStockEvaluator;