const express = require('express');
const morgan = require("morgan");
const { BasisTheory } = require('@basis-theory/basis-theory-js');
const { createProxyMiddleware } = require('http-proxy-middleware');

let bt;

// Create Express Server
const app = express();

// Configuration
const PORT = 3000;
const HOST = "localhost";
const API_SERVICE_URL = "http://localhost:3001/";

const tokenizeMiddleware = (options) => 
  (req, res, next) => {
    console.log(req.path, req.body, Object.keys(req.body));

    if(Object.keys(options).includes(req.path)) {
      Promise.all(options[req.path]
      .filter(item => Object.keys(req.body).includes(item))
      .map(async (keyToTokenize) => {
        const token = await bt.tokens.create({
          type: 'token',
          data: req.body[keyToTokenize],
        })

        req.body[keyToTokenize] = token.id

        console.log("hi", req.body[keyToTokenize])
      })).then(() => {
        req.headers['content-length'] = JSON.stringify(req.body).length;
        next();
      })
    }   
  };

// Logging
app.use(morgan('dev'));
app.use(express.json());
app.use(tokenizeMiddleware({"/users": ["the_number", "dope"]}));

// Proxy endpoints
app.use('/', createProxyMiddleware({
    target: API_SERVICE_URL,
    changeOrigin: true,
    onProxyReq(proxyReq, req, res) {
      if (req.method == 'POST' && req.body) {
        const body = req.body;
    
        console.log(body);

        proxyReq.setHeader('content-length', JSON.stringify(body).length);
      
        proxyReq.write(JSON.stringify(body));
        proxyReq.end();
      }
    },
}));

// Start Proxy
app.listen(PORT, HOST, async () => {
    bt = await new BasisTheory().init('key_4qUtg83MpoVnDemfJwbzcN'); 
    console.log(`THIS ISN'T RIGHT -- Starting Proxy at ${HOST}:${PORT}`);
});