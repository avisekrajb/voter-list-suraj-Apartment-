const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    console.log('🔄 Connecting to MongoDB Atlas...');
    console.log(`📊 Using database: ${process.env.MONGODB_URI.split('/').pop().split('?')[0] || 'unknown'}`);

    // Connect with minimal options
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    
    console.log(`✅ MongoDB Atlas Connected Successfully`);
    console.log(`📊 Database: ${conn.connection.db.databaseName}`);
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`🔗 Connection State: ${conn.connection.readyState}`);
    console.log(`📈 Connection Pool Size: ${conn.connection.poolSize || 'default'}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ MongoDB Atlas Connection Error:', error.message);
    
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('\n🔐 Authentication failed! Please check:');
      console.error('   - Username and password in .env file');
      console.error('   - User exists in MongoDB Atlas Database Access');
      console.error('   - User has proper permissions');
      console.error('   - Password is correct (case sensitive)');
      console.error('\n📝 Your MONGODB_URI (hidden):');
      console.error(process.env.MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@'));
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n🌐 Host not found! Please check:');
      console.error('   - Cluster name is correct');
      console.error('   - Cluster is active');
      console.error('   - Internet connection is working');
    } else if (error.message.includes('IP')) {
      console.error('\n📡 IP not whitelisted! Please check:');
      console.error('   - Add your IP in Network Access');
      console.error('   - Or use 0.0.0.0/0 for testing');
    }
    
    if (process.env.NODE_ENV === 'production') {
      console.error('\n⚠️ Production mode - retrying connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB;