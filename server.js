const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const axios = require('axios');
const multer = require('multer');

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

// RAG API base URL and authentication
const RAG_API_BASE_URL = process.env.RAG_API_BASE_URL || 'http://localhost:8000';
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN;

// RAG API authentication helper
const getRAGAPIAuth = () => {
  const auth = {};
  
  if (API_AUTH_TOKEN) {
    auth.token = API_AUTH_TOKEN;
  }
  
  return auth;
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (req.session.isAuthenticated) {
    next();
  } else {
    // For API routes, return 401, for page routes, redirect to login
    if (req.path.startsWith('/api/')) {
      res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    } else {
      res.redirect('/login');
    }
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
        search: '',
        ...getRAGAPIAuth()
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

    const response = await axios.get(`${RAG_API_BASE_URL}/api/v1/files/list`, { 
      params: {
        ...params,
        ...getRAGAPIAuth()
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching files:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch files' 
    });
  }
});

// API route to download a file
app.get('/api/files/download', requireAuth, async (req, res) => {
  try {
    const filename = req.query.filename;
    
    if (!filename) {
      return res.status(400).json({ 
        success: false, 
        error: 'Filename is required' 
      });
    }

    // Forward the download request to RAG API
    const response = await axios.get(`${RAG_API_BASE_URL}/api/v1/files/view`, {
      params: { 
        filename,
        ...getRAGAPIAuth()
      },
      responseType: 'stream'
    });

    // Set appropriate headers for file download
    res.set({
      'Content-Type': response.headers['content-type'] || 'application/octet-stream',
      'Content-Disposition': response.headers['content-disposition'] || `attachment; filename="${filename}"`,
      'Content-Length': response.headers['content-length']
    });

    // Handle errors in the stream
    response.data.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          error: 'Error downloading file' 
        });
      }
    });

    // Pipe the file stream to the response
    response.data.pipe(res);

  } catch (error) {
    console.error('Error downloading file:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to download file' 
      });
    }
  }
});

// API route to delete a file
app.delete('/api/files/delete', requireAuth, async (req, res) => {
  try {
    const filename = req.query.filename;
    
    if (!filename) {
      return res.status(400).json({ 
        success: false, 
        error: 'Filename is required' 
      });
    }

    // Forward the delete request to RAG API
    const response = await axios.delete(`${RAG_API_BASE_URL}/api/v1/upload/delete`, {
      params: { 
        filename,
        ...getRAGAPIAuth()
      }
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

// API route to get file embedding stats
app.get('/api/files/stats', requireAuth, async (req, res) => {
  try {
    const filename = req.query.filename;
    
    if (!filename) {
      return res.status(400).json({ 
        success: false, 
        error: 'Filename is required' 
      });
    }

    // Forward the stats request to RAG API
    const response = await axios.get(`${RAG_API_BASE_URL}/api/v1/files/embedding-stats`, {
      params: { 
        filename,
        ...getRAGAPIAuth()
      }
    });

    res.json(response.data);

  } catch (error) {
    console.error('Error fetching file stats:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch file statistics' 
    });
  }
});

// API route to validate file
app.post('/api/files/validate', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file provided' 
      });
    }

    // Prepare form data for RAG API
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    formData.append('replace_existing', req.body.replace_existing || 'false');

    // Forward validation request to RAG API
    const response = await axios.post(`${RAG_API_BASE_URL}/api/v1/file/validate`, formData, {
      params: getRAGAPIAuth(),
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });

    res.json(response.data);

  } catch (error) {
    console.error('Error validating file:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to validate file' 
      });
    }
  }
});

// API route to upload file
app.post('/api/files/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file provided' 
      });
    }

    // Prepare form data for RAG API
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    formData.append('replace_existing', req.body.replace_existing || 'true');
    
    // Add tags if provided
    if (req.body.tags) {
      formData.append('tags', req.body.tags);
    }

    // Forward upload request to RAG API
    const response = await axios.post(`${RAG_API_BASE_URL}/api/v1/upload/direct`, formData, {
      params: getRAGAPIAuth(),
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });

    res.json(response.data);

  } catch (error) {
    console.error('Error uploading file:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to upload file' 
      });
    }
  }
});

// Delete file route
app.delete('/api/files/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const response = await axios.delete(`${RAG_API_BASE_URL}/api/v1/upload/delete`, {
      params: { 
        filename,
        ...getRAGAPIAuth()
      }
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`RAG API Base URL: ${RAG_API_BASE_URL}`);
  console.log(`API Authentication: ${API_AUTH_TOKEN ? 'Token-based' : 'None'}`);
});
