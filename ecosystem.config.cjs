const path = require("node:path");

const apiRoot = __dirname;
const logsDirectory = path.join(apiRoot, "logs");
const applicationName = process.env.PM2_APP_NAME || "finances-api";

const baseProcess = {
  cwd: apiRoot,
  interpreter: "node",
  node_args: "--enable-source-maps",
  exec_mode: "fork",
  instances: 1,
  autorestart: true,
  watch: false,
  source_map_support: true,
  max_memory_restart: "1G",
  restart_delay: 2_000,
  exp_backoff_restart_delay: 100,
  kill_timeout: 15_000,
  max_restarts: 10,
  min_uptime: "10s",
  merge_logs: false,
  env: {
    NODE_ENV: process.env.NODE_ENV || "development",
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
  },
};

module.exports = {
  apps: [
    {
      ...baseProcess,
      name: applicationName,
      script: "dist/server.js",
      out_file: path.join(logsDirectory, "api.out.log"),
      error_file: path.join(logsDirectory, "api.error.log"),
    },
    {
      ...baseProcess,
      name: `${applicationName}-worker`,
      script: "dist/worker/main.js",
      out_file: path.join(logsDirectory, "worker.out.log"),
      error_file: path.join(logsDirectory, "worker.error.log"),
    },
  ],
};
