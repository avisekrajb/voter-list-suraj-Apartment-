require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB Atlas Connection...');
    console.log('📊 Username:', 'rajbanshi');
    console.log('📊 Database:', 'voter_db');
    console.log('📊 Cluster:', 'cluster0.so5agoe.mongodb.net');
    console.log('📊 Connection String (hidden):', process.env.MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@'));
    
    // Remove deprecated options
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    
    console.log('\n✅ Successfully connected to MongoDB Atlas!');
    console.log(`📊 Database: ${conn.connection.db.databaseName}`);
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`🔄 Connection State: ${conn.connection.readyState}`);
    
    // List collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('📁 Collections:', collections.map(c => c.name).join(', ') || 'No collections yet');
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.error('\n🔍 Possible issues:');
    
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('   🔐 Authentication failed. Please check:');
      console.error('      - Username "rajbanshi" exists in MongoDB Atlas');
      console.error('      - Password "abhishek" is correct');
      console.error('      - User has read/write permissions');
      console.error('      - Password doesn\'t contain special characters that need escaping');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('   🌐 Host not found. Please check:');
      console.error('      - Cluster name "cluster0" is correct');
      console.error('      - Cluster is active');
      console.error('      - You are connected to the internet');
    } else if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.error('   📡 IP not whitelisted. Please check:');
      console.error('      - Your IP is added to Network Access in Atlas');
      console.error('      - Or allow access from anywhere (0.0.0.0/0)');
    } else if (error.message.includes('bad auth')) {
      console.error('   🔑 Incorrect credentials:');
      console.error('      - Double check username: "rajbanshi"');
      console.error('      - Double check password: "abhishek"');
      console.error('      - Note: Password may contain special characters');
    }
    
    console.error('\n💡 Steps to fix:');
    console.error('1. Go to MongoDB Atlas: https://cloud.mongodb.com');
    console.error('2. Check "Database Access" for user "rajbanshi"');
    console.error('3. Reset password if needed');
    console.error('4. Check "Network Access" for your IP');
    console.error('5. Copy the correct connection string from "Connect" button');
    console.error('\n📝 Your current .env MONGODB_URI:');
    console.error(process.env.MONGODB_URI);
    
    process.exit(1);
  }
}

testConnection();