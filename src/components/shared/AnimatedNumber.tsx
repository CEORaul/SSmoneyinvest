"use client"

import { motion, useMotionValue, useSpring, useTransform } from "motion/react"
import { useEffect } from "react"

interface AnimatedNumberProps {
  value: number
  format: (value: number) => string
  className?: string
}

/// Counts up from 0 on mount, and animates from the old to the new value
/// whenever `value` changes — the app's signature for headline numeric
/// figures (summary cards, category totals). Updates the DOM directly via
/// the MotionValue transform, not a React re-render per frame.
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { duration: 800, bounce: 0 })
  const display = useTransform(spring, (current) => format(current))

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  )
}
