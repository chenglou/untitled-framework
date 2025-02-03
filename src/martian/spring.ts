// === generic spring physics
// 4ms/step for the spring animation's step. Typically 4 steps for 60fps (16.6ms/frame) and 2 for 120fps (8.3ms/frame). Frame time delta varies, so not always true
// could use 8ms instead, but 120fps' 8.3ms/frame means the computation might not fit in the remaining 0.3ms, which means sometime the simulation step wouldn't even run once, giving the illusion of jank
export const msPerAnimationStep = 6
export type Spring = { pos: number; dest: number; v: number; k: number; b: number }

export function spring(position: number, destination = position, velocity = 0, stiffness = 225, damping = 30): Spring {
  // we default to a critical damping spring, aka damping = 2* sqrt(stiffness) per the physics
  return { pos: position, dest: destination, v: velocity, k: stiffness, b: damping } // try https://chenglou.me/react-motion/demos/demo5-spring-parameters-chooser/
}
export function springStep(config: Spring) {
  // https://blog.maximeheckel.com/posts/the-physics-behind-spring-animations/
  // this seems inspired by https://github.com/chenglou/react-motion/blob/9e3ce95bacaa9a1b259f969870a21c727232cc68/src/stepper.js
  const t = msPerAnimationStep / 1000 // convert to seconds for the physics equation
  const { pos, dest, v, k, b } = config
  // for animations, dest is actually spring at rest. Current position is the spring's stretched/compressed state
  const Fspring = -k * (pos - dest) // Spring stiffness, in kg / s^2
  const Fdamper = -b * v // Damping, in kg / s
  const a = Fspring + Fdamper // a needs to be divided by mass, but we'll assume mass of 1. Adjust k and b to change spring curve instead
  const newV = v + a * t
  const newPos = pos + newV * t

  config.pos = newPos
  config.v = newV
}
export function springGoToEnd(config: Spring) {
  config.pos = config.dest
  config.v = 0
}
export function springMostlyDone(s: Spring) {
  return Math.abs(s.v) < 0.01 && Math.abs(s.dest - s.pos) < 0.01
}
