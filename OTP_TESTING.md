# OTP Testing Guide

## Important Note About Swagger UI Testing

**⚠️ CRITICAL**: When using Swagger UI in your browser to test OTP endpoints, the requests are sent from your **local machine's IP**, not from your EC2 server's IP (34.229.136.103). This means SMS services may not work as expected.

## Proper Testing Methods

### 1. Using cURL Commands (Recommended)

Test directly from your EC2 server or any machine with the correct IP:

```bash
# Send OTP
curl -X POST 'https://zushh.com/api/auth/send-otp' \
  -H 'Content-Type: application/json' \
  -d '{
    "phoneNumber": "+971501234567"
  }'

# Resend OTP
curl -X POST 'https://zushh.com/api/auth/resend-otp' \
  -H 'Content-Type: application/json' \
  -d '{
    "phoneNumber": "+971501234567"
  }'

# Verify OTP
curl -X POST 'https://zushh.com/api/auth/verify-otp-only' \
  -H 'Content-Type: application/json' \
  -d '{
    "phoneNumber": "+971501234567",
    "otpCode": "123456"
  }'
```

### 2. SSH into EC2 Server

```bash
# Connect to your EC2 server
ssh -i your-key.pem ec2-user@34.229.136.103

# Run the cURL commands from the server
curl -X POST 'https://zushh.com/api/auth/send-otp' \
  -H 'Content-Type: application/json' \
  -d '{"phoneNumber": "+971501234567"}'
```

### 3. Using Postman

Import the `postman_collection.json` file and test with the production URL.

### 4. Check Server Logs

Monitor your application logs to see if SMS requests are being processed:

```bash
# On your EC2 server
tail -f /path/to/your/app/logs
# or
pm2 logs your-app-name
```

## SMS Service Configuration

The SMS service is configured in `utils/smsService.js` with:
- **Provider**: Smart SMS Gateway
- **Base URL**: https://smartsmsgateway.com/api/api_http.php
- **Username**: facaltaasmkt (from environment or default)
- **Sender ID**: AD-NAZAM

## Troubleshooting

1. **SMS not sending**: Check if your EC2 server's IP is whitelisted with the SMS provider
2. **Invalid phone number**: Ensure UAE phone numbers are in correct format (+971XXXXXXXXX)
3. **Rate limiting**: Check if you're hitting SMS provider rate limits
4. **Environment variables**: Verify SMS credentials are properly set in production

## Testing Flow

1. **Send OTP**: POST to `/api/auth/send-otp`
2. **Check SMS**: Verify SMS was received on the phone
3. **Verify OTP**: POST to `/api/auth/verify-otp-only` with the received code
4. **Create Account**: POST to `/api/auth/create-account` with user details
