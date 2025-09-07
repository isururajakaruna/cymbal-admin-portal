const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// RAG API base URL
const RAG_API_BASE_URL = process.env.RAG_API_BASE_URL || 'http://localhost:8000';

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (req.session.isAuthenticated) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes
app.get('/', (req, res) => {
  if (req.session.isAuthenticated) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Login routes
app.get('/login', (req, res) => {
  if (req.session.isAuthenticated) {
    res.redirect('/dashboard');
  } else {
    res.render('login', { error: null });
  }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (username === adminUsername && password === adminPassword) {
    req.session.isAuthenticated = true;
    res.redirect('/dashboard');
  } else {
    res.render('login', { error: 'Invalid username or password' });
  }
});

// Logout route
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

// Dashboard route
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // Fetch files from RAG API
    const response = await axios.get(`${RAG_API_BASE_URL}/api/v1/files/list`, {
      params: {
        sort_by: 'date',
        limit: 50,
        offset: 0,
        search: ''
      }
    });

    const files = response.data.files || [];
    res.render('dashboard', { files, error: null });
  } catch (error) {
    console.error('Error fetching files:', error.message);
    res.render('dashboard', { 
      files: [], 
      error: 'Failed to fetch files. Please check if the RAG API is running.' 
    });
  }
});

// API route to get files (for AJAX calls)
app.get('/api/files', requireAuth, async (req, res) => {
  try {
    const params = {
      sort_by: req.query.sort_by || 'date',
      limit: req.query.limit || 50,
      offset: req.query.offset || 0,
      search: req.query.search || ''
    };

    // Add tag filtering if provided
    if (req.query.tags) {
      params.tags = req.query.tags;
    }

    const response = await axios.get(`${RAG_API_BASE_URL}/api/v1/files/list`, { params });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching files:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch files' 
    });
  }
});

// Delete file route
app.delete('/api/files/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const response = await axios.delete(`${RAG_API_BASE_URL}/api/v1/upload/delete`, {
      params: { filename }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error deleting file:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete file' 
    });
  }
});

// Upload page route
app.get('/upload', requireAuth, (req, res) => {
  res.render('upload');
});

// Search page route (kept for backward compatibility, but now using modal)
app.get('/search', requireAuth, (req, res) => {
  res.redirect('/dashboard');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`RAG API Base URL: ${RAG_API_BASE_URL}`);
});
