// ecosystem.config.js
module.exports = {
  apps: [
    // =========================
    // Backend API (production)
    // =========================
    {
      name: 'sheetbc-api',
      script: 'src/server.js',
      cwd: '/root/kanpur-thakur',

      // Be careful with too many Chrome headless instances; start small and scale.
      instances: 2,                 // was 'max'; use 1-2 unless you really need more
      exec_mode: 'cluster',

      // Logs
      error_file: '/root/kanpur-thakur/logs/api-err.log',
      out_file:   '/root/kanpur-thakur/logs/api-out.log',
      log_file:   '/root/kanpur-thakur/logs/api-combined.log',
      merge_logs: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Resources
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',

      // Stability
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      exp_backoff_restart_delay: 2000,

      // Base env
      env: {
        NODE_ENV: 'production',
        PORT: 3000,

        // >>> Python & Selenium wiring <<<
        PYTHON_BIN: '/root/kanpur-thakur/venv/bin/python',
        CHROME_BIN: '/usr/bin/google-chrome',     // or /usr/bin/google-chrome-stable
        CHROMEDRIVER_PATH: '/usr/bin/chromedriver',
        PYTHONUNBUFFERED: '1'
      },

      // Load additional secrets/config
      env_file: '.env.production',

      // Optional per-mode overrides
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },

    // =========================
    // Frontend DEV server
    // (do NOT run in production)
    // =========================
    {
      name: 'sheetbc-frontend-dev',
      script: 'npm',
      args: 'start',
      cwd: '/root/kanpur-thakur/frontend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,

      // Logs
      error_file: '/root/kanpur-thakur/logs/frontend-err.log',
      out_file:   '/root/kanpur-thakur/logs/frontend-out.log',
      log_file:   '/root/kanpur-thakur/logs/frontend-combined.log',
      merge_logs: true,
      time: true,

      // Only meant for development runs
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        REACT_APP_API_URL: 'http://localhost:3000'
      }
    }
  ],

  // PM2 deploy (optional)
  deploy: {
    production: {
      user: 'root',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/sheetbc.git',
      path: '/root/kanpur-thakur',
      'post-deploy':
        'npm install && cd frontend && npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};