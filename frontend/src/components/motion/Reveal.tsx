"use client";

import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export const easeOut = [0.22, 1, 0.36, 1] as const;

export function useMotionSafe() {
  const reduce = useReducedMotion();
  return {
    reduce: Boolean(reduce),
    duration: reduce ? 0 : 0.45,
    stagger: reduce ? 0 : 0.07,
  };
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  once = true,
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  as?: "div" | "section" | "li" | "article";
} & Omit<HTMLMotionProps<"div">, "children">) {
  const { reduce, duration } = useMotionSafe();
  const Comp = motion[Tag] as typeof motion.div;

  return (
    <Comp
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      transition={{ duration, delay: reduce ? 0 : delay, ease: easeOut }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export function Stagger({
  children,
  className,
  stagger = 0.07,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  as?: "div" | "ul" | "ol" | "section";
}) {
  const { reduce } = useMotionSafe();
  const Comp = motion[Tag] as typeof motion.div;

  return (
    <Comp
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "show"}
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: reduce ? 0 : stagger },
        },
      }}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const { reduce, duration } = useMotionSafe();
  const Comp = motion[Tag] as typeof motion.div;

  return (
    <Comp
      className={className}
      variants={
        reduce
          ? undefined
          : {
              hidden: { opacity: 0, y: 16 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration, ease: easeOut },
              },
            }
      }
    >
      {children}
    </Comp>
  );
}

export function CountUp({
  value,
  suffix = "",
  prefix = "",
  className,
  duration = 1.1,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: reduce ? 200 : 70,
    damping: reduce ? 40 : 22,
    duration: reduce ? 0 : duration,
  });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, motionValue, value]);

  useEffect(() => {
    const unsub = spring.on("change", (latest) => {
      if (!ref.current) return;
      ref.current.textContent = `${prefix}${Math.round(latest)}${suffix}`;
    });
    return () => unsub();
  }, [spring, prefix, suffix]);

  return (
    <span ref={ref} className={cn(className)}>
      {prefix}
      {0}
      {suffix}
    </span>
  );
}
