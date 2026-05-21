'use client'

import { useTransform, motion, MotionValue } from 'framer-motion'

interface ScrollOverlayTextProps {
  scrollProgress: MotionValue<number>
}

const textSegments = [
  {
    range: [0.15, 0.25],
    text: 'Real-Time Health Monitoring',
    subtext: 'Track vitals 24/7 with precision sensors',
  },
  {
    range: [0.45, 0.55],
    text: 'AI-Powered Disease Detection',
    subtext: 'Early prediction with 86.76% accuracy',
  },
  {
    range: [0.75, 0.85],
    text: 'Seamless Doctor Integration',
    subtext: 'Connect with specialists instantly',
  },
]

export default function ScrollOverlayText({ scrollProgress }: ScrollOverlayTextProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {textSegments.map((segment, index) => {
        const opacity = useTransform(
          scrollProgress,
          [segment.range[0] - 0.05, segment.range[0], segment.range[1], segment.range[1] + 0.05],
          [0, 1, 1, 0]
        )

        const y = useTransform(
          scrollProgress,
          [segment.range[0] - 0.05, segment.range[0], segment.range[1], segment.range[1] + 0.05],
          [30, 0, 0, -30]
        )

        return (
          <motion.div
            key={index}
            style={{ opacity, y }}
            className="absolute text-center px-6"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
              {segment.text}
            </h2>
            <p className="text-lg md:text-xl text-gray-200 drop-shadow-lg">
              {segment.subtext}
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}
