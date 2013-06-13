var dgram = require('dgram');

 // FIXME: kind of only supports 1 query
function parseRequest(packet) {
	var flags = packet.slice(2, 4);

	return {
		txid: packet.readUInt16BE(0), // Transaction Identification

		// QR: (flags[0] >> 7), // 1 bit
		opcode: (flags[0] >> 3) & 15, // 4 bits
		// AA: (flags[0] >> 2) & 1, // 1 bit
		// TC: (flags[0] >> 1) & 1, // 1 bit
		// RD: (flags[0] >> 0) & 1, // 1 bit

		// RA: (flags[1] >> 7) & 1, // 1 bit
		// Z: (flags[1] >> 4) & 7, // 3 bit
		// RCODE: (flags[1] >> 0) & 15, // 4 bits

		questions: packet.readUInt16BE(4), // Total Questions
		// answerRRs: packet.readUInt16BE(6), // Total AnswerRRs
		// authorityRRs: packet.readUInt16BE(8), // Total AuthorityRRs
		// additionalRRs: packet.readUInt16BE(10), // Total AdditionalRRs

		qname: parseQname(packet), // FIXME: Assumes at least (and at most) 1 question
		_raw_queries: packet.slice(12)
	}
}

// Parses a list of variable length strings until a string length of 0
function parseQname(packet) {
	var strings = [];

	var ws = packet.slice(12);
	var n = ws[0];

	// read until 0
	while (n > 1) {
		// extract the string
		str = ws.slice(1, 1 + n);
		strings.push(str);

		// truncate, read next n
		ws = ws.slice(1 + n)
		n = ws[0];
	}

	return strings.join('.');
}

//========================================

function createResponse(req, ip) {
	var qlen = req._raw_queries.length;
	var alen = 12 + ip.length; // FIXME: only supports 1 answer

	var buffer_size = 12 + qlen + alen;

	var res = new Buffer(buffer_size);
	res.writeUInt16BE(req.txid, 0);
	res.writeUInt16BE(33152, 2); // Standard query response flags, no error

	res.writeUInt16BE(req.questions, 4); // Total Questions
	res.writeUInt16BE(1, 6); // Total AnswerRRs // FIXME: only supports 1 answer
	res.writeUInt16BE(0, 8); // Total AuthorityRRs
	res.writeUInt16BE(0, 10); // Total AdditionalRRs

	req._raw_queries.copy(res, 12, 0);

	// FIXME: only supports 1 answer
	res.writeUInt16BE(49164, 12 + qlen); // ???, some form of shortcut to eliminate repeating the QName, 16bit
	res.writeUInt16BE(1, 14 + qlen); // 0x0001, A-Name, 16bit
	res.writeUInt16BE(1, 16 + qlen); // 0x0001, Class IN, 16bit
	res.writeUInt32BE(60, 18 + qlen); // TTL of 60s, 32bit

	res.writeUInt16BE(ip.length, 22 + qlen); // Data length, 16bit

	var offset = 24 + qlen;
	ip.forEach(function(octet) {
		res.writeUInt8(octet, offset);
		offset += 1;
	});

	return res;
}

//========================================

function createServer(callback) {
	var socket = dgram.createSocket("udp4");

	if (callback) {
		socket.on("message", function(packet, rinfo) {
			var req = parseRequest(packet);
			req.remoteAddress = rinfo.address;
			req.remotePort = rinfo.port;

			var rpacket;
			var res = {
				end: function(address) {
					var baddress = address.split('.').map(function(x) { return parseInt(x); });

					rpacket = createResponse(req, baddress);
				}
			}

			callback(req, res);

			socket.send(rpacket, 0, rpacket.length, rinfo.port, rinfo.address);
		});
	}

	return {
		listen: function(port, ip) {
			socket.bind(port, ip);
		}
	}
}

module.exports = {
	createServer: createServer
}
