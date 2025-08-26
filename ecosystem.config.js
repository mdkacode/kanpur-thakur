module.exports = {
  apps: [
    // Backend API Service
    {
      name: 'sheetbc-api',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: '.env.production',
      error_file: '/root/kanpur-thakur/logs/api-err.log',
      out_file: '/root/kanpur-thakur/logs/api-out.log',
      log_file: '/root/kanpur-thakur/logs/api-combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      
      // Restart policy
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Environment variables
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    
    // Frontend Development Server (Optional - for development)
    {
      name: 'sheetbc-frontend-dev',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        REACT_APP_API_URL: 'http://localhost:3000'
      },
      error_file: '/root/kanpur-thakur/logs/frontend-err.log',
      out_file: '/root/kanpur-thakur/logs/frontend-out.log',
      log_file: '/root/kanpur-thakur/logs/frontend-combined.log',
      time: true,
      max_memory_restart: '512M',
      
      // Restart policy
      autorestart: true,
      watch: false,
      max_restarts: 5,
      min_uptime: '10s',
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Only start in development mode
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        REACT_APP_API_URL: 'http://localhost:3000'
      }
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'root',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/sheetbc.git',
      path: '/root/kanpur-thakur',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && cd frontend && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
