import { readFile } from 'fs/promises';
import LLMService from '../services/llmService.js';

const llmService = new LLMService();

class StockController {
    constructor() {
        this.stocksData = null;
        this.loadStocksData();
    }

    async loadStocksData() {
        try {
            const data = await readFile('./data/stocks.json', 'utf8');
            this.stocksData = JSON.parse(data);
            console.log('Stocks data loaded successfully');
        } catch (error) {
            console.error('Error loading stocks data:', error);
            this.stocksData = [];
        }
    }

    // Get all stocks
    getAllStocks = async (req, res) => {
        try {
            if (!this.stocksData) {
                await this.loadStocksData();
            }

            const stocksList = this.stocksData.map(stock => ({
                id: stock.id,
                symbol: stock.symbol,
                name: stock.name
            }));

            res.json({
                success: true,
                data: stocksList,
                count: stocksList.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch stocks list'
            });
        }
    };

    // Get stock by ID
    getStockById = async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!this.stocksData) {
                await this.loadStocksData();
            }

            const stock = this.stocksData.find(s => s.id === id);
            
            if (!stock) {
                return res.status(404).json({
                    success: false,
                    error: 'Stock not found'
                });
            }

            res.json({
                success: true,
                data: stock
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch stock data'
            });
        }
    };

    // Analyze stock by ID using LLM
    analyzeStock = async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!this.stocksData) {
                await this.loadStocksData();
            }

            const stock = this.stocksData.find(s => s.id === id);
            
            if (!stock) {
                return res.status(404).json({
                    success: false,
                    error: 'Stock not found'
                });
            }

            console.log(`Analyzing stock: ${stock.symbol} - ${stock.name}`);
            
            // Send to LLM for analysis
            const analysis = await llmService.analyzeStock(stock);

            res.json({
                success: true,
                ...analysis
            });

        } catch (error) {
            console.error('Stock analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to analyze stock',
                details: error.message
            });
        }
    };

    // Analyze multiple stocks
    analyzeMultipleStocks = async (req, res) => {
        try {
            const { stockIds } = req.body;
            
            if (!Array.isArray(stockIds) || stockIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'stockIds must be a non-empty array'
                });
            }

            if (!this.stocksData) {
                await this.loadStocksData();
            }

            const analyses = [];
            
            for (const stockId of stockIds) {
                const stock = this.stocksData.find(s => s.id === stockId);
                if (stock) {
                    const analysis = await llmService.analyzeStock(stock);
                    analyses.push(analysis);
                }
            }

            res.json({
                success: true,
                data: analyses,
                count: analyses.length
            });

        } catch (error) {
            console.error('Multiple stocks analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to analyze stocks'
            });
        }
    };
}

export default StockController;