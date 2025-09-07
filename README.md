# Cymbal Admin Portal

A modern admin portal for managing files in a RAG (Retrieval-Augmented Generation) system. Built with Node.js, Express, and Bootstrap 5.

## Features

- **Authentication**: Secure login with username/password from environment variables
- **File Management**: View, search, and manage uploaded files
- **Search & Filter**: Advanced search by filename and tag-based filtering
- **Modern UI**: Clean, responsive design with Bootstrap 5 and Google Material Design colors
- **RAG Integration**: Connects to RAG API for file operations

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS templating, Bootstrap 5, jQuery
- **UI Components**: Select2 for tag input, Bootstrap Icons
- **Styling**: Custom CSS with CSS variables for theming

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cymbal-admin
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
# RAG API Configuration
RAG_API_BASE_URL=http://localhost:8000

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Session Secret
SESSION_SECRET=your-secret-key-here
```

5. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3003`

## API Endpoints

- `GET /` - Redirects to login
- `GET /login` - Login page
- `POST /login` - Authenticate user
- `GET /dashboard` - Main dashboard with file list
- `GET /api/files` - API endpoint for file operations
- `GET /search` - Search page (redirects to dashboard)

## Features Overview

### Dashboard
- File statistics (total files, size, unique tags)
- File grid with icons and metadata
- Search and filter functionality
- File actions (download, replace, delete)

### Search Modal
- Search by filename keywords
- Filter by tags using Select2
- Real-time results
- Filter indicators

### File Management
- View file details and metadata
- Download files
- Replace existing files
- Delete files
- Tag-based organization

## Development

### Project Structure
```
cymbal-admin/
├── public/
│   ├── css/           # Stylesheets
│   └── js/            # JavaScript files
├── views/
│   ├── partials/      # EJS partials
│   ├── dashboard.ejs  # Main dashboard
│   └── login.ejs      # Login page
├── server.js          # Express server
├── package.json       # Dependencies
└── .env              # Environment variables
```

### CSS Architecture
- `theme.css` - Global theme variables and common styles
- `login.css` - Login page specific styles
- `dashboard.css` - Dashboard specific styles

### JavaScript Architecture
- `dashboard.js` - Dashboard functionality and search
- Modular functions for file operations
- Select2 integration for tag input

## Configuration

### Environment Variables
- `RAG_API_BASE_URL`: Base URL for the RAG API
- `ADMIN_USERNAME`: Admin login username
- `ADMIN_PASSWORD`: Admin login password
- `SESSION_SECRET`: Secret key for session management
- `PORT`: Server port (default: 3003)

### RAG API Integration
The application integrates with a RAG API that provides:
- File listing with metadata
- Search and filtering capabilities
- Tag-based organization
- File upload and management

## Future Improvements

- [ ] Add pagination for large file lists
- [ ] Implement file upload functionality
- [ ] Add more sorting options
- [ ] Implement user management
- [ ] Add file preview functionality
- [ ] Implement bulk operations

## License

This project is part of the Cymbal RAG system and is intended for internal use.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions, please contact the development team.
