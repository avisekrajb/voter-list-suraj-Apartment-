const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
  sn: {
    type: Number,
    required: true,
    unique: true,
    set: function(value) {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9]/g, '');
        if (!cleaned) return 0;
        return parseInt(cleaned, 10);
      }
      return Number(value) || 0;
    }
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  province: {
    type: String,
    trim: true
  },
  district: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  municipality: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  ward: {
    type: String,
    required: true,
    trim: true
  },
  voterNo: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    index: true
  },
  citizenshipNo: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    index: true
  },
  citizenshipIssue: {
    type: String,
    trim: true
  },
  parentName: {
    type: String,
    trim: true
  },
  spouseName: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true,
    default: 'Unknown File'
  },
  uploadBatch: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
voterSchema.index({ name: 1, district: 1 });
voterSchema.index({ voterNo: 1, citizenshipNo: 1 });
voterSchema.index({ municipality: 1, district: 1 });

// Text index for search
voterSchema.index({ 
  name: 'text', 
  district: 'text', 
  voterNo: 'text',
  municipality: 'text',
  fileName: 'text'
});

module.exports = mongoose.model('Voter', voterSchema);