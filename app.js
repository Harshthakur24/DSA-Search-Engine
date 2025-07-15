const express = require('express');
const ejs = require('ejs');
const path = require('path');
const controller = require('./controllers/controller');

// Initialize Express app
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Load routes
controller(app);

// 404 handler
app.use((req, res) => {
    res.status(404).render('index');
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Something went wrong. Please try again later.'
    });
});

// Only start server if not in serverless environment
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 DSA Search Engine is running on port ${PORT}`);
        console.log(`🌐 Access the app at: http://localhost:${PORT}`);
    });
}

module.exports = app;