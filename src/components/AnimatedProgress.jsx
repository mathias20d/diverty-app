import React, { memo, useEffect, useRef, useState } from 'react';

const AnimatedProgress = memo(function AnimatedProgress({ value }) { 
    const [width, setWidth] = useState(0); const barRef = useRef(null); 
    useEffect(() => { 
        const o = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setTimeout(() => setWidth(value), 200); o.disconnect(); } }, { threshold: 0.1 }); 
        if (barRef.current) o.observe(barRef.current); 
        return () => o.disconnect(); 
    }, [value]); 
    return (
        <div ref={barRef} className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden bg-slate-200 shadow-inner" style={{ width: `${width}%` }}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#7657FF] via-[#8B5CF6] to-[#FF3EA5]"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-[200%] animate-[shimmer_2s_infinite]"></div>
        </div>
    ); 
});

export default AnimatedProgress;
