const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const errorHandler = require("./middlewares/errorHandler");
const routes = require("./routes");
const { sendSuccess, sendError } = require("./utils/response");

// Load env vars with debugging
console.log("Current working directory:", process.cwd());
console.log("NODE_ENV:", process.env.NODE_ENV);

// Try multiple paths for .env file
const fs = require("fs");
const path = require("path");

const envPaths = [
  ".env",
  path.join(__dirname, ".env"),
  path.join(process.cwd(), ".env"),
  "./.env",
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Found .env file at: ${envPath}`);
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error(`Error loading .env file from ${envPath}:`, result.error);
    } else {
      console.log("Environment variables loaded successfully from:", envPath);
      envLoaded = true;
      break;
    }
  }
}

if (!envLoaded) {
  console.warn("No .env file found in any of the expected locations");
  console.log("Searched paths:", envPaths);
}

// Debug: Show available environment variables
console.log(
  "Available env vars:",
  Object.keys(process.env).filter(
    (key) =>
      key.includes("MONGODB") ||
      key.includes("JWT") ||
      key.includes("AWS") ||
      key.includes("PORT") ||
      key.includes("HOST") ||
      key.includes("SMS")
  )
);

// Show specific server configuration
console.log("=== SERVER CONFIGURATION ===");
console.log("PORT:", process.env.PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("HOST:", process.env.HOST);
console.log("===========================");

// Import swagger after env vars are loaded
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./config/swagger");

// Debug swagger configuration
console.log("=== SWAGGER CONFIGURATION ===");
console.log("Swagger server URL:", swaggerSpecs.servers?.[0]?.url);
console.log("=============================");

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Enable CORS - Allow requests from any origin
app.use(
  cors({
    origin: true, // Allow requests from any origin
    credentials: true,
  })
);

// Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Nazam Core API Documentation",
  })
);

// Routes
app.use("/api", routes);

// Root route
app.get("/", (req, res) => {
  sendSuccess(res, 200, "Welcome to Nazam Core API", {
    version: "1.0.0",
    documentation: "/api-docs",
    health: "/api/health",
    environment: process.env.NODE_ENV || "development",
  });
});

// Handle 404 routes
app.use("*", (req, res) => {
  sendError(res, 404, `Route ${req.originalUrl} not found`, "ROUTE_NOT_FOUND");
});

// Error handler middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Determine the correct host for binding
// In development, always use localhost
// In production, use the HOST from env or default to 0.0.0.0
const HOST = process.env.NODE_ENV === 'production' 
  ? (process.env.HOST || '0.0.0.0') 
  : 'localhost';

// For local development, ignore the HOST from .env if it's a production IP
if (process.env.NODE_ENV !== 'production' && process.env.HOST && process.env.HOST !== 'localhost') {
  console.log(`⚠️  Warning: HOST=${process.env.HOST} is not available locally. Using localhost instead.`);
}

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on ${HOST}:${PORT}`);
  console.log(`Access your API at: http://${HOST}:${PORT}`);
  console.log(`API Documentation: http://${HOST}:${PORT}/api-docs`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  process.exit(1);
});

module.exports = app;
