import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const useMedia = (queries: string[], values: number[], defaultValue: number): number => {
  const get = () => values[queries.findIndex(q => matchMedia(q).matches)] ?? defaultValue;
  const [value, setValue] = useState<number>(get);

  useEffect(() => {
    const handler = () => setValue(get);
    queries.forEach(q => matchMedia(q).addEventListener('change', handler));
    return () => queries.forEach(q => matchMedia(q).removeEventListener('change', handler));
  }, [queries]);

  return value;
};

const useMeasure = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, size] as const;
};

const preloadImages = async (urls: string[]): Promise<void> => {
  await Promise.all(
    urls.map(
      src =>
        new Promise<void>(resolve => {
          const img = new Image();
          img.src = src;
          img.onload = img.onerror = () => resolve();
        })
    )
  );
};

interface Item {
  id: string;
  img: string;
  url: string;
  height: number;
}

interface GridItem extends Item {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MasonryProps {
  items: Item[];
  duration?: number;
  stagger?: number;
  animateFrom?: 'bottom' | 'top' | 'left' | 'right' | 'center' | 'random';
  scaleOnHover?: boolean;
  hoverScale?: number;
  blurToFocus?: boolean;
  colorShiftOnHover?: boolean;
}

const getInitialPosition = (item: GridItem, animateFrom: string, containerRect: DOMRect | null) => {
  if (!containerRect) return { x: item.x, y: item.y };

  let direction = animateFrom;
  if (animateFrom === 'random') {
    const dirs = ['top', 'bottom', 'left', 'right'];
    direction = dirs[Math.floor(Math.random() * dirs.length)];
  }

  switch (direction) {
    case 'top': return { x: item.x, y: -200 };
    case 'bottom': return { x: item.x, y: window.innerHeight + 200 };
    case 'left': return { x: -200, y: item.y };
    case 'right': return { x: window.innerWidth + 200, y: item.y };
    case 'center': return { x: containerRect.width / 2 - item.w / 2, y: containerRect.height / 2 - item.h / 2 };
    default: return { x: item.x, y: item.y + 100 };
  }
};

const Masonry: React.FC<MasonryProps> = ({
  items,
  duration = 0.6,
  stagger = 0.05,
  animateFrom = 'bottom',
  scaleOnHover = true,
  hoverScale = 0.95,
  blurToFocus = true,
  colorShiftOnHover = false,
}) => {
  const columns = useMedia(
    ['(min-width:1500px)', '(min-width:1000px)', '(min-width:600px)', '(min-width:400px)'],
    [5, 4, 3, 2],
    1
  );

  const [containerRef, { width }] = useMeasure<HTMLDivElement>();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const grid = useMemo<GridItem[]>(() => {
    if (!width) return [];
    const colHeights = new Array(columns).fill(0);
    const gap = 16;
    const totalGaps = (columns - 1) * gap;
    const columnWidth = (width - totalGaps) / columns;

    return items.map(child => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = col * (columnWidth + gap);
      const height = child.height / 2;
      const y = colHeights[col];
      colHeights[col] += height + gap;
      return { ...child, x, y, w: columnWidth, h: height };
    });
  }, [columns, items, width]);

  const containerRect = containerRef.current?.getBoundingClientRect() || null;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <AnimatePresence>
        {grid.map((item, index) => {
          const startPos = getInitialPosition(item, animateFrom, containerRect);
          const isHovered = hoveredId === item.id;

          return (
            <motion.div
              key={item.id}
              initial={{
                opacity: 0,
                x: startPos.x,
                y: startPos.y,
                width: item.w,
                height: item.h,
                filter: blurToFocus ? 'blur(10px)' : 'none',
              }}
              animate={{
                opacity: 1,
                x: item.x,
                y: item.y,
                width: item.w,
                height: item.h,
                filter: 'blur(0px)',
                scale: isHovered && scaleOnHover ? hoverScale : 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.8,
                transition: { duration: 0.3 },
              }}
              transition={{
                duration,
                delay: index * stagger,
                ease: [0.25, 0.4, 0.25, 1],
              }}
              className="absolute box-content cursor-pointer"
              style={{ willChange: 'transform, width, height, opacity' }}
              onClick={() => window.open(item.url, '_blank', 'noopener')}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className="relative w-full h-full bg-cover bg-center rounded-[10px] shadow-[0px_10px_50px_-10px_rgba(0,0,0,0.2)] uppercase text-[10px] leading-[10px]"
                style={{ backgroundImage: `url(${item.img})` }}
              >
                {colorShiftOnHover && (
                  <motion.div
                    className="absolute inset-0 rounded-[10px] bg-gradient-to-tr from-pink-500/50 to-sky-500/50 pointer-events-none"
                    animate={{ opacity: isHovered ? 0.3 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default Masonry;