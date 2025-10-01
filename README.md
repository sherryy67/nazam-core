# Nazam Core API

A Node.js + Express.js project with MongoDB (Mongoose) for building robust web applications.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Email Verification**: Email verification system using Nodemailer
- **Password Reset**: Secure password reset functionality
- **Data Validation**: Input validation using express-validator
- **Error Handling**: Comprehensive error handling middleware
- **Security**: Password hashing with bcrypt, CORS support
- **Database**: MongoDB with Mongoose ODM
- **API Documentation**: Interactive Swagger/OpenAPI documentation

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcrypt for password hashing
- **Email**: Nodemailer
- **Validation**: express-validator
- **CORS**: cors middleware
- **Documentation**: Swagger/OpenAPI (swagger-jsdoc, swagger-ui-express)

## Project Structure

```
nazam-core/
├── config/           # Configuration files
│   ├── database.js   # MongoDB connection
│   ├── email.js      # Email configuration
│   └── swagger.js    # Swagger/OpenAPI configuration
├── controllers/      # Route controllers
│   └── authController.js
├── middlewares/      # Custom middlewares
│   ├── auth.js       # Authentication middleware
│   └── errorHandler.js
├── models/           # Database models
│   └── User.js
├── routes/           # API routes
│   ├── auth.js       # Authentication routes
│   └── index.js      # Main routes
├── utils/            # Utility functions
│   └── generateToken.js
├── server.js         # Main server file
├── package.json      # Dependencies
└── env.example       # Environment variables template
```

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd nazam-core
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp env.example .env
```

4. Update the `.env` file with your configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/nazam-core
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
CORS_ORIGIN=http://localhost:3000
```

5. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

## API Documentation

The API documentation is available at `/api-docs` when the server is running. This interactive Swagger UI provides:

- Complete API endpoint documentation
- Request/response schemas
- Authentication requirements
- Example requests and responses
- Interactive testing interface

Access the documentation at: `http://localhost:3001/api-docs`

## API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/auth/register` | Register a new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/logout` | Logout user | Private |
| GET | `/api/auth/me` | Get current user | Private |
| PUT | `/api/auth/updatedetails` | Update user details | Private |
| PUT | `/api/auth/updatepassword` | Update password | Private |
| POST | `/api/auth/forgotpassword` | Forgot password | Public |
| PUT | `/api/auth/resetpassword/:token` | Reset password | Public |
| GET | `/api/auth/verify-email/:token` | Verify email | Public |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |

## Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Access protected route
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Environment Variables

- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT secret key
- `JWT_EXPIRE`: JWT expiration time
- `EMAIL_HOST`: SMTP host
- `EMAIL_PORT`: SMTP port
- `EMAIL_USER`: SMTP username
- `EMAIL_PASS`: SMTP password
- `CORS_ORIGIN`: CORS origin URL

## Development

The project uses nodemon for development. Start the development server with:

```bash
npm run dev
```

## License

This project is licensed under the ISC License.
# nazam-core
