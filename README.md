# SheetBC - Scalable File Upload and Data Management System

A scalable Express.js API with PostgreSQL backend and React frontend for uploading and processing CSV/TXT files containing NPA, NXX, ZIP, STATE, CITY, and RC data.

## Features

### Backend (Express.js + PostgreSQL)
- **Scalable Architecture**: Connection pooling, batch processing, and optimized queries
- **File Upload**: Support for CSV and TXT files with validation
- **Authentication**: PIN-based login system with JWT tokens
- **Background Processing**: Asynchronous file processing with status tracking
- **RESTful API**: Complete CRUD operations for records and uploads
- **Search & Filtering**: Advanced search capabilities with pagination
- **Security**: Rate limiting, CORS, helmet, input validation, and authentication
- **Error Handling**: Comprehensive error handling and logging

### Frontend (React + Ant Design)
- **Modern UI**: Beautiful and responsive interface using Ant Design
- **File Upload**: Drag-and-drop file upload with progress tracking
- **Data Table**: Advanced table with sorting, filtering, and pagination
- **Dashboard**: Real-time statistics and overview
- **Upload History**: Track all file uploads and their processing status

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** with connection pooling
- **Multer** for file uploads
- **CSV Parser** for file processing
- **Joi** for validation
- **Winston** for logging
- **Helmet** for security

### Frontend
- **React** with TypeScript
- **Ant Design** for UI components
- **Axios** for API communication
- **React Dropzone** for file uploads
- **Date-fns** for date formatting

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd sheetbc
```

### 2. Backend Setup

```bash
# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit .env file with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=sheetbc_db
# DB_USER=postgres
# DB_PASSWORD=your_password

# Create PostgreSQL database
createdb sheetbc_db

# Run database migrations
npm run migrate

# If you encounter file_path column errors, run this additional migration:
npm run migrate:add-filepath

# If you encounter type mismatch errors, run this migration:
npm run migrate:update-types

# If you still have type issues, recreate the uploads table:
npm run migrate:recreate-uploads

# Seed the database with states data
npm run seed

# Start the development server
npm run dev
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

## API Endpoints

### File Upload
- `POST /api/v1/upload` - Upload CSV/TXT file
- `GET /api/v1/status/:id` - Get upload status
- `GET /api/v1/uploads` - Get all uploads
- `GET /api/v1/stats` - Get upload statistics
- `DELETE /api/v1/uploads/:id` - Delete upload

### File Management
- `GET /api/v1/files/stats` - Get file statistics for a specific date
- `GET /api/v1/files/directory-stats` - Get upload directory statistics
- `GET /api/v1/files/range-stats` - Get file statistics for a date range
- `POST /api/v1/files/cleanup` - Clean up old files

### Records
- `GET /api/v1/records` - Get all records with pagination
- `GET /api/v1/records/:id` - Get record by ID
- `GET /api/v1/search` - Search records
- `GET /api/v1/records/npa/:npa/nxx/:nxx` - Get records by NPA/NXX
- `GET /api/v1/records/zip/:zip` - Get records by ZIP
- `GET /api/v1/records/state/:state` - Get records by state
- `GET /api/v1/stats` - Get record statistics
- `DELETE /api/v1/records/:id` - Delete record

### States
- `GET /api/v1/states` - Get all states with pagination
- `GET /api/v1/states/:id` - Get state by ID
- `GET /api/v1/states/code/:code` - Get state by code
- `GET /api/v1/states/region/:region` - Get states by region
- `GET /api/v1/regions` - Get all regions
- `GET /api/v1/states/search` - Search states
- `GET /api/v1/states/stats` - Get state statistics
- `POST /api/v1/states` - Create new state
- `PUT /api/v1/states/:id` - Update state
- `DELETE /api/v1/states/:id` - Delete state

## File Format

The system expects files in the following format:

### CSV Format
```csv
NPA,NXX,ZIP,STATE,CITY,RC
000,000,00000,XX,Released August 4 2020,XXXXXXXXXX
001,001,00001,YY,Another City,YYYYYYYYYY
```

### TXT Format
```
000,000,00000,XX,Released August 4 2020,XXXXXXXXXX
001,001,00001,YY,Another City,YYYYYYYYYY
```

## Database Schema

### Records Table
```sql
CREATE TABLE records (
  id SERIAL PRIMARY KEY,
  npa VARCHAR(3) NOT NULL,
  nxx VARCHAR(3) NOT NULL,
  zip VARCHAR(5) NOT NULL,
  state_id INTEGER REFERENCES states(id),
  state_code VARCHAR(2) NOT NULL,
  city TEXT NOT NULL,
  rc TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### States Table
```sql
CREATE TABLE states (
  id SERIAL PRIMARY KEY,
  state_code VARCHAR(2) UNIQUE NOT NULL,
  state_name VARCHAR(100) NOT NULL,
  region VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### File Uploads Table
```sql
CREATE TABLE file_uploads (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_path TEXT,
  records_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'processing',
  error_message VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  CONSTRAINT check_status CHECK (status IN ('processing', 'completed', 'failed')),
  CONSTRAINT check_records_count CHECK (records_count >= 0)
);
```

## Scalability Features

### Backend
- **Connection Pooling**: Efficient database connection management
- **Batch Processing**: Process records in batches of 1000
- **Indexed Queries**: Optimized database indexes for fast searches
- **Rate Limiting**: Prevent API abuse
- **Compression**: Reduce bandwidth usage
- **Error Handling**: Graceful error handling and recovery
- **Date-based File Organization**: Files organized by YYYY/MM/DD structure
- **Automatic File Cleanup**: Configurable retention policy for old files
- **File Statistics**: Comprehensive file management and monitoring

### Frontend
- **Lazy Loading**: Load data on demand
- **Pagination**: Handle large datasets efficiently
- **Search Optimization**: Debounced search with proper indexing
- **Responsive Design**: Works on all device sizes

## Development

### Backend Scripts
```bash
npm run dev          # Start development server
npm start           # Start production server
npm run migrate     # Run database migrations
npm run migrate:add-filepath  # Add file_path column (if needed)
npm run migrate:update-types  # Fix column type mismatches (if needed)
npm run migrate:recreate-uploads  # Recreate uploads table (if needed)
npm run seed        # Seed database with states data
npm run test        # Run tests
```

### Frontend Scripts
```bash
npm start           # Start development server
npm run build       # Build for production
npm test            # Run tests
```

## Environment Variables

### Backend (.env)
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sheetbc_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

## Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Configure production database
3. Set up proper logging
4. Use PM2 or similar process manager
5. Configure reverse proxy (nginx)

### Frontend
1. Build the application: `npm run build`
2. Serve static files with nginx or similar
3. Configure API proxy

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
