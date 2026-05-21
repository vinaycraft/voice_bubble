const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/voice_bubble').then(() => {
  console.log('Connected to MongoDB database');
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

const recordingSchema = new mongoose.Schema({
  audioData: {
    type: Buffer,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Recording = mongoose.model('Recording', recordingSchema);

app.post('/api/recordings', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const { buffer, mimetype } = req.file;
  
  try {
    const recording = new Recording({
      audioData: buffer,
      contentType: mimetype
    });
    
    await recording.save();
    
    res.json({ 
      message: 'Recording saved successfully', 
      id: recording._id 
    });
  } catch (error) {
    console.error('Error saving recording:', error);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

app.get('/api/recordings', async (req, res) => {
  try {
    const recordings = await Recording.find()
      .select('_id contentType createdAt')
      .sort({ createdAt: -1 });
    
    res.json(recordings);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

app.get('/api/recordings/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const recording = await Recording.findById(id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    res.setHeader('Content-Type', recording.contentType);
    res.send(recording.audioData);
  } catch (error) {
    console.error('Error fetching recording:', error);
    res.status(500).json({ error: 'Failed to fetch recording' });
  }
});

app.delete('/api/recordings/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const recording = await Recording.findByIdAndDelete(id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    res.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ error: 'Failed to delete recording' });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
