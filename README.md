# Voice Bubble - Voice Recording Application

A voice recording application with interactive floating bubbles using Matter.js physics. Recordings are stored in MongoDB and displayed as colorful, floating bubbles that can be played and burst.

## Features

- **Voice Recording**: Record audio with a 15-second maximum limit
- **Floating Bubbles**: Recordings displayed as physics-simulated floating bubbles
- **Interactive**: Tap bubbles to play audio and burst them
- **Auto-Expiration**: Bubbles automatically expire after 24 hours if not played
- **Single Playback**: Only one recording plays at a time
- **Memory Efficient**: Audio fetched only when bubble is clicked
- **Visual Feedback**: Animated sound waves, countdown timer, and playing indicator

## Prerequisites

- Node.js installed
- MongoDB installed and running

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start MongoDB

Make sure MongoDB is running on your system. The default connection string is `mongodb://localhost:27017/voice_bubble`.

If your MongoDB is running on a different host or port, update the connection string in `server.js`:

```javascript
mongoose.connect('mongodb://your-host:your-port/voice_bubble')
```

## Running the Application

### Start the Backend Server

In one terminal:

```bash
npm run server
```

The server will run on `http://localhost:5000`

### Start the React Frontend

In another terminal:

```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

1. Open `http://localhost:3000` in your browser
2. **Recording Page** (Home):
   - Tap the microphone bubble to start recording
   - Recording automatically stops after 15 seconds (countdown shown)
   - Tap again to stop recording early
   - Recording is automatically saved to the database
   - Click "Bubbles" to navigate to the recordings page
3. **Bubbles Page** (`/recordings`):
   - Each recording is displayed as a colorful floating bubble
   - Bubbles float freely using Matter.js physics (zero gravity)
   - Tap any bubble to play the recording
   - After playing, the bubble bursts and is deleted
   - Only one recording can play at a time
   - Bubbles automatically expire after 24 hours if not played
   - Click "Record" to return to the recording page

## Technical Details

### Recording Limit
- Maximum recording duration: 15 seconds
- Automatic countdown timer displayed during recording
- Recording stops automatically when timer reaches 0

### Bubble Expiration
- Bubbles expire after 24 hours from creation
- Expired recordings are automatically deleted from database
- Cleanup runs every minute while on the bubbles page

### Audio Playback
- Only one recording plays at a time
- Other bubbles are unclickable during playback
- Visual indicator shows when audio is playing
- Audio is fetched from backend only when bubble is clicked (memory efficient)

### Physics Simulation
- Uses Matter.js for realistic bubble physics
- Zero gravity for floating effect
- Gentle random forces keep bubbles moving
- Invisible walls keep bubbles within screen bounds

## API Endpoints

- `POST /api/recordings` - Upload a voice recording
- `GET /api/recordings` - Get list of all recordings
- `GET /api/recordings/:id` - Get audio data for a specific recording
- `DELETE /api/recordings/:id` - Delete a specific recording

## Database Schema

The application uses Mongoose with the following schema:

```javascript
{
  audioData: Buffer,
  contentType: String,
  createdAt: Date
}
```

The collection name is automatically created as `recordings` in the `voice_bubble` database.

## Technologies Used

- **Frontend**: React, React Router DOM
- **Physics**: Matter.js
- **Backend**: Express.js
- **Database**: MongoDB with Mongoose
- **File Upload**: Multer
- **Styling**: CSS with animations
