/** 前端轮询进行中任务，超过 10 分钟停止请求 */
const POLL_INTERVAL_MS = 4000
const POLL_MAX_MS = 10 * 60 * 1000

export function isRunning(status) {
  return status === 'pending' || status === 'running'
}

/**
 * @param {() => Array} getJobs 返回当前任务列表
 * @param {(id: string) => Promise<object>} fetchJob 拉取单条最新状态
 * @param {(jobs: Array) => void} setJobs 写回列表
 * @returns {{ start: Function, stop: Function }}
 */
export function createJobPoller(getJobs, fetchJob, setJobs) {
  let timer = null
  let startedAt = 0

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    startedAt = 0
  }

  async function tick() {
    if (startedAt && Date.now() - startedAt >= POLL_MAX_MS) {
      stop()
      return
    }
    const jobs = getJobs() || []
    const running = jobs.filter((j) => isRunning(j.status))
    if (!running.length) {
      stop()
      return
    }
    const next = jobs.slice()
    for (const job of running) {
      try {
        const updated = await fetchJob(job.id)
        if (updated) {
          const idx = next.findIndex((j) => j.id === job.id)
          if (idx >= 0) next[idx] = updated
        }
      } catch {
        /* 单次失败忽略 */
      }
    }
    setJobs(next)
    if (!next.some((j) => isRunning(j.status))) {
      stop()
    }
  }

  function start() {
    const jobs = getJobs() || []
    if (!jobs.some((j) => isRunning(j.status))) {
      stop()
      return
    }
    if (!timer) {
      startedAt = Date.now()
      timer = setInterval(tick, POLL_INTERVAL_MS)
      tick()
    }
  }

  return { start, stop }
}

export { POLL_INTERVAL_MS, POLL_MAX_MS }
