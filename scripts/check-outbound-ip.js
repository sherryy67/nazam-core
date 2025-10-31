#!/usr/bin/env node

/**
 * Utility script to check the actual outbound IP address
 * This IP is what external services (like SMS gateway) see when your server makes requests
 * 
 * Usage: node scripts/check-outbound-ip.js
 */

const smsService = require('../utils/smsService');
const axios = require('axios');

async function checkOutboundIP() {
  console.log('🔍 Checking outbound IP address...\n');
  console.log('This is the IP address that external services see when your server makes outbound requests.');
  console.log('If your SMS provider requires IP whitelisting, THIS is the IP you need to whitelist.\n');
  console.log('─'.repeat(60));

  try {
    // Method 1: Use SMS service method
    console.log('\n📡 Method 1: Using SMS Service getOutboundIP()...');
    try {
      const ip = await smsService.getOutboundIP();
      console.log(`✅ Outbound IP: ${ip}`);
      console.log(`\n⚠️  IMPORTANT: This IP (${ip}) must be whitelisted with your SMS provider!`);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }

    // Method 2: Direct check with multiple services
    console.log('\n📡 Method 2: Checking multiple IP services...');
    const services = [
      { name: 'ipify.org', url: 'https://api.ipify.org?format=json', parser: (data) => data.ip },
      { name: 'myip.com', url: 'https://api.myip.com', parser: (data) => data.ip || data.IPv4 },
      { name: 'ipinfo.io', url: 'https://ipinfo.io/json', parser: (data) => data.ip },
      { name: 'ifconfig.me', url: 'https://ifconfig.me/ip', parser: (data) => data.trim() }
    ];

    const results = [];
    for (const service of services) {
      try {
        const response = await axios.get(service.url, { timeout: 5000 });
        let ip;
        if (typeof response.data === 'string') {
          ip = service.parser(response.data);
        } else {
          ip = service.parser(response.data);
        }
        console.log(`✅ ${service.name}: ${ip}`);
        results.push({ service: service.name, ip });
      } catch (error) {
        console.error(`❌ ${service.name}: Failed - ${error.message}`);
      }
    }

    // Show summary
    if (results.length > 0) {
      const uniqueIPs = [...new Set(results.map(r => r.ip))];
      console.log('\n' + '─'.repeat(60));
      console.log('\n📊 Summary:');
      if (uniqueIPs.length === 1) {
        console.log(`✅ All services agree: Your outbound IP is ${uniqueIPs[0]}`);
        console.log(`\n⚠️  ACTION REQUIRED: Whitelist this IP (${uniqueIPs[0]}) with your SMS provider!`);
      } else {
        console.log(`⚠️  Warning: Multiple IPs detected:`);
        uniqueIPs.forEach((ip, index) => {
          console.log(`   ${index + 1}. ${ip}`);
        });
        console.log(`\n⚠️  You may need to whitelist all of these IPs, or check your network configuration.`);
      }
    }

    // Check against EC2_PUBLIC_IP if set
    const ec2PublicIP = process.env.EC2_PUBLIC_IP;
    if (ec2PublicIP) {
      console.log('\n' + '─'.repeat(60));
      console.log(`\n📋 Environment variable EC2_PUBLIC_IP: ${ec2PublicIP}`);
      if (results.length > 0) {
        const foundIPs = results.map(r => r.ip);
        if (foundIPs.includes(ec2PublicIP)) {
          console.log(`✅ EC2_PUBLIC_IP matches one of the detected outbound IPs.`);
        } else {
          console.log(`⚠️  WARNING: EC2_PUBLIC_IP (${ec2PublicIP}) does NOT match any detected outbound IP!`);
          console.log(`   This means your outbound traffic is using a different IP (possibly through NAT gateway).`);
          console.log(`   You need to whitelist the actual outbound IPs shown above, not ${ec2PublicIP}.`);
        }
      }
    }

    console.log('\n' + '─'.repeat(60));
    console.log('\n💡 Troubleshooting Tips:');
    console.log('   1. If you\'re using AWS EC2, check if you have a NAT Gateway configured');
    console.log('   2. The NAT Gateway\'s Elastic IP might be different from your EC2 instance IP');
    console.log('   3. Contact your SMS provider to whitelist the IP(s) shown above');
    console.log('   4. After whitelisting, wait a few minutes for changes to take effect\n');

  } catch (error) {
    console.error('\n❌ Error checking outbound IP:', error.message);
    process.exit(1);
  }
}

// Run the check
checkOutboundIP();

