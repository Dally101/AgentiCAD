const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Your Apple Developer details
const TEAM_ID = 'FAS43B6D3R';
const KEY_ID = 'VB8WG7HF9Z';
const SERVICES_ID = 'com.agenticad.web'; // You'll need to create this
const PRIVATE_KEY_PATH = 'C:\\Users\\abhir\\Downloads\\AuthKey_VB8WG7HF9Z.p8';

try {
  // Read the private key file
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  
  // Create the JWT payload
  const payload = {
    iss: TEAM_ID,                           // Your Team ID
    iat: Math.floor(Date.now() / 1000),     // Issued at time
    exp: Math.floor(Date.now() / 1000) + (86400 * 180), // Expires in 6 months
    aud: 'https://appleid.apple.com',       // Apple's audience
    sub: SERVICES_ID                        // Your Services ID
  };

  // Generate the JWT
  const clientSecret = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    header: {
      kid: KEY_ID,                          // Your Key ID
      typ: 'JWT'
    }
  });

  console.log('✅ Apple Client Secret Generated Successfully!');
  console.log('-------------------------------------------');
  console.log('Client Secret (copy this to Supabase):');
  console.log(clientSecret);
  console.log('-------------------------------------------');
  console.log(`⏰ This token expires on: ${new Date((Math.floor(Date.now() / 1000) + (86400 * 180)) * 1000).toLocaleDateString()}`);
  
} catch (error) {
  console.error('❌ Error generating JWT:', error.message);
  
  if (error.code === 'ENOENT') {
    console.error('Make sure the private key file exists at the specified path.');
  }
}