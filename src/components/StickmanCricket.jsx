export default function StickmanCricket() {
  return (
    <svg 
      viewBox="0 0 400 300" 
      className="absolute inset-0 w-full h-full text-white/20 z-0" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="6"
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {/* Pitch line */}
      <line x1="50" y1="250" x2="350" y2="250" strokeWidth="4" className="text-white/10" />
      
      {/* Stumps */}
      <line x1="90" y1="170" x2="90" y2="250" />
      <line x1="105" y1="170" x2="105" y2="250" />
      <line x1="120" y1="170" x2="120" y2="250" />
      <line x1="85" y1="170" x2="125" y2="170" strokeWidth="4" /> {/* Bails */}

      {/* Stickman Batsman */}
      {/* Head */}
      <circle cx="170" cy="110" r="20" />
      
      {/* Body */}
      <line x1="170" y1="130" x2="160" y2="200" />
      
      {/* Back leg (bent) */}
      <line x1="160" y1="200" x2="140" y2="250" />
      
      {/* Front leg (stepping forward) */}
      <polyline points="160,200 210,210 220,250" />
      
      {/* Arms swinging */}
      <polyline points="170,140 140,160 160,190" /> {/* Back arm */}
      <polyline points="170,140 210,160 220,180" /> {/* Front arm */}

      {/* Bat */}
      <line x1="220" y1="180" x2="150" y2="130" strokeWidth="12" />
      <line x1="220" y1="180" x2="225" y2="190" strokeWidth="6" /> {/* Handle */}

      {/* Ball (incoming) */}
      <circle cx="280" cy="160" r="6" fill="currentColor" />
      
      {/* Action lines for ball */}
      <line x1="310" y1="140" x2="295" y2="150" strokeWidth="3" strokeDasharray="5,5" />
      <line x1="330" y1="130" x2="320" y2="135" strokeWidth="3" strokeDasharray="5,5" />
    </svg>
  );
}
