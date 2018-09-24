const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const port = 8000

http.createServer(function (req, res) {

  const parsedUrl = url.parse(req.url);
  let pathname = `${__dirname}${__dirname.endsWith("examples") ? '/..' : '' }${parsedUrl.pathname}`;
  let ext = path.parse(pathname).ext;

  const exts = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpeg': 'audio/jpeg',
    '.jpg': 'image/jpeg',
    '.webp': 'audio/webp',
    '.svg': 'image/svg+xml',
  };

  if (pathname == `${__dirname}${__dirname.endsWith("examples") ? '/..' : '' }/`) {
    pathname += 'examples/';
    ext = '.html';
  }

  fs.exists(pathname, function (exist) {
    if(!exist) {
      res.statusCode = 404;
      res.end('404');
      return;
    }

    if (fs.statSync(pathname).isDirectory()) pathname += 'index.html';

    fs.readFile(pathname, function(err, data){
      res.setHeader('Content-type', exts[ext] || 'text/plain' );
      res.end(data);
    });
  });


}).listen(parseInt(port));

console.log(`Server listening on port ${port}`);
