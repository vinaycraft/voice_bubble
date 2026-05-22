import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Matter from 'matter-js';
import './RecordingsPage.css';

function RecordingsPage() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlayingIndicator, setShowPlayingIndicator] = useState(false);
  
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const bubblesRef = useRef([]);
  const isPlayingRef = useRef(false);

  const deleteExpiredRecordings = async (allRecordings) => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const expiredRecordings = allRecordings.filter(recording => {
      const createdAt = new Date(recording.createdAt);
      return createdAt < twentyFourHoursAgo;
    });

    if (expiredRecordings.length > 0) {
      console.log('Found', expiredRecordings.length, 'expired recordings, deleting...');
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      for (const recording of expiredRecordings) {
        try {
          await fetch(`${apiUrl}/api/recordings/${recording._id}`, {
            method: 'DELETE',
          });
          console.log('Deleted expired recording:', recording._id);
        } catch (error) {
          console.error('Error deleting expired recording:', error);
        }
      }
    }

    return allRecordings.filter(recording => {
      const createdAt = new Date(recording.createdAt);
      return createdAt >= twentyFourHoursAgo;
    });
  };

  const fetchRecordings = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/recordings`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched recordings:', data);
        
        // Filter out expired recordings (older than 24 hours)
        const activeRecordings = await deleteExpiredRecordings(data);
        setRecordings(activeRecordings);
        console.log('Active recordings after cleanup:', activeRecordings);
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchRecordings();

    // Check for expired recordings every minute
    const intervalId = setInterval(() => {
      fetchRecordings();
    }, 60 * 1000); // Every 60 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const handleBubbleClick = useCallback(async (body, recordingId) => {
    console.log('handleBubbleClick called with recordingId:', recordingId);
    // Fetch and play audio only when bubble is clicked (memory efficient)
    try {
      console.log('Fetching audio from backend...');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/recordings/${recordingId}`);
      if (response.ok) {
        console.log('Audio fetched successfully');
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Set playing state to true
        isPlayingRef.current = true;
        setShowPlayingIndicator(true);
        console.log('Playing audio...');
        audio.play();

        // When audio ends, set playing state back to false
        audio.onended = () => {
          console.log('Audio finished');
          isPlayingRef.current = false;
          setShowPlayingIndicator(false);
        };

        // Also handle error case
        audio.onerror = () => {
          console.error('Audio playback error');
          isPlayingRef.current = false;
          setShowPlayingIndicator(false);
        };

        // Burst bubble after playing starts
        setTimeout(() => {
          console.log('Bursting bubble...');
          burstBubble(body, recordingId);
        }, 500);
      } else {
        console.error('Failed to fetch audio, response status:', response.status);
      }
    } catch (error) {
      console.error('Error playing recording:', error);
      isPlayingRef.current = false;
      setShowPlayingIndicator(false);
    }
  }, []);

  const burstBubble = (body, recordingId) => {
    console.log('burstBubble called for recordingId:', recordingId);
    // Remove bubble from physics world
    Matter.World.remove(engineRef.current.world, body);
    
    // Remove from bubbles ref
    bubblesRef.current = bubblesRef.current.filter(b => b !== body);
    console.log('Bubble removed from physics world');
    
    // Delete recording from backend (but don't update state to prevent re-render)
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    fetch(`${apiUrl}/api/recordings/${recordingId}`, {
      method: 'DELETE',
    }).then(response => {
      if (response.ok) {
        console.log('Recording deleted from backend');
        // Don't update state - just remove from local tracking
        // This prevents the useEffect from re-running and recreating all bubbles
      }
    }).catch(error => {
      console.error('Error deleting recording:', error);
    });
  };

  // Initialize Matter.js physics engine
  useEffect(() => {
    if (!canvasRef.current || recordings.length === 0) return;

    const { Engine, Render, World, Bodies, Runner, Events, Mouse } = Matter;
    
    // Create engine with zero gravity
    const engine = Engine.create({
      gravity: { x: 0, y: 0 }
    });
    engineRef.current = engine;

    // Create renderer
    const render = Render.create({
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio,
        showAngleIndicator: false
      }
    });
    renderRef.current = render;

    // Create boundaries (invisible walls)
    const wallOptions = { 
      isStatic: true, 
      render: { visible: false } 
    };
    const walls = [
      Bodies.rectangle(window.innerWidth / 2, -50, window.innerWidth, 100, wallOptions),
      Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 50, window.innerWidth, 100, wallOptions),
      Bodies.rectangle(-50, window.innerHeight / 2, 100, window.innerHeight, wallOptions),
      Bodies.rectangle(window.innerWidth + 50, window.innerHeight / 2, 100, window.innerHeight, wallOptions)
    ];
    World.add(engine.world, walls);

    // Create bubbles for each recording
    const bubbles = recordings.map(recording => {
      const radius = 40 + Math.random() * 30;
      const x = 100 + Math.random() * (window.innerWidth - 200);
      const y = 100 + Math.random() * (window.innerHeight - 200);
      const hue = 200 + Math.random() * 60;
      
      const bubble = Bodies.circle(x, y, radius, {
        restitution: 0.95,
        friction: 0.001,
        frictionAir: 0.002,
        render: {
          fillStyle: `hsla(${hue}, 70%, 60%, 0.6)`,
          strokeStyle: `hsla(${hue}, 70%, 80%, 0.8)`,
          lineWidth: 2
        },
        plugin: {
          recordingId: recording._id,
          hue: hue,
          radius: radius
        }
      });

      // Add random velocity for floating
      Matter.Body.setVelocity(bubble, {
        x: (Math.random() - 0.5) * 4,
        y: (Math.random() - 0.5) * 4
      });

      return bubble;
    });

    bubblesRef.current = bubbles;
    World.add(engine.world, bubbles);
    console.log('Created', bubbles.length, 'bubbles');

    // Mouse interaction
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    });
    World.add(engine.world, mouseConstraint);

    // Handle click on bubbles using Matter.js mouse events
    Events.on(mouseConstraint, 'mousedown', (event) => {
      const { body } = event.source;
      console.log('Mouse down on body:', body ? 'yes' : 'no');
      if (body && body.plugin && body.plugin.recordingId) {
        console.log('Bubble clicked, recordingId:', body.plugin.recordingId);
        if (!isPlayingRef.current) {
          handleBubbleClick(body, body.plugin.recordingId);
        } else {
          console.log('Audio already playing, ignoring click');
        }
      }
    });

    // Also add canvas click event as fallback
    render.canvas.addEventListener('click', (event) => {
      const rect = render.canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;
      
      console.log('Canvas click at:', clickX, clickY);
      
      // Find clicked bubble
      const clickedBubble = bubblesRef.current.find(bubble => {
        const { x, y } = bubble.position;
        const radius = bubble.plugin.radius;
        const distance = Math.sqrt((clickX - x) ** 2 + (clickY - y) ** 2);
        return distance <= radius;
      });
      
      if (clickedBubble) {
        console.log('Bubble found via canvas click, recordingId:', clickedBubble.plugin.recordingId);
        if (!isPlayingRef.current) {
          handleBubbleClick(clickedBubble, clickedBubble.plugin.recordingId);
        } else {
          console.log('Audio already playing, ignoring click');
        }
      }
    });

    // Start engine and renderer
    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    // Add gentle floating force
    Events.on(engine, 'beforeUpdate', function() {
      bubblesRef.current.forEach(bubble => {
        const forceX = (Math.random() - 0.5) * 0.0001;
        const forceY = (Math.random() - 0.5) * 0.0001;
        Matter.Body.applyForce(bubble, bubble.position, { x: forceX, y: forceY });
      });
    });

    // Handle window resize
    const handleResize = () => {
      render.canvas.width = window.innerWidth;
      render.canvas.height = window.innerHeight;
      render.options.width = window.innerWidth;
      render.options.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      Events.off(engine, 'beforeUpdate');
      Render.stop(render);
      Runner.stop(runner);
      World.clear(engine.world);
      Engine.clear(engine);
      render.canvas.remove();
    };
  }, [recordings, handleBubbleClick]);

  return (
    <div className="recordings-page">
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

      <canvas ref={canvasRef} className="bubbles-canvas" />

      <div className="page-overlay">
        <div className="overlay-content">
          {loading ? (
            <p className="loading-text">Loading recordings...</p>
          ) : recordings.length === 0 ? (
            <p className="empty-text">No recordings yet. Go to the record page to create some!</p>
          ) : (
            <p className="hint-text">Tap bubbles to play and burst them</p>
          )}
          
          {showPlayingIndicator && (
            <p className="playing-indicator">🔊 Playing...</p>
          )}
        </div>

        <div className="bottom-nav">
          <Link to="/" className="nav-btn">
            Record
          </Link>
          <Link to="/recordings" className="nav-btn active">
            Bubbles
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RecordingsPage;
