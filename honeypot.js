var dns = require('./dns');
var fs = require('fs');
var http = require('http');

// Globals
var index = fs.readFileSync('index.html');
var image = fs.readFileSync('bear.png');
var ip = '10.0.0.1';

// The DNS server
var dnsServer = dns.createServer(function (req, res) {
	if (req.opcode == 0) {
		console.log('Request from', req.remoteAddress + ':' + req.remotePort, 'for', req.qname);

		res.end(ip);
	}
}).listen(53, ip);

// The HTTP server
var httpServer = http.createServer(function (req, res) {
	if (req.url.indexOf('png') != -1) {
		res.writeHead(200, {'Content-Type': 'image/png'});
		res.end(image);
	} else {
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.end(index);
	}
}).listen(80, ip);
