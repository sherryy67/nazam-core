# Nazam Core API Setup Guide

## Environment Variables Setup

Create a `.env` file in the root directory with the following variables:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/nazam-core

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# CORS Configuration (Optional - currently set to allow all origins)
# CORS_ORIGIN=http://localhost:3000

# AWS S3 Configuration (Required for file uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_s3_bucket_name
AWS_S3_BUCKET_URL=your_s3_bucket_url
```

## Required Environment Variables

### For Authentication:
- `JWT_SECRET`: Secret key for JWT token signing
- `JWT_EXPIRE`: JWT token expiration time (e.g., "7d", "24h")

### For Database:
- `MONGODB_URI`: MongoDB connection string

### For File Uploads (S3):
- `AWS_ACCESS_KEY_ID`: AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `AWS_REGION`: AWS region (e.g., "us-east-1")
- `AWS_S3_BUCKET_NAME`: S3 bucket name
- `AWS_S3_BUCKET_URL`: S3 bucket URL (optional, will be auto-generated if not provided)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with the variables above

3. Start the server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user or vendor
- `POST /api/auth/login` - Login with role
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password

### File Upload
- `POST /api/files/upload` - Upload any file to S3 (10MB max, uploads to 'uploads' folder)

### System
- `GET /api/health` - Health check
- `GET /api-docs` - API documentation

## Error Resolution

### "bucket is required" error:
1. Make sure `AWS_S3_BUCKET_NAME` is set in your `.env` file
2. Verify your AWS credentials are correct
3. Ensure the S3 bucket exists and you have access to it

### "this.client.send is not a function" error:
This is an AWS SDK compatibility issue. The fix is already applied:
1. The S3 configuration has been updated to use AWS SDK v2 syntax
2. Multer version has been downgraded to be compatible with multer-s3
3. Run `npm install` to update dependencies

### Test S3 Connection:
```bash
node test-s3.js
```

This will test your S3 configuration and verify the bucket exists.

## Testing

Use the Swagger documentation at `http://localhost:3001/api-docs` to test all endpoints.
