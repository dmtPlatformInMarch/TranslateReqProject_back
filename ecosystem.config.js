module.exports = {
    apps: [
        {
            name: 'WAS',
            script: './app.js',
            instances: 2,
            exec_mode: 'cluster',
            merge_logs: true,
            autorestart: true,
            watch: false,
            max_memory_restart: '2G',
            env_development: {
                PROT: 3085,
                NODE_ENV: 'development'
            },
            env_production: {
                PROT: 3085,
                NODE_ENV: 'production'
            },
            output: './logs/console.log',
            error: './logs/consoleError.log'
        }
    ],
    ignore_watch: [
        "node_modules",
        "uploads",
    ]
}