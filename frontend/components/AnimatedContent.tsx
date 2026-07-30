import React, { useRef, useEffect, ReactNode } from 'react';
import { motion, useAnimation } from 'motion/react';
import { useInView } from 'motion/react';

interface AnimatedContentProps {
  children: ReactNode;
  className?: string;
  distance?: number;
  direction?: 'vertical' | 'horizontal';
  reverse?: boolean;
  duration?: number;
  delay?: number;
  threshold?: number;
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  onComplete?: () => void;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  distance = 100,
  direction = 'vertical',
  reverse = false,
  duration = 0.8,
  delay = 0,
  threshold = 0.1,
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  className = '',
  onComplete,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const isInView = useInView(ref, { once: true, amount: threshold });

  const axis = direction === 'horizontal' ? 'x' : 'y';
  const offset = reverse ? distance : -distance;

  useEffect(() => {
    if (isInView) {
      controls.start({
        [axis]: 0,
        scale: 1,
        opacity: 1,
        transition: {
          duration,
          delay,
          ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
        },
      } as any);
    }
  }, [isInView, controls, axis, duration, delay]);

  useEffect(() => {
    if (isInView) {
      const timeout = setTimeout(() => onComplete?.(), (duration + delay) * 1000);
      return () => clearTimeout(timeout);
    }
  }, [isInView, duration, delay, onComplete]);

  return (
    <motion.div
      ref={ref}
      initial={{
        [axis]: offset,
        scale,
        opacity: animateOpacity ? initialOpacity : 1,
      }}
      animate={controls}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedContent;