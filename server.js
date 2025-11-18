const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');
const routes = require('./routes');
const { sendSuccess, sendError } = require('./utils/response');

dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enable CORS - Allow requests from any origin
app.use(cors({
  origin: true, // Allow requests from any origin
  credentials: true
}));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Nazam Core API Documentation'
}));

// Routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  sendSuccess(res, 200, 'Welcome to Nazam Core API', {
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/api/health',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  sendError(res, 404, `Route ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND');
});

// Error handler middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`);
  process.exit(1);
});

module.exports = app;