import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './App.css';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(15);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const isRecordingRef = useRef(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingTime(15);
      console.log('Recording started, timer set to 15s');

      // Start countdown timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          console.log('Timer tick:', prev);
          if (prev <= 1) {
            clearInterval(timerRef.current);
            console.log('Timer reached 0, stopping recording');
            // Use ref to check if still recording
            if (isRecordingRef.current) {
              stopRecording();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      // Clear the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      setRecordingTime(15);
    }
  };

  const uploadRecording = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/recordings`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Recording saved:', result);
      } else {
        console.error('Failed to save recording');
      }
    } catch (error) {
      console.error('Error uploading recording:', error);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="App">
      <div className="background-dots">
        {[...Array(50)].map((_, i) => (
          <div key={i} className="dot" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`
          }} />
        ))}
      </div>
      
      <div className="main-container">
        <div className="bubble-container" onClick={isRecording ? stopRecording : startRecording}>
          <div className={`sound-waves ${isRecording ? 'recording' : ''}`}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="wave" style={{
                animationDelay: `${i * 0.1}s`
              }} />
            ))}
          </div>
          
          <div className={`bubble ${isRecording ? 'recording' : ''}`}>
            <svg className="microphone-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 1C9.23858 1 7 3.23858 7 6V11C7 13.7614 9.23858 16 12 16C14.7614 16 17 13.7614 17 11V6C17 3.23858 14.7614 1 12 1Z" fill="white"/>
              <path d="M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 19V23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 23H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        
        <p className="status-text">
          {isRecording ? `Recording... ${recordingTime}s` : 'Tap to record'}
        </p>

        <div className="bottom-nav">
          <Link to="/" className="nav-btn active">
            Record
          </Link>
          <Link to="/recordings" className="nav-btn">
            Bubbles
          </Link>
        </div>
        
        <div className="copyright">
          © Developed by Vinay Patil™
        </div>
      </div>
    </div>
  );
}

export default App;
