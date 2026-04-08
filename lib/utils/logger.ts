type LogArgs = unknown[]

const canLog = process.env.NODE_ENV !== "production"

export function log(...args: LogArgs): void {
  if (canLog) {
    console.log(...args)
  }
}

export function error(...args: LogArgs): void {
  console.error(...args)
}

export function warn(...args: LogArgs): void {
  if (canLog) {
    console.warn(...args)
  }
}

export function info(...args: LogArgs): void {
  if (canLog) {
    console.info(...args)
  }
}
