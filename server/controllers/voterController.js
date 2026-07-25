const Voter = require('../models/Voter');
const XLSX = require('xlsx');

// Helper function to convert Devanagari numerals to numbers
function convertDevanagariToNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return value;
  
  const devanagariMap = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };
  
  let converted = value;
  for (const [dev, num] of Object.entries(devanagariMap)) {
    converted = converted.replace(new RegExp(dev, 'g'), num);
  }
  
  converted = converted.replace(/[^0-9.]/g, '');
  
  if (converted === '') return NaN;
  return parseFloat(converted);
}

// Helper function to clean voter data
function cleanVoterData(voter) {
  const cleaned = {};
  for (const [key, value] of Object.entries(voter)) {
    if (key === 'sn') {
      cleaned[key] = convertDevanagariToNumber(value);
    } else if (typeof value === 'string') {
      cleaned[key] = value.trim();
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// Helper function to check if a voter has all required fields
function hasRequiredFields(voter) {
  const required = ['name', 'district', 'municipality', 'ward', 'voterNo', 'citizenshipNo'];
  for (const field of required) {
    if (!voter[field] || String(voter[field]).trim() === '') {
      return false;
    }
  }
  return true;
}

// Parse Excel file and return data - ONLY .xlsx files
function parseExcelFile(fileBuffer, fileName) {
  try {
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return null;
    }
    
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    let dataRows = rows;
    if (rows.length && rows[0].some(cell => 
      String(cell).includes('नाम') || String(cell).includes('जिल्ला') || String(cell).includes('क्र')
    )) {
      dataRows = rows.slice(1);
    }

    const filteredRows = dataRows.filter(r => r.some(cell => String(cell).trim() !== ''));
    
    const COLUMNS = [
      'sn', 'name', 'province', 'district', 'municipality', 
      'ward', 'voterNo', 'citizenshipNo', 'citizenshipIssue', 
      'parentName', 'spouseName'
    ];

    const mapped = filteredRows.map((r) => {
      const obj = {};
      COLUMNS.forEach((key, i) => {
        obj[key] = r[i] !== undefined ? String(r[i]).trim() : '';
      });
      return obj;
    });

    return {
      fileName,
      rowCount: filteredRows.length,
      data: mapped
    };
  } catch (error) {
    console.error(`Error parsing file ${fileName}:`, error);
    return null;
  }
}

// ==================== CONTROLLER METHODS ====================

// Get all voters
exports.getAllVoters = async (req, res) => {
  try {
    const voters = await Voter.find().sort({ sn: 1 });
    res.json(voters);
  } catch (error) {
    console.error('Error fetching all voters:', error);
    res.status(500).json({ error: 'Failed to fetch voters' });
  }
};

// Get a single voter by SN - FIXED
exports.getVoter = async (req, res) => {
  try {
    const { sn } = req.params;
    
    // Validate SN parameter
    if (!sn) {
      return res.status(400).json({ error: 'SN parameter is required' });
    }
    
    const snNumber = Number(sn);
    
    // Check if SN is a valid number
    if (isNaN(snNumber) || !isFinite(snNumber)) {
      return res.status(400).json({ 
        error: 'Invalid SN: must be a valid number',
        received: sn
      });
    }
    
    // Check if SN is a positive integer
    if (snNumber < 1 || !Number.isInteger(snNumber)) {
      return res.status(400).json({ 
        error: 'Invalid SN: must be a positive integer',
        received: snNumber
      });
    }
    
    const voter = await Voter.findOne({ sn: snNumber });
    
    if (!voter) {
      return res.status(404).json({ error: `Voter with SN ${snNumber} not found` });
    }
    
    res.json(voter);
  } catch (error) {
    console.error('Error fetching voter:', error);
    res.status(500).json({ 
      error: 'Failed to fetch voter',
      details: error.message 
    });
  }
};

// Create voters (single file upload)
exports.createVoters = async (req, res) => {
  try {
    const voters = req.body;
    
    if (!Array.isArray(voters) || voters.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid data format. Expected array of voters.' 
      });
    }

    const maxSN = await Voter.findOne().sort('-sn').select('sn');
    let nextSN = maxSN ? maxSN.sn + 1 : 1;

    const validVoters = [];
    const invalidRecords = [];

    const existingData = await Voter.find();
    const existingVoterNos = new Set(existingData.map(v => v.voterNo));
    const existingCitizenshipNos = new Set(existingData.map(v => v.citizenshipNo));

    for (let i = 0; i < voters.length; i++) {
      const voter = voters[i];
      const issues = [];
      
      const cleanedVoter = cleanVoterData(voter);
      cleanedVoter.sn = nextSN++;
      cleanedVoter.fileName = 'Manual Upload';
      cleanedVoter.uploadBatch = new Date().toISOString();
      
      if (!hasRequiredFields(cleanedVoter)) {
        const missingFields = [];
        if (!cleanedVoter.name || String(cleanedVoter.name).trim() === '') missingFields.push('नाम, थर');
        if (!cleanedVoter.district || String(cleanedVoter.district).trim() === '') missingFields.push('जिल्ला');
        if (!cleanedVoter.municipality || String(cleanedVoter.municipality).trim() === '') missingFields.push('गाउँपालिका/नगरपालिका');
        if (!cleanedVoter.ward || String(cleanedVoter.ward).trim() === '') missingFields.push('वडा नं.');
        if (!cleanedVoter.voterNo || String(cleanedVoter.voterNo).trim() === '') missingFields.push('मतदाता नम्बर');
        if (!cleanedVoter.citizenshipNo || String(cleanedVoter.citizenshipNo).trim() === '') missingFields.push('नागरिकता नम्बर');
        
        issues.push(`आवश्यक क्षेत्रहरू खाली छन्: ${missingFields.join(', ')}`);
      }
      
      if (cleanedVoter.voterNo && existingVoterNos.has(cleanedVoter.voterNo.trim())) {
        issues.push(`मतदाता नम्बर "${cleanedVoter.voterNo}" पहिले नै रेकर्ड भएको छ`);
      }
      
      if (cleanedVoter.citizenshipNo && existingCitizenshipNos.has(cleanedVoter.citizenshipNo.trim())) {
        issues.push(`नागरिकता नम्बर "${cleanedVoter.citizenshipNo}" पहिले नै रेकर्ड भएको छ`);
      }
      
      if (issues.length > 0) {
        invalidRecords.push({
          rowIndex: i + 1,
          data: cleanedVoter,
          issues,
          summary: `पङ्क्ति ${i + 1}: ${issues.join('; ')}`
        });
        continue;
      }
      
      validVoters.push(cleanedVoter);
      if (cleanedVoter.voterNo) existingVoterNos.add(cleanedVoter.voterNo.trim());
      if (cleanedVoter.citizenshipNo) existingCitizenshipNos.add(cleanedVoter.citizenshipNo.trim());
    }

    if (validVoters.length === 0) {
      return res.status(400).json({
        error: 'No valid records to save',
        invalidRecords: invalidRecords,
        message: `${invalidRecords.length} रेकर्डहरू अमान्य छन्।`
      });
    }

    const savedVoters = [];
    const saveErrors = [];

    for (const voter of validVoters) {
      try {
        const newVoter = new Voter(voter);
        await newVoter.save();
        savedVoters.push(newVoter);
      } catch (error) {
        console.error('Error saving voter:', error);
        saveErrors.push({
          data: voter,
          error: error.message
        });
      }
    }

    const response = {
      message: `${savedVoters.length} रेकर्ड सुरक्षित भयो।`,
      saved: savedVoters.length,
      totalAttempted: voters.length,
      invalidCount: invalidRecords.length,
      errorCount: saveErrors.length,
      nextSN: nextSN
    };

    if (invalidRecords.length > 0) {
      response.invalidRecords = invalidRecords;
      response.invalidMessage = `${invalidRecords.length} रेकर्डहरू अमान्य छन्।`;
    }

    if (saveErrors.length > 0) {
      response.saveErrors = saveErrors;
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Error creating voters:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({
        error: `Duplicate ${field}: "${value}" already exists`,
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to save records',
      details: error.message 
    });
  }
};

// Upload folder with multiple files - ONLY .xlsx files
exports.uploadFolder = async (req, res) => {
  try {
    const { files } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ 
        error: 'No files provided. Please upload a folder with .xlsx files.' 
      });
    }

    const validFiles = files.filter(f => 
      f.fileName && (f.fileName.endsWith('.xlsx') || f.fileName.endsWith('.xls'))
    );

    if (validFiles.length === 0) {
      return res.status(400).json({ 
        error: 'No valid .xlsx files found in the folder. Please upload only .xlsx files.' 
      });
    }

    console.log(`Processing ${validFiles.length} .xlsx files from folder`);

    const results = [];
    const allValidVoters = [];
    let totalSaved = 0;
    let totalInvalid = 0;

    const maxSN = await Voter.findOne().sort('-sn').select('sn');
    let nextSN = maxSN ? maxSN.sn + 1 : 1;

    const existingData = await Voter.find();
    const existingVoterNos = new Set(existingData.map(v => v.voterNo));
    const existingCitizenshipNos = new Set(existingData.map(v => v.citizenshipNo));

    const MAX_ROWS_PER_FILE = 1000;
    const uploadBatchId = new Date().toISOString() + '-' + Date.now();
    
    for (const fileData of validFiles) {
      const { fileName, content } = fileData;
      
      const parsedData = parseExcelFile(Buffer.from(content, 'base64'), fileName);
      
      if (!parsedData) {
        results.push({
          fileName,
          status: 'error',
          message: 'Failed to parse file'
        });
        continue;
      }

      if (parsedData.data.length > MAX_ROWS_PER_FILE) {
        results.push({
          fileName,
          status: 'warning',
          message: `File has ${parsedData.data.length} rows. Only first ${MAX_ROWS_PER_FILE} rows processed.`
        });
        parsedData.data = parsedData.data.slice(0, MAX_ROWS_PER_FILE);
      }

      const fileResults = {
        fileName,
        rowCount: parsedData.rowCount,
        validCount: 0,
        invalidCount: 0,
        invalidRecords: []
      };

      for (const voter of parsedData.data) {
        const issues = [];
        const cleanedVoter = cleanVoterData(voter);
        cleanedVoter.sn = nextSN++;
        cleanedVoter.fileName = fileName;
        cleanedVoter.uploadBatch = uploadBatchId;
        
        if (!hasRequiredFields(cleanedVoter)) {
          const missingFields = [];
          if (!cleanedVoter.name || String(cleanedVoter.name).trim() === '') missingFields.push('नाम, थर');
          if (!cleanedVoter.district || String(cleanedVoter.district).trim() === '') missingFields.push('जिल्ला');
          if (!cleanedVoter.municipality || String(cleanedVoter.municipality).trim() === '') missingFields.push('गाउँपालिका/नगरपालिका');
          if (!cleanedVoter.ward || String(cleanedVoter.ward).trim() === '') missingFields.push('वडा नं.');
          if (!cleanedVoter.voterNo || String(cleanedVoter.voterNo).trim() === '') missingFields.push('मतदाता नम्बर');
          if (!cleanedVoter.citizenshipNo || String(cleanedVoter.citizenshipNo).trim() === '') missingFields.push('नागरिकता नम्बर');
          issues.push(`आवश्यक क्षेत्रहरू खाली छन्: ${missingFields.join(', ')}`);
        }
        
        if (cleanedVoter.voterNo && existingVoterNos.has(cleanedVoter.voterNo.trim())) {
          issues.push(`मतदाता नम्बर "${cleanedVoter.voterNo}" पहिले नै रेकर्ड भएको छ`);
        }
        
        if (cleanedVoter.citizenshipNo && existingCitizenshipNos.has(cleanedVoter.citizenshipNo.trim())) {
          issues.push(`नागरिकता नम्बर "${cleanedVoter.citizenshipNo}" पहिले नै रेकर्ड भएको छ`);
        }
        
        if (issues.length > 0) {
          fileResults.invalidCount++;
          fileResults.invalidRecords.push({
            data: cleanedVoter,
            issues
          });
          totalInvalid++;
          continue;
        }
        
        allValidVoters.push(cleanedVoter);
        fileResults.validCount++;
        totalSaved++;
        if (cleanedVoter.voterNo) existingVoterNos.add(cleanedVoter.voterNo.trim());
        if (cleanedVoter.citizenshipNo) existingCitizenshipNos.add(cleanedVoter.citizenshipNo.trim());
      }

      results.push(fileResults);
    }

    // Save in batches
    const savedVoters = [];
    const saveErrors = [];
    const BATCH_SIZE = 100;

    for (let i = 0; i < allValidVoters.length; i += BATCH_SIZE) {
      const batch = allValidVoters.slice(i, i + BATCH_SIZE);
      for (const voter of batch) {
        try {
          const newVoter = new Voter(voter);
          await newVoter.save();
          savedVoters.push(newVoter);
        } catch (error) {
          console.error('Error saving voter:', error);
          saveErrors.push({
            data: voter,
            error: error.message
          });
        }
      }
    }

    const response = {
      message: `${savedVoters.length} रेकर्ड सुरक्षित भयो।`,
      saved: savedVoters.length,
      totalFiles: validFiles.length,
      totalInvalid: totalInvalid,
      fileResults: results,
      nextSN: nextSN,
      skippedFiles: files.length - validFiles.length,
      uploadBatch: uploadBatchId
    };

    if (saveErrors.length > 0) {
      response.saveErrors = saveErrors;
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Error uploading folder:', error);
    res.status(500).json({ 
      error: 'Failed to upload folder',
      details: error.message 
    });
  }
};

// Delete ALL voters
exports.deleteAllVoters = async (req, res) => {
  try {
    const count = await Voter.countDocuments();
    
    if (count === 0) {
      return res.status(404).json({ 
        message: 'No records found to delete.' 
      });
    }
    
    const result = await Voter.deleteMany({});
    
    res.json({
      message: `All ${result.deletedCount} records deleted successfully.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting all voters:', error);
    res.status(500).json({ 
      error: 'Failed to delete all records',
      details: error.message 
    });
  }
};

// Delete multiple voters by SN array
exports.deleteMultipleVoters = async (req, res) => {
  try {
    const { sns } = req.body;
    
    if (!sns || !Array.isArray(sns) || sns.length === 0) {
      return res.status(400).json({ 
        error: 'Please provide an array of SN numbers to delete' 
      });
    }
    
    const numericSns = sns.map(s => Number(s)).filter(s => !isNaN(s));
    
    if (numericSns.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid SN numbers provided' 
      });
    }
    
    const result = await Voter.deleteMany({ 
      sn: { $in: numericSns } 
    });
    
    res.json({
      message: `${result.deletedCount} voters deleted successfully`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('Error deleting multiple voters:', error);
    res.status(500).json({ 
      error: 'Failed to delete voters',
      details: error.message 
    });
  }
};

// Get file-wise data
exports.getFileWiseData = async (req, res) => {
  try {
    const voters = await Voter.find().sort({ sn: 1 });
    
    if (voters.length === 0) {
      return res.json({
        files: []
      });
    }
    
    const fileGroups = {};
    
    voters.forEach(v => {
      const fileName = v.fileName || 'Unknown File';
      if (!fileGroups[fileName]) {
        fileGroups[fileName] = {
          fileName: fileName,
          count: 0,
          voters: []
        };
      }
      fileGroups[fileName].count++;
      fileGroups[fileName].voters.push(v);
    });
    
    const filesArray = Object.values(fileGroups).sort((a, b) => 
      a.fileName.localeCompare(b.fileName)
    );
    
    res.json({
      files: filesArray,
      totalRecords: voters.length,
      totalFiles: filesArray.length
    });
  } catch (error) {
    console.error('Error fetching file-wise data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch file-wise data',
      details: error.message 
    });
  }
};

// Search voters
exports.searchVoters = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || !q.trim()) {
      return res.json([]);
    }
    
    const searchTerm = q.trim();
    const searchQuery = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { district: { $regex: searchTerm, $options: 'i' } },
        { municipality: { $regex: searchTerm, $options: 'i' } },
        { voterNo: { $regex: searchTerm, $options: 'i' } },
        { citizenshipNo: { $regex: searchTerm, $options: 'i' } },
        { province: { $regex: searchTerm, $options: 'i' } },
        { parentName: { $regex: searchTerm, $options: 'i' } },
        { spouseName: { $regex: searchTerm, $options: 'i' } },
        { ward: { $regex: searchTerm, $options: 'i' } },
        { fileName: { $regex: searchTerm, $options: 'i' } }
      ]
    };
    
    if (!isNaN(searchTerm) && searchTerm.trim() !== '') {
      searchQuery.$or.push({ sn: Number(searchTerm) });
    }
    
    const voters = await Voter.find(searchQuery).sort({ sn: 1 });
    res.json(voters);
    
  } catch (error) {
    console.error('Error searching voters:', error);
    res.status(500).json({ error: 'Failed to search voters' });
  }
};

// Get statistics
exports.getStats = async (req, res) => {
  try {
    const total = await Voter.countDocuments();
    
    const missing = await Voter.countDocuments({
      $or: [
        { name: { $exists: false } },
        { name: '' },
        { name: { $eq: null } },
        { district: { $exists: false } },
        { district: '' },
        { district: { $eq: null } },
        { municipality: { $exists: false } },
        { municipality: '' },
        { municipality: { $eq: null } },
        { ward: { $exists: false } },
        { ward: '' },
        { ward: { $eq: null } },
        { voterNo: { $exists: false } },
        { voterNo: '' },
        { voterNo: { $eq: null } },
        { citizenshipNo: { $exists: false } },
        { citizenshipNo: '' },
        { citizenshipNo: { $eq: null } }
      ]
    });
    
    const files = await Voter.distinct('fileName');
    
    const duplicateVoterNos = await Voter.aggregate([
      { $group: { _id: '$voterNo', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    const duplicateCitizenshipNos = await Voter.aggregate([
      { $group: { _id: '$citizenshipNo', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    res.json({
      total,
      missing,
      complete: total - missing,
      totalFiles: files.length,
      files: files,
      duplicates: {
        voterNos: duplicateVoterNos.length,
        citizenshipNos: duplicateCitizenshipNos.length
      },
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// Update a voter - FIXED
exports.updateVoter = async (req, res) => {
  try {
    const { sn } = req.params;
    
    // Validate SN parameter
    if (!sn) {
      return res.status(400).json({ error: 'SN parameter is required' });
    }
    
    const snNumber = Number(sn);
    
    if (isNaN(snNumber) || !isFinite(snNumber)) {
      return res.status(400).json({ 
        error: 'Invalid SN: must be a valid number',
        received: sn
      });
    }
    
    let updateData = req.body;
    
    delete updateData._id;
    delete updateData.__v;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.fileName;
    delete updateData.uploadBatch;
    
    updateData = cleanVoterData(updateData);
    delete updateData.sn;
    
    const existingVoter = await Voter.findOne({ sn: snNumber });
    if (!existingVoter) {
      return res.status(404).json({ error: `Voter with SN ${snNumber} not found` });
    }
    
    if (updateData.voterNo && updateData.voterNo !== existingVoter.voterNo) {
      const duplicate = await Voter.findOne({ 
        voterNo: updateData.voterNo.trim(),
        sn: { $ne: snNumber }
      });
      if (duplicate) {
        return res.status(400).json({
          error: `मतदाता नम्बर "${updateData.voterNo}" पहिले नै रेकर्ड भएको छ`
        });
      }
    }
    
    if (updateData.citizenshipNo && updateData.citizenshipNo !== existingVoter.citizenshipNo) {
      const duplicate = await Voter.findOne({ 
        citizenshipNo: updateData.citizenshipNo.trim(),
        sn: { $ne: snNumber }
      });
      if (duplicate) {
        return res.status(400).json({
          error: `नागरिकता नम्बर "${updateData.citizenshipNo}" पहिले नै रेकर्ड भएको छ`
        });
      }
    }
    
    const updatedVoter = await Voter.findOneAndUpdate(
      { sn: snNumber },
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      message: 'Voter updated successfully',
      voter: updatedVoter
    });
    
  } catch (error) {
    console.error('Error updating voter:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({
        error: `Duplicate ${field}: "${value}" already exists`
      });
    }
    
    res.status(500).json({ error: 'Failed to update voter' });
  }
};

// Delete a single voter - FIXED
exports.deleteVoter = async (req, res) => {
  try {
    const { sn } = req.params;
    
    // Validate SN parameter
    if (!sn) {
      return res.status(400).json({ error: 'SN parameter is required' });
    }
    
    const snNumber = Number(sn);
    
    if (isNaN(snNumber) || !isFinite(snNumber)) {
      return res.status(400).json({ 
        error: 'Invalid SN: must be a valid number',
        received: sn
      });
    }
    
    const voter = await Voter.findOneAndDelete({ sn: snNumber });
    
    if (!voter) {
      return res.status(404).json({ error: `Voter with SN ${snNumber} not found` });
    }
    
    res.json({ 
      message: 'Voter deleted successfully',
      deletedVoter: {
        sn: voter.sn,
        name: voter.name,
        voterNo: voter.voterNo,
        fileName: voter.fileName
      }
    });
    
  } catch (error) {
    console.error('Error deleting voter:', error);
    res.status(500).json({ error: 'Failed to delete voter' });
  }
};