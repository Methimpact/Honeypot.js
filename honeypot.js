var dns = require('./dns');
var http = require('http');

// Globals
var ip = '10.0.0.1';
var index, image;

// Set-up the DNS server
var dns_server = dns.createServer(function (req, res) {
	if (req.opcode == 0) {
		console.log('Request from', req.remoteAddress + ':' + req.remotePort, 'for', req.qname);

		res.end(ip);
	}
});

// Set-up the HTTP server
var http_server = http.createServer(function (req, res) {
	if (req.url.indexOf('png') != -1) {
		res.writeHead(200, {'Content-Type': 'image/png'});
		res.end(image);
	} else {
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.end(index);
	}
});

// Load all necessary resources, then bind the servers
var fs = require('fs');
fs.readFile('index.html', function(error, data) {
	index = data;

	fs.readFile('bear.png', function(error, data) {
		image = data;

		dns_server.listen(53, ip);
		http_server.listen(80, ip);
	});
});
