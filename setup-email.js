const fs = require('fs');
const path = require('path');

console.log('📧 Email Setup Helper for Nazam Core\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('📋 Creating .env file from env.example...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created from env.example');
  } else {
    console.log('❌ env.example file not found!');
    process.exit(1);
  }
}

// Read current .env file
let envContent = fs.readFileSync(envPath, 'utf8');

console.log('📋 Current email configuration:');
console.log('=' .repeat(50));

// Check for email variables
const emailMatch = envContent.match(/^Email=(.+)$/m);
const passwordMatch = envContent.match(/^Password=(.+)$/m);
const emailPasswordMatch = envContent.match(/^EMAIL_PASSWORD=(.+)$/m);

if (emailMatch) {
  console.log(`📧 Email: ${emailMatch[1]}`);
} else {
  console.log('❌ Email not set');
}

if (passwordMatch && passwordMatch[1] !== 'your_gmail_app_password_here') {
  console.log(`🔑 Password: ${'*'.repeat(passwordMatch[1].length)} (set)`);
} else {
  console.log('❌ Password not set or using default value');
}

if (emailPasswordMatch && emailPasswordMatch[1] !== 'your_gmail_app_password_here') {
  console.log(`🔑 EMAIL_PASSWORD: ${'*'.repeat(emailPasswordMatch[1].length)} (set)`);
} else {
  console.log('❌ EMAIL_PASSWORD not set or using default value');
}

console.log('\n📝 To fix the email issue:');
console.log('1. Get your Gmail App Password:');
console.log('   - Go to https://myaccount.google.com/security');
console.log('   - Enable 2-Factor Authentication if not already enabled');
console.log('   - Go to "App passwords" and generate a new app password');
console.log('   - Use "Mail" as the app type');
console.log('2. Update your .env file:');
console.log('   - Set Password=your_16_character_app_password');
console.log('   - Or set EMAIL_PASSWORD=your_16_character_app_password');
console.log('3. Restart your server');

console.log('\n📋 Example .env configuration:');
console.log('Email=sheralii10711@gmail.com');
console.log('Password=abcd efgh ijkl mnop');
console.log('EMAIL_PASSWORD=abcd efgh ijkl mnop');

console.log('\n🔍 SMS Issue:');
console.log('The SMS service error indicates your IP is not whitelisted.');
console.log('Contact your SMS service provider to whitelist your IP: 157.10.7.84');

console.log('\n✅ After fixing both issues, your OTP will work via:');
console.log('- Email (if credentials are set)');
console.log('- SMS (if IP is whitelisted)');
console.log('- Both methods will be attempted if both are provided');
