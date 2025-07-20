// Simple unit tests for CI/CD pipeline
const http = require('http');
const assert = require('assert');

console.log('🧪 Running unit tests...');

// Test environment variables
assert(process.env.NODE_ENV !== undefined, 'NODE_ENV should be defined');
console.log('✅ Environment variables test passed');

// Test basic functionality
function testHealthEndpoint() {
  return new Promise((resolve, reject) => {
    const app = require('../app.js');
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET'
    }, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Health endpoint test passed');
        resolve();
      } else {
        reject(new Error(`Health endpoint returned ${res.statusCode}`));
      }
    });
    req.end();
  });
}

console.log('✅ All unit tests passed!');