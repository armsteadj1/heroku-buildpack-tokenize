const express = require('express');
const morgan = require("morgan");
const { BasisTheory } = require('@basis-theory/basis-theory-js');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');

let bt;

// Create Express Server
const app = express();

// Configuration
const PORT = process.env.PORT;
const API_SERVICE_URL = `http://localhost:${Number.parseInt(process.env.PORT,10)+1}/`;

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

  const routesToToken = {
    "/users": ["the_number", "dope"]
};

// Logging
app.use(morgan('dev'));
app.use(express.json());
app.use(tokenizeMiddleware(routesToToken));

// Proxy endpoints
app.use('/', createProxyMiddleware({
    target: API_SERVICE_URL,
    changeOrigin: true,
    selfHandleResponse: true,
    onProxyReq(proxyReq, req, res) {
      if (req.method == 'POST' && req.body) {
        const body = req.body;

        proxyReq.setHeader('content-length', JSON.stringify(body).length);
      
        proxyReq.write(JSON.stringify(body));
        proxyReq.end();
      }
    },
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        const string = responseBuffer.toString('utf8');
        const json = JSON.parse(string);
        console.log(req.path)
        
        await Promise.all(
            routesToToken[req.path]
        .filter(item => Object.keys(json).includes(item))
        .map(async (keyToTokenize) => {
            const token = await bt.tokens.retrieve(json[keyToTokenize])
    
            json[keyToTokenize] = token.data;
        }))
        
        return Buffer.from(JSON.stringify(json))
      }),
}));

// Start Proxy
app.listen(PORT, async () => {
    bt = await new BasisTheory().init('key_4qUtg83MpoVnDemfJwbzcN'); 
    console.log(`THIS ISN'T RIGHT -- Starting Proxy at ${PORT}`);
});