// This proxy config is used by create-react-app to proxy non-static requests to a backend pod-arcade server

const {createProxyMiddleware} = require('http-proxy-middleware');

module.exports = function (app) {
  if (process.env.PROXY_HOST) {
    app.use(
      createProxyMiddleware(['/mqtt', '/config.json'], {
        target: process.env.PROXY_HOST,
        logLevel: 'debug',
        ws: true,
        changeOrigin: true,
      })
    );
  }
};
