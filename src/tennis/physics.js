import * as THREE from 'three'

/** 真实球参数，但渲染时球会被放大，见 BALL_VISUAL_R。 */
export const BALL = {
  mass: 0.057,
  radius: 0.0335,
  visualRadius: 0.11,
  rho: 1.2,
  drag: 0.55,
  liftK: 0.7
}

export const GRAVITY = -9.81
export const FIXED_DT = 1 / 120

const AREA = Math.PI * BALL.radius * BALL.radius

/**
 * 半隐式欧拉一步：重力 + 空气阻力 + 马格努斯力。
 * spin 单位 rad/s，绕 y 轴为纯上旋/下旋。
 */
export function stepBall(pos, vel, spin, dt) {
  const speed = vel.length()
  const ax = -0.5 * BALL.rho * AREA * BALL.drag * speed * vel.x / BALL.mass
  const ay = GRAVITY - 0.5 * BALL.rho * AREA * BALL.drag * speed * vel.y / BALL.mass
  const az = -0.5 * BALL.rho * AREA * BALL.drag * speed * vel.z / BALL.mass

  const cross = new THREE.Vector3().crossVectors(spin, vel)
  let mx = 0
  let my = 0
  let mz = 0
  if (cross.lengthSq() > 1e-8) {
    const cl = BALL.liftK * (BALL.radius * spin.length() / Math.max(speed, 1))
    const k = 0.5 * BALL.rho * AREA * cl * speed * speed / BALL.mass
    cross.normalize()
    mx = cross.x * k
    my = cross.y * k
    mz = cross.z * k
  }

  vel.x += (ax + mx) * dt
  vel.y += (ay + my) * dt
  vel.z += (az + mz) * dt
  pos.addScaledVector(vel, dt)
}

/** 简化弹跳：法向恢复系数 + 旋转带来的切向"抓地"与上旋额外上跳。 */
export function bounceBall(pos, vel, spin, surface) {
  pos.y = BALL.visualRadius
  const e = surface.restitution ?? 0.76
  const mu = surface.friction ?? 0.5
  const ground = new THREE.Vector3().crossVectors(spin, new THREE.Vector3(0, 1, 0))
    .multiplyScalar(mu * BALL.radius)

  // 上旋绕 x 轴为正时，落地把前进速度部分转成向上速度，所以弹得更高
  const travel = Math.hypot(vel.x, vel.z)
  const topspin = Math.sign(spin.x) * Math.sign(vel.z || 1)
  const boost = topspin * Math.min(1, Math.abs(spin.x) / 400) * travel * 0.16

  vel.y = Math.abs(vel.y) * e + Math.max(-0.5, boost)
  vel.x = vel.x * (1 - mu) + ground.x
  vel.z = vel.z * (1 - mu) + ground.z
  spin.multiplyScalar(0.7)
}

/**
 * 采一条完整弹道：从击球点到两次落地。
 * 返回 { points: [{x,y,z,t}], bounces: [{x,z,t}], netY, netT }
 */
export function simulateTrajectory({
  from,
  velocity,
  spin = new THREE.Vector3(),
  surface,
  netHeight = 0.914,
  maxTime = 6
}) {
  const pos = new THREE.Vector3(from.x, from.y, from.z)
  const vel = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
  const w = spin.clone()
  const points = [{ x: pos.x, y: pos.y, z: pos.z, t: 0 }]
  const bounces = []
  let netY = null
  let netT = null
  let t = 0

  for (let i = 0; i < 1200 && t < maxTime; i += 1) {
    const prevZ = pos.z
    stepBall(pos, vel, w, FIXED_DT)
    t += FIXED_DT

    if (netY === null && prevZ < 0 && pos.z >= 0) {
      const k = prevZ / (prevZ - pos.z)
      netY = pos.y - vel.y * FIXED_DT * (1 - k)
      netT = t
    }

    if (pos.y < BALL.visualRadius && vel.y < 0) {
      bounceBall(pos, vel, w, surface)
      bounces.push({ x: pos.x, z: pos.z, t, speed: vel.length() })
      if (bounces.length >= 2) {
        points.push({ x: pos.x, y: pos.y, z: pos.z, t })
        break
      }
    }
    points.push({ x: pos.x, y: pos.y, z: pos.z, t })
  }

  return { points, bounces, netY, netT, duration: t }
}

/** 给定落点与飞行时间，反推初速（忽略阻力与旋转，用于教学参数化）。 */
export function solveVelocity(from, landX, landZ, duration) {
  const vy = (BALL.visualRadius - from.y + 0.5 * Math.abs(GRAVITY) * duration * duration) / duration
  return {
    x: (landX - from.x) / duration,
    y: vy,
    z: (landZ - from.z) / duration
  }
}

export function rpmToRad(rpm) {
  return (rpm * Math.PI * 2) / 60
}
