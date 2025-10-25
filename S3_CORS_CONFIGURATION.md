# S3 CORS Configuration Guide

## Problem
You're getting CORS errors when trying to access S3 images from your frontend:
- `http://localhost:3000` (development)
- `https://nazam-delta.vercel.app` (production)

## Solution
Configure CORS on your S3 bucket to allow cross-origin requests.

## Method 1: AWS Console (Recommended)

1. **Go to AWS S3 Console**
   - Navigate to your bucket: `mynazam-s3`

2. **Access Permissions Tab**
   - Click on your bucket
   - Go to the "Permissions" tab
   - Scroll down to "Cross-origin resource sharing (CORS)"

3. **Add CORS Configuration**
   Click "Edit" and add this configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://nazam-delta.vercel.app",
            "https://nazam-delta-git-main.vercel.app",
            "https://nazam-delta-git-develop.vercel.app"
        ],
        "ExposeHeaders": [
            "ETag",
            "x-amz-meta-custom-header"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

## Method 2: AWS CLI

Create a CORS configuration file:

```bash
# Create cors-config.json
cat > cors-config.json << 'EOF'
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "HEAD"],
            "AllowedOrigins": [
                "http://localhost:3000",
                "http://localhost:3001", 
                "https://nazam-delta.vercel.app",
                "https://nazam-delta-git-main.vercel.app",
                "https://nazam-delta-git-develop.vercel.app"
            ],
            "ExposeHeaders": ["ETag", "x-amz-meta-custom-header"],
            "MaxAgeSeconds": 3000
        }
    ]
}
EOF

# Apply CORS configuration
aws s3api put-bucket-cors --bucket mynazam-s3 --cors-configuration file://cors-config.json
```

## Method 3: Programmatic Configuration

Add this to your server setup or create a separate script:

```javascript
// scripts/configure-s3-cors.js
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'HEAD'],
      AllowedOrigins: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://nazam-delta.vercel.app',
        'https://nazam-delta-git-main.vercel.app',
        'https://nazam-delta-git-develop.vercel.app'
      ],
      ExposeHeaders: ['ETag', 'x-amz-meta-custom-header'],
      MaxAgeSeconds: 3000
    }
  ]
};

async function configureCORS() {
  try {
    const command = new PutBucketCorsCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      CORSConfiguration: corsConfiguration
    });
    
    await s3Client.send(command);
    console.log('✅ CORS configuration applied successfully');
  } catch (error) {
    console.error('❌ Error configuring CORS:', error);
  }
}

configureCORS();
```

Run the script:
```bash
node scripts/configure-s3-cors.js
```

## Method 4: Terraform (If using Infrastructure as Code)

```hcl
resource "aws_s3_bucket_cors_configuration" "nazam_s3_cors" {
  bucket = aws_s3_bucket.nazam_s3.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://nazam-delta.vercel.app",
      "https://nazam-delta-git-main.vercel.app",
      "https://nazam-delta-git-develop.vercel.app"
    ]
    expose_headers  = ["ETag", "x-amz-meta-custom-header"]
    max_age_seconds = 3000
  }
}
```

## Verification

After applying CORS configuration, verify it works:

1. **Check CORS Configuration**
```bash
aws s3api get-bucket-cors --bucket mynazam-s3
```

2. **Test in Browser**
   - Open browser dev tools
   - Try to load an image from S3
   - Check Network tab for CORS headers

3. **Test with curl**
```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://mynazam-s3.s3.us-east-1.amazonaws.com/service-images/68f27f755a59093e3cb11262/service-serviceImage-1761244402861-862888003.png
```

## Additional S3 Bucket Policy (Optional)

If you want to make images publicly accessible, also add this bucket policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::mynazam-s3/*"
        }
    ]
}
```

## Frontend Image Loading

Once CORS is configured, your images should load properly:

```javascript
// React component example
const ServiceImage = ({ imageUrl }) => {
  return (
    <img 
      src={imageUrl} 
      alt="Service" 
      onError={(e) => {
        console.error('Failed to load image:', imageUrl);
        e.target.style.display = 'none';
      }}
    />
  );
};
```

## Troubleshooting

1. **CORS still not working?**
   - Check if CORS configuration was applied correctly
   - Verify the origins match exactly (including protocol)
   - Clear browser cache
   - Check browser dev tools for specific error messages

2. **Images not loading at all?**
   - Check S3 bucket permissions
   - Verify the S3 URL is correct
   - Check if the file exists in S3

3. **Development vs Production**
   - Make sure both localhost and production domains are in AllowedOrigins
   - Consider using environment variables for different origins

## Security Considerations

- Only allow necessary origins in AllowedOrigins
- Use specific headers instead of "*" if possible
- Consider using CloudFront for better performance and security
- Implement proper authentication for sensitive images
