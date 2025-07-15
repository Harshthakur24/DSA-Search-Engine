// DOM Elements
const searchInput = document.getElementById('searchInput');
const resultsGrid = document.getElementById('resultsGrid');
const loadingContainer = document.getElementById('loadingContainer');
const noResults = document.getElementById('noResults');
const resultsCounter = document.getElementById('resultsCounter');
const resultsCount = document.getElementById('resultsCount');

// State Management
let currentQuery = '';
let searchTimeout = null;
let isSearching = false;
let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');

// Configuration
const SEARCH_DELAY = 500; // ms delay for auto-search
const MIN_QUERY_LENGTH = 2;
const MAX_HISTORY_ITEMS = 10;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    addInitialAnimations();
    showWelcomeMessage();
}

function setupEventListeners() {
    // Search input event listener
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleKeyDown);
    searchInput.addEventListener('focus', handleSearchFocus);
    searchInput.addEventListener('blur', handleSearchBlur);
    
    // Prevent form submission
    document.addEventListener('submit', (e) => e.preventDefault());
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeyDown);
}

function handleSearchInput(event) {
    const query = event.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // If query is empty, clear results
    if (!query) {
        clearResults();
        return;
    }
    
    // If query is too short, don't search
    if (query.length < MIN_QUERY_LENGTH) {
        return;
    }
    
    // Set debounced search
    searchTimeout = setTimeout(() => {
        if (query !== currentQuery) {
            performSearch(query);
        }
    }, SEARCH_DELAY);
}

function handleKeyDown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const query = event.target.value.trim();
        if (query.length >= MIN_QUERY_LENGTH) {
            clearTimeout(searchTimeout);
            performSearch(query);
        }
    }
    
    if (event.key === 'Escape') {
        event.target.blur();
        clearResults();
    }
}

function handleSearchFocus() {
    searchInput.parentElement.classList.add('focused');
}

function handleSearchBlur() {
    searchInput.parentElement.classList.remove('focused');
}

function handleGlobalKeyDown(event) {
    // Focus search with Ctrl/Cmd + K
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        searchInput.focus();
    }
}

async function performSearch(query) {
    if (isSearching) return;
    
    currentQuery = query;
    isSearching = true;
    
    // Update UI to show loading state
    showLoadingState();
    
    // Add to search history
    addToSearchHistory(query);
    
    try {
        const response = await fetch(`/search?question=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Add delay to show loading animation (for better UX)
        await new Promise(resolve => setTimeout(resolve, 300));
        
        displayResults(data, query);
        
    } catch (error) {
        console.error('Search error:', error);
        showErrorState();
    } finally {
        isSearching = false;
    }
}

function showLoadingState() {
    hideAllStates();
    loadingContainer.style.display = 'block';
    loadingContainer.classList.add('fade-in');
}

function displayResults(data, query) {
    hideAllStates();
    
    // Check if no results
    if (!data || data.length === 0 || (data[0] && data[0].title === 0)) {
        showNoResults();
        return;
    }
    
    // Filter out invalid results
    const validResults = data.filter(item => item.title && item.title !== 0);
    
    if (validResults.length === 0) {
        showNoResults();
        return;
    }
    
    // Display results
    resultsGrid.innerHTML = '';
    resultsGrid.style.display = 'grid';
    
    validResults.forEach((result, index) => {
        const resultCard = createResultCard(result, index);
        resultsGrid.appendChild(resultCard);
    });
    
    // Update results counter
    updateResultsCounter(validResults.length, query);
    
    // Animate results
    animateResults();
}

function createResultCard(result, index) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.setAttribute('tabindex', '0');
    card.style.animationDelay = `${index * 0.1}s`;
    
    // Clean up the result data
    const title = result.title || 'Untitled Problem';
    const url = result.url || '#';
    const description = result.question_body || 'No description available';
    
    card.innerHTML = `
        <div class="result-title">${escapeHtml(title)}</div>
        <div class="result-url">
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
                <i class="fas fa-external-link-alt"></i>
                View Problem
            </a>
        </div>
        <div class="result-description">${escapeHtml(description)}</div>
    `;
    
    // Add click handler
    card.addEventListener('click', () => {
        const link = card.querySelector('a');
        if (link) {
            window.open(link.href, '_blank', 'noopener,noreferrer');
        }
    });
    
    // Add keyboard handler
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            card.click();
        }
    });
    
    return card;
}

function showNoResults() {
    hideAllStates();
    noResults.style.display = 'block';
    noResults.classList.add('fade-in');
    updateResultsCounter(0, currentQuery);
}

function showErrorState() {
    hideAllStates();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-state';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Search Error</h3>
            <p>Something went wrong while searching. Please try again.</p>
            <button onclick="retrySearch()" class="retry-btn">
                <i class="fas fa-redo"></i>
                Retry Search
            </button>
        </div>
    `;
    
    resultsGrid.innerHTML = '';
    resultsGrid.appendChild(errorDiv);
    resultsGrid.style.display = 'block';
}

function hideAllStates() {
    loadingContainer.style.display = 'none';
    noResults.style.display = 'none';
    resultsGrid.style.display = 'none';
    resultsCounter.style.display = 'none';
    
    // Remove animation classes
    loadingContainer.classList.remove('fade-in');
    noResults.classList.remove('fade-in');
}

function clearResults() {
    hideAllStates();
    currentQuery = '';
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
}

function updateResultsCounter(count, query) {
    resultsCount.textContent = count;
    resultsCounter.style.display = 'block';
    resultsCounter.classList.add('fade-in');
}

function animateResults() {
    const cards = resultsGrid.querySelectorAll('.result-card');
    cards.forEach((card, index) => {
        card.style.animation = 'none';
        card.offsetHeight; // Trigger reflow
        card.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1}s both`;
    });
}

function addToSearchHistory(query) {
    // Remove if already exists
    const index = searchHistory.indexOf(query);
    if (index > -1) {
        searchHistory.splice(index, 1);
    }
    
    // Add to beginning
    searchHistory.unshift(query);
    
    // Limit history size
    if (searchHistory.length > MAX_HISTORY_ITEMS) {
        searchHistory = searchHistory.slice(0, MAX_HISTORY_ITEMS);
    }
    
    // Save to localStorage
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

function addInitialAnimations() {
    // Add stagger animation to initial elements
    const animatedElements = document.querySelectorAll('.header, .search-section, .results-section');
    animatedElements.forEach((element, index) => {
        element.style.animationDelay = `${index * 0.2}s`;
    });
}

function showWelcomeMessage() {
    // Show a subtle welcome animation
    setTimeout(() => {
        searchInput.placeholder = searchInput.placeholder;
    }, 1000);
}

// Global functions for suggestion chips
window.searchSuggestion = function(suggestion) {
    searchInput.value = suggestion;
    searchInput.focus();
    performSearch(suggestion);
};

window.retrySearch = function() {
    if (currentQuery) {
        performSearch(currentQuery);
    }
};

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Performance optimization
const optimizedSearch = debounce(performSearch, SEARCH_DELAY);

// Export for debugging (development only)
if (window.location.hostname === 'localhost') {
    window.searchDebug = {
        currentQuery,
        searchHistory,
        performSearch,
        clearResults,
        isSearching
    };
}