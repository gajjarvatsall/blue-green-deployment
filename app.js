const express = require('express');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = process.env.VERSION || '1.0.0';
const ENVIRONMENT = process.env.ENVIRONMENT || 'blue';

// Middleware
app.use(express.json());
app.use(express.static('public'));

// In-memory data store (simulating a database)
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin', createdAt: new Date() },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user', createdAt: new Date() },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user', createdAt: new Date() }
];

let orders = [
  { id: 1, userId: 1, product: 'Laptop', quantity: 1, price: 999.99, status: 'completed' },
  { id: 2, userId: 2, product: 'Mouse', quantity: 2, price: 29.99, status: 'pending' },
  { id: 3, userId: 3, product: 'Keyboard', quantity: 1, price: 79.99, status: 'shipped' }
];

// Application state
let appState = {
  startTime: new Date(),
  requestCount: 0,
  errorCount: 0,
  lastError: null,
  features: {
    userManagement: VERSION >= '2.0.0',
    advancedSearch: VERSION >= '2.1.0',
    realTimeNotifications: VERSION >= '2.2.0',
    analytics: VERSION >= '3.0.0'
  }
};

// Middleware to track requests
app.use((req, res, next) => {
  appState.requestCount++;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  appState.errorCount++;
  appState.lastError = {
    message: err.message,
    timestamp: new Date(),
    path: req.path
  };
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', version: VERSION });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    version: VERSION,
    environment: ENVIRONMENT,
    hostname: os.hostname(),
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    requests: appState.requestCount,
    errors: appState.errorCount,
    features: appState.features
  };
  
  res.status(200).json(healthStatus);
});

// Readiness probe endpoint
app.get('/ready', (req, res) => {
  // Simulate startup time and dependency checks
  const uptime = process.uptime();
  
  if (uptime < 5) {
    return res.status(503).json({
      status: 'not ready',
      message: 'Application is starting up',
      uptime: uptime
    });
  }
  
  // Simulate database connection check
  const dbConnected = Math.random() > 0.1; // 90% success rate
  
  if (!dbConnected) {
    return res.status(503).json({
      status: 'not ready',
      message: 'Database connection failed',
      uptime: uptime
    });
  }
  
  res.status(200).json({
    status: 'ready',
    version: VERSION,
    environment: ENVIRONMENT,
    uptime: uptime,
    database: 'connected'
  });
});

// Liveness probe endpoint
app.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    version: VERSION,
    environment: ENVIRONMENT,
    timestamp: new Date().toISOString()
  });
});

// Main application endpoint
app.get('/', (req, res) => {
  const welcomeMessage = VERSION >= '2.0.0' ? 
    'Welcome to the Enhanced E-Commerce Platform!' : 
    'Welcome to the E-Commerce Platform!';
    
  res.json({
    message: welcomeMessage,
    version: VERSION,
    environment: ENVIRONMENT,
    hostname: os.hostname(),
    timestamp: new Date().toISOString(),
    features: appState.features,
    stats: {
      totalUsers: users.length,
      totalOrders: orders.length,
      uptime: Math.floor(process.uptime())
    }
  });
});

// API Routes

// Get all users
app.get('/api/users', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  
  const paginatedUsers = users.slice(offset, offset + limit);
  
  res.json({
    users: paginatedUsers,
    total: users.length,
    limit,
    offset,
    version: VERSION
  });
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
});

// Create user (v2.0+ feature)
app.post('/api/users', (req, res) => {
  if (!appState.features.userManagement) {
    return res.status(501).json({ 
      error: 'User creation not available in this version',
      version: VERSION,
      requiredVersion: '2.0.0+'
    });
  }
  
  const { name, email, role } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  const newUser = {
    id: users.length + 1,
    name,
    email,
    role: role || 'user',
    createdAt: new Date()
  };
  
  users.push(newUser);
  res.status(201).json(newUser);
});

// Get orders
app.get('/api/orders', (req, res) => {
  const userId = req.query.userId;
  let filteredOrders = orders;
  
  if (userId) {
    filteredOrders = orders.filter(o => o.userId === parseInt(userId));
  }
  
  res.json({
    orders: filteredOrders,
    total: filteredOrders.length,
    version: VERSION
  });
});

// Search functionality (v2.1+ feature)
app.get('/api/search', (req, res) => {
  if (!appState.features.advancedSearch) {
    return res.status(501).json({ 
      error: 'Advanced search not available in this version',
      version: VERSION,
      requiredVersion: '2.1.0+'
    });
  }
  
  const { q, type } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }
  
  let results = [];
  
  if (!type || type === 'users') {
    const userResults = users.filter(u => 
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase())
    );
    results = results.concat(userResults.map(u => ({ type: 'user', data: u })));
  }
  
  if (!type || type === 'orders') {
    const orderResults = orders.filter(o => 
      o.product.toLowerCase().includes(q.toLowerCase()) ||
      o.status.toLowerCase().includes(q.toLowerCase())
    );
    results = results.concat(orderResults.map(o => ({ type: 'order', data: o })));
  }
  
  res.json({
    query: q,
    results,
    total: results.length,
    version: VERSION
  });
});

// Analytics endpoint (v3.0+ feature)
app.get('/api/analytics', (req, res) => {
  if (!appState.features.analytics) {
    return res.status(501).json({ 
      error: 'Analytics not available in this version',
      version: VERSION,
      requiredVersion: '3.0.0+'
    });
  }
  
  const totalRevenue = orders.reduce((sum, order) => sum + order.price, 0);
  const ordersByStatus = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  
  res.json({
    totalUsers: users.length,
    totalOrders: orders.length,
    totalRevenue: totalRevenue.toFixed(2),
    averageOrderValue: (totalRevenue / orders.length).toFixed(2),
    ordersByStatus,
    version: VERSION
  });
});

// Metrics endpoint (Prometheus-style)
app.get('/metrics', (req, res) => {
  const metrics = `
# HELP app_requests_total Total number of requests
# TYPE app_requests_total counter
app_requests_total{environment="${ENVIRONMENT}",version="${VERSION}"} ${appState.requestCount}

# HELP app_errors_total Total number of errors
# TYPE app_errors_total counter
app_errors_total{environment="${ENVIRONMENT}",version="${VERSION}"} ${appState.errorCount}

# HELP app_uptime_seconds Application uptime in seconds
# TYPE app_uptime_seconds gauge
app_uptime_seconds{environment="${ENVIRONMENT}",version="${VERSION}"} ${process.uptime()}

# HELP app_memory_usage_bytes Memory usage in bytes
# TYPE app_memory_usage_bytes gauge
app_memory_usage_bytes{environment="${ENVIRONMENT}",version="${VERSION}",type="rss"} ${process.memoryUsage().rss}
app_memory_usage_bytes{environment="${ENVIRONMENT}",version="${VERSION}",type="heapTotal"} ${process.memoryUsage().heapTotal}
app_memory_usage_bytes{environment="${ENVIRONMENT}",version="${VERSION}",type="heapUsed"} ${process.memoryUsage().heapUsed}

# HELP app_users_total Total number of users
# TYPE app_users_total gauge
app_users_total{environment="${ENVIRONMENT}",version="${VERSION}"} ${users.length}

# HELP app_orders_total Total number of orders
# TYPE app_orders_total gauge
app_orders_total{environment="${ENVIRONMENT}",version="${VERSION}"} ${orders.length}
  `.trim();
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// Simulate load endpoint (for testing)
app.get('/api/load/:duration', (req, res) => {
  const duration = parseInt(req.params.duration) || 1000;
  const startTime = Date.now();
  
  // Simulate CPU-intensive operation
  while (Date.now() - startTime < duration) {
    Math.random() * Math.random();
  }
  
  res.json({
    message: `Load test completed`,
    duration: `${duration}ms`,
    version: VERSION,
    environment: ENVIRONMENT
  });
});

// Version-specific endpoint to show differences
app.get('/api/features', (req, res) => {
  res.json({
    version: VERSION,
    environment: ENVIRONMENT,
    availableFeatures: Object.keys(appState.features).filter(key => appState.features[key]),
    allFeatures: appState.features,
    changelog: getVersionChangelog(VERSION)
  });
});

function getVersionChangelog(version) {
  const changelog = {
    '1.0.0': ['Initial release', 'Basic user and order management', 'Health checks'],
    '2.0.0': ['Added user creation API', 'Enhanced welcome message', 'Improved error handling'],
    '2.1.0': ['Added advanced search functionality', 'Better pagination', 'Performance improvements'],
    '2.2.0': ['Real-time notifications support', 'WebSocket connections', 'Enhanced monitoring'],
    '3.0.0': ['Analytics dashboard', 'Advanced metrics', 'Machine learning insights']
  };
  
  return changelog[version] || ['Unknown version'];
}

// Error simulation endpoint (for testing failure scenarios)
app.get('/api/error', (req, res) => {
  const errorType = req.query.type || 'generic';
  
  switch (errorType) {
    case 'timeout':
      setTimeout(() => {
        res.status(408).json({ error: 'Request timeout', version: VERSION });
      }, 30000);
      break;
    case 'memory':
      // Simulate memory issues
      const bigArray = new Array(1000000).fill('memory-test');
      res.status(507).json({ error: 'Insufficient storage', version: VERSION });
      break;
    case 'crash':
      process.exit(1);
      break;
    default:
      throw new Error('Simulated error for testing');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  console.log(`Final stats: ${appState.requestCount} requests, ${appState.errorCount} errors`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 E-Commerce Platform v${VERSION} running on port ${PORT}`);
  console.log(`📊 Environment: ${ENVIRONMENT}`);
  console.log(`🏠 Hostname: ${os.hostname()}`);
  console.log(`✨ Features enabled:`, Object.keys(appState.features).filter(key => appState.features[key]));
  console.log(`🔗 API endpoints:`);
  console.log(`   GET  /                    - Application info`);
  console.log(`   GET  /health              - Health check`);
  console.log(`   GET  /ready               - Readiness probe`);
  console.log(`   GET  /live                - Liveness probe`);
  console.log(`   GET  /metrics             - Prometheus metrics`);
  console.log(`   GET  /api/users           - List users`);
  console.log(`   POST /api/users           - Create user (v2.0+)`);
  console.log(`   GET  /api/orders          - List orders`);
  console.log(`   GET  /api/search          - Search (v2.1+)`);
  console.log(`   GET  /api/analytics       - Analytics (v3.0+)`);
  console.log(`   GET  /api/features        - Feature list`);
});