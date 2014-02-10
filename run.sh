#!/bin/bash

echo "Changing MAC address"
ip link set wlan0 down
ip link set dev wlan0 address da:62:75:d6:36:85
ip link set wlan0 up

echo "Putting up wlan0 interface"
ip addr add 10.0.0.1/24 dev wlan0

echo "Backing up iptables"
iptables-save > backup.rules

echo "Opening up ports"
iptables -A INPUT -p udp -m udp --dport 53 -j ACCEPT
iptables -A INPUT -p tcp -m tcp --dport 80 -j ACCEPT

echo "Starting DNS/HTTP server"
node honeypot.js &

echo "Starting dhcpd"
dhcpd -q wlan0 &

echo "Starting hostapd"
hostapd hostapd.conf

echo "Shutting down"
killall dhcpd
killall node

echo "Taking down wlan0 interface"
ip addr del 10.0.0.1/24 dev wlan0
ip link set dev wlan0 down

echo "Restoring iptables"
iptables-restore < backup.rules
rm backup.rules
