import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GameEngine } from './engine';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'win'>('start');
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const engine = new GameEngine(canvas, {
      onScoreChange: setScore,
      onGameOver: () => setGameState('gameover'),
      onWin: () => setGameState('win'),
    });
    engineRef.current = engine;

    const handleResize = () => {
      if (canvasRef.current && engineRef.current) {
        engineRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Initial draw for start screen background
    engine.draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.stop();
    };
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && engineRef.current) {
      engineRef.current.start();
    }
  }, [gameState]);

  const handleStart = () => {
    if (engineRef.current) {
      engineRef.current.reset();
      setGameState('playing');
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#0a0a0a] overflow-hidden font-mono text-white select-none">
      <canvas
        ref={canvasRef}
        className="block w-full h-full touch-none"
      />
      
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tighter text-white/90">MIDNIGHT JUMP</h1>
          <div className="text-xs text-white/50 tracking-widest uppercase">Gen Z Edition</div>
        </div>
        <div className="text-4xl font-bold tabular-nums tracking-tight text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
          {score.toString().padStart(3, '0')}
        </div>
      </div>

      {/* Menus */}
      {gameState === 'start' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <h2 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 drop-shadow-lg">
              READY?
            </h2>
            <p className="text-white/60 text-sm tracking-widest uppercase">Arrows/WASD to Move • Space to Jump • Shift to Dash</p>
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-white text-black font-bold text-lg tracking-wider hover:scale-105 active:scale-95 transition-transform rounded-full"
            >
              START GAME
            </button>
          </motion.div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 backdrop-blur-md z-10">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-6"
          >
            <h2 className="text-6xl font-black tracking-tighter text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]">
              WASTED
            </h2>
            <div className="text-2xl font-bold">Score: {score}</div>
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-red-500 text-white font-bold text-lg tracking-wider hover:bg-red-400 hover:scale-105 active:scale-95 transition-all rounded-full shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            >
              TRY AGAIN
            </button>
          </motion.div>
        </div>
      )}

      {gameState === 'win' && (
        <div className="absolute inset-0 flex items-center justify-center bg-cyan-900/20 backdrop-blur-md z-10">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-6"
          >
            <h2 className="text-6xl font-black tracking-tighter text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">
              VIBE CHECK PASSED
            </h2>
            <div className="text-2xl font-bold">Score: {score}</div>
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-cyan-400 text-black font-bold text-lg tracking-wider hover:bg-cyan-300 hover:scale-105 active:scale-95 transition-all rounded-full shadow-[0_0_20px_rgba(34,211,238,0.4)]"
            >
              PLAY AGAIN
            </button>
          </motion.div>
        </div>
      )}
      
      {/* Mobile Controls Hint */}
      <div className="absolute bottom-8 w-full text-center text-white/30 text-xs md:hidden pointer-events-none">
        Tap left/right to move • Tap top to jump
      </div>
    </div>
  );
}
