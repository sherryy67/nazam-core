# AWS S3 Setup Guide

## Quick Fix for "Resolved credential object is not valid" Error

This error occurs when AWS credentials are not properly configured. Follow these steps:

### 1. Create AWS Account & S3 Bucket

1. **Create AWS Account**: Go to [AWS Console](https://aws.amazon.com/)
2. **Create S3 Bucket**: 
   - Go to S3 service
   - Click "Create bucket"
   - Choose a unique name (e.g., `your-app-uploads-2024`)
   - Select your preferred region
   - Keep default settings for now

### 2. Create IAM User with S3 Permissions

1. **Go to IAM Console**: https://console.aws.amazon.com/iam/
2. **Create User**:
   - Click "Users" → "Create user"
   - Username: `s3-upload-user`
   - Select "Programmatic access"
3. **Attach Policy**:
   - Click "Attach policies directly"
   - Search and select "AmazonS3FullAccess" (or create custom policy)
4. **Save Credentials**:
   - Copy the Access Key ID and Secret Access Key
   - **Important**: Save these immediately - you won't see them again!

### 3. Configure Your .env File

Create or update your `.env` file with real values:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIA...your_actual_access_key
AWS_SECRET_ACCESS_KEY=your_actual_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-actual-bucket-name
```

### 4. Test Your Configuration

Run the test script to verify everything works:

```bash
node test-aws-config.js
```

### 5. Test File Upload

```bash
# Start your server
npm run dev

# Test upload (in another terminal)
node test-upload.js
```

## Common Issues & Solutions

### ❌ "Resolved credential object is not valid"
- **Cause**: Invalid or missing AWS credentials
- **Solution**: Check your .env file has real AWS credentials (not placeholders)

### ❌ "NoSuchBucket"
- **Cause**: S3 bucket doesn't exist
- **Solution**: Create the bucket in AWS Console or update bucket name

### ❌ "AccessDenied"
- **Cause**: IAM user doesn't have S3 permissions
- **Solution**: Attach S3FullAccess policy to your IAM user

### ❌ "InvalidAccessKeyId"
- **Cause**: Wrong Access Key ID
- **Solution**: Double-check your Access Key ID in .env

### ❌ "SignatureDoesNotMatch"
- **Cause**: Wrong Secret Access Key
- **Solution**: Double-check your Secret Access Key in .env

## Security Best Practices

### For Development:
- Use IAM user with minimal S3 permissions
- Never commit .env file to git
- Use different credentials for production

### For Production:
- Use IAM roles instead of access keys
- Implement proper CORS policies
- Add rate limiting to upload endpoints
- Monitor S3 usage and costs

## Custom S3 Policy (Optional)

If you want more restrictive permissions, create a custom policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/uploads/*"
        }
    ]
}
```

## Troubleshooting Commands

```bash
# Test AWS credentials
node test-aws-config.js

# Check environment variables
echo $AWS_ACCESS_KEY_ID

# Test upload endpoint
curl -X POST -F "file=@test.txt" http://localhost:3000/api/upload
```

## Need Help?

1. **Check AWS Console**: Verify bucket exists and permissions are correct
2. **Run Test Script**: `node test-aws-config.js`
3. **Check Logs**: Look for specific error messages in your server logs
4. **Verify .env**: Ensure no typos in variable names or values

The most common issue is using placeholder values instead of real AWS credentials! 🚀
