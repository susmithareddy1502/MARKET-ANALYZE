// DOM Elements
const stockForm = document.getElementById('stockForm');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingDiv = document.getElementById('loading');
const resultsDiv = document.getElementById('results');
const loadSampleBtn = document.getElementById('loadSample');

// Event Listeners
stockForm.addEventListener('submit', handleStockAnalysis);
loadSampleBtn.addEventListener('click', loadSampleData);

async function handleStockAnalysis(e) {
    e.preventDefault();
    
    // Get form data
    const stockData = {
        stockSymbol: document.getElementById('stockSymbol').value.trim().toUpperCase(),
        parameters: {
            priceEarningsRatio: parseFloat(document.getElementById('peRatio').value),
            earningsPerShare: parseFloat(document.getElementById('eps').value),
            dividendYield: parseFloat(document.getElementById('dividendYield').value) / 100,
            marketCap: parseFloat(document.getElementById('marketCap').value) * 1e9,
            debtToEquityRatio: parseFloat(document.getElementById('debtEquity').value),
            returnOnEquity: parseFloat(document.getElementById('roe').value) / 100,
            returnOnAssets: parseFloat(document.getElementById('roa').value) / 100,
            currentRatio: parseFloat(document.getElementById('currentRatio').value),
            quickRatio: parseFloat(document.getElementById('quickRatio').value),
            bookValuePerShare: parseFloat(document.getElementById('bookValue').value)
        }
    };

    // Validate inputs
    if (!stockData.stockSymbol) {
        showError('Please enter a stock symbol');
        return;
    }

    if (Object.values(stockData.parameters).some(val => isNaN(val))) {
        showError('Please enter valid numbers for all financial metrics');
        return;
    }

    await analyzeStock(stockData);
}

async function analyzeStock(stockData) {
    showLoading();
    
    try {
        const response = await fetch('/api/analyze-stock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(stockData)
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Analysis failed');
        }

        displayResults(result);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Failed to analyze stock. Please try again.');
    } finally {
        hideLoading();
    }
}

function displayResults(result) {
    const riskClass = `risk-${result.riskLevel.toLowerCase()}`;
    const recommendationClass = `recommendation-${result.recommendation.toLowerCase()}`;
    
    resultsDiv.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b">
                <div>
                    <h2 class="text-3xl font-bold text-gray-800">
                        <i class="fas fa-chart-line mr-2"></i>${result.stockSymbol}
                    </h2>
                    <p class="text-gray-600">Analyzed on ${new Date(result.analyzedAt).toLocaleDateString()}</p>
                </div>
                <div class="flex gap-4 mt-4 md:mt-0">
                    <span class="${recommendationClass} px-4 py-2 rounded-full font-semibold text-sm">
                        <i class="fas fa-bullhorn mr-1"></i>${result.recommendation}
                    </span>
                    <span class="border-l-4 ${riskClass} px-4 py-2 bg-gray-50 rounded">
                        <i class="fas fa-shield-alt mr-1"></i>Risk: ${result.riskLevel}
                    </span>
                    <span class="px-4 py-2 bg-blue-50 text-blue-700 rounded font-semibold">
                        <i class="fas fa-star mr-1"></i>Confidence: ${result.confidenceScore}%
                    </span>
                </div>
            </div>

            <!-- Summary -->
            <div class="mb-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                <h3 class="font-semibold text-lg mb-2 text-gray-800">
                    <i class="fas fa-file-alt mr-2"></i>Executive Summary
                </h3>
                <p class="text-gray-700 leading-relaxed">${result.summary}</p>
            </div>

            <!-- Detailed Analysis -->
            <h3 class="text-xl font-semibold mb-4 text-gray-800">
                <i class="fas fa-search mr-2"></i>Detailed Analysis
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${Object.entries(result.feedback).map(([metric, analysis]) => `
                    <div class="p-4 bg-gray-50 rounded-lg border hover:shadow-md transition">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-${getMetricIcon(metric)} text-blue-500 mr-2"></i>
                            <h4 class="font-semibold text-gray-700 capitalize">${formatMetricName(metric)}</h4>
                        </div>
                        <p class="text-gray-600 text-sm">${analysis}</p>
                    </div>
                `).join('')}
            </div>

            ${result.isFallback ? `
                <div class="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <i class="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
                    <span class="text-yellow-700">Note: Using rule-based analysis (LLM unavailable)</span>
                </div>
            ` : ''}
        </div>
    `;
    
    resultsDiv.classList.remove('hidden');
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

function getMetricIcon(metric) {
    const icons = {
        priceEarningsRatio: 'chart-bar',
        earningsPerShare: 'coins',
        dividendYield: 'percentage',
        marketCap: 'building',
        debtToEquityRatio: 'balance-scale',
        returnOnEquity: 'arrow-up',
        returnOnAssets: 'arrow-up',
        currentRatio: 'exchange-alt',
        quickRatio: 'bolt',
        bookValuePerShare: 'book'
    };
    return icons[metric] || 'chart-line';
}

function formatMetricName(metric) {
    return metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

async function loadSampleData() {
    try {
        const response = await fetch('/api/sample-data');
        const sample = await response.json();
        
        document.getElementById('stockSymbol').value = sample.stockSymbol;
        document.getElementById('peRatio').value = sample.parameters.priceEarningsRatio;
        document.getElementById('eps').value = sample.parameters.earningsPerShare;
        document.getElementById('dividendYield').value = (sample.parameters.dividendYield * 100).toFixed(2);
        document.getElementById('marketCap').value = (sample.parameters.marketCap / 1e9).toFixed(0);
        document.getElementById('debtEquity').value = sample.parameters.debtToEquityRatio;
        document.getElementById('roe').value = (sample.parameters.returnOnEquity * 100).toFixed(1);
        document.getElementById('roa').value = (sample.parameters.returnOnAssets * 100).toFixed(1);
        document.getElementById('currentRatio').value = sample.parameters.currentRatio;
        document.getElementById('quickRatio').value = sample.parameters.quickRatio;
        document.getElementById('bookValue').value = sample.parameters.bookValuePerShare;
        
        showMessage('Sample data loaded! Click "Analyze with AI" to see results.', 'success');
    } catch (error) {
        showError('Failed to load sample data');
    }
}

function showLoading() {
    loadingDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '<i class="fas fa-brain mr-2"></i>Analyze with AI';
}

function showError(message) {
    hideLoading();
    resultsDiv.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-6">
            <div class="flex items-center text-red-700">
                <i class="fas fa-exclamation-circle text-xl mr-3"></i>
                <div>
                    <h3 class="font-semibold">Analysis Error</h3>
                    <p class="mt-1">${message}</p>
                </div>
            </div>
        </div>
    `;
    resultsDiv.classList.remove('hidden');
}

function showMessage(message, type = 'info') {
    const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200';
    const textColor = type === 'success' ? 'text-green-700' : 'text-blue-700';
    
    resultsDiv.innerHTML = `
        <div class="${bgColor} border rounded-lg p-4">
            <div class="flex items-center ${textColor}">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'} mr-3"></i>
                <span>${message}</span>
            </div>
        </div>
    `;
    resultsDiv.classList.remove('hidden');
}