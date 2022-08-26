module.exports = {
    apps: [
        {
            name: 'WAS',
            script: './app.js',
            instances: 2,
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            wait_ready: true,
            listen_timeout: 50000,
            max_memory_restart: '2G',
            env_production: {
                PORT: 3085,
                NODE_ENV: 'production'
            },
            env_development: {
                PORT: 3085,
                NODE_ENV: 'development'
            },
        }
    ],
    ignore_watch: [
        "node_modules",
        "uploads",
    ]
}