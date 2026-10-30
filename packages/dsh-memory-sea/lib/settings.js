import { clampInt, clampNumber } from './text.js'
import { JsonFile } from './paths.js'

export const DEFAULT_SETTINGS = Object.freeze({
  version: 1,
  retention: { shortDays: 7, longDays: 28 },
  writeEveryTurns: 2,
  capacity: { short: 120, long: 80, permanent: 60 },
  compressAtRatio: 0.9,
  detail: { short: 'rich', long: 'normal', permanent: 'brief' },
  inject: { enabled: true, shortLimit: 40, longSample: 4, permanentSample: 6, maxChars: 2400 },
  recall: { enabled: true, maxItems: 4, maxChars: 800, minScore: 2.5, maxLoaded: 16 },
  budgetTokens: 100000,
  selfCheck: { enabled: true, every: 30, threshold: 0.6 },
  judge: {
    enabled: true,
    provider: 'deepseek-account',
    model: 'deepseek-flash',
    temperature: 0.2,
    maxTokens: 2400,
    timeoutMs: 60000,
  },
  weights: { long: 55, permanent: 82 },
  maintenance: { intervalMinutes: 30 },
})

/** Detail budget per partition: how many characters a stored memory keeps. */
export const DETAIL_CHARS = Object.freeze({ rich: 120, normal: 80, brief: 45 })
export const DETAIL_LEVELS = Object.freeze(['rich', 'normal', 'brief'])
export const PARTITIONS = Object.freeze(['short', 'long', 'permanent'])
export const PARTITION_DIR = Object.freeze({ short: 'short-term', long: 'long-term', permanent: 'permanent' })

function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

/** Merge user input onto defaults and clamp every number into a sane range. */
export function normalizeSettings(raw) {
  const input = raw && typeof raw === 'object' ? raw : {}
  const base = DEFAULT_SETTINGS
  const retention = input.retention ?? {}
  const capacity = input.capacity ?? {}
  const detail = input.detail ?? {}
  const inject = input.inject ?? {}
  const recall = input.recall ?? {}
  const judge = input.judge ?? {}
  const weights = input.weights ?? {}
  const maintenance = input.maintenance ?? {}
  const selfCheck = input.selfCheck ?? {}
  return {
    version: 1,
    retention: {
      shortDays: clampNumber(retention.shortDays, 0.1, 365, base.retention.shortDays),
      longDays: clampNumber(retention.longDays, 1, 3650, base.retention.longDays),
    },
    writeEveryTurns: clampInt(input.writeEveryTurns, 1, 20, base.writeEveryTurns),
    capacity: {
      short: clampInt(capacity.short, 5, 8000, base.capacity.short),
      long: clampInt(capacity.long, 5, 8000, base.capacity.long),
      permanent: clampInt(capacity.permanent, 5, 8000, base.capacity.permanent),
    },
    compressAtRatio: clampNumber(input.compressAtRatio, 0.5, 1, base.compressAtRatio),
    detail: {
      short: oneOf(detail.short, DETAIL_LEVELS, base.detail.short),
      long: oneOf(detail.long, DETAIL_LEVELS, base.detail.long),
      permanent: oneOf(detail.permanent, DETAIL_LEVELS, base.detail.permanent),
    },
    inject: {
      enabled: inject.enabled !== false,
      shortLimit: clampInt(inject.shortLimit, 0, 500, base.inject.shortLimit),
      longSample: clampInt(inject.longSample, 0, 100, base.inject.longSample),
      permanentSample: clampInt(inject.permanentSample, 0, 100, base.inject.permanentSample),
      maxChars: clampInt(inject.maxChars, 200, 20000, base.inject.maxChars),
    },
    recall: {
      enabled: recall.enabled !== false,
      maxItems: clampInt(recall.maxItems, 0, 20, base.recall.maxItems),
      maxChars: clampInt(recall.maxChars, 100, 8000, base.recall.maxChars),
      minScore: clampNumber(recall.minScore, 0, 50, base.recall.minScore),
      maxLoaded: clampInt(recall.maxLoaded, 0, 100, base.recall.maxLoaded),
    },
    judge: {
      enabled: judge.enabled !== false,
      provider: String(judge.provider ?? base.judge.provider).trim() || base.judge.provider,
      model: String(judge.model ?? base.judge.model).trim() || base.judge.model,
      temperature: clampNumber(judge.temperature, 0, 2, base.judge.temperature),
      maxTokens: clampInt(judge.maxTokens, 200, 8000, base.judge.maxTokens),
      timeoutMs: clampInt(judge.timeoutMs, 5000, 300000, base.judge.timeoutMs),
    },
    weights: {
      long: clampInt(weights.long, 0, 100, base.weights.long),
      permanent: clampInt(weights.permanent, 0, 100, base.weights.permanent),
    },
    maintenance: {
      intervalMinutes: clampInt(maintenance.intervalMinutes, 1, 1440, base.maintenance.intervalMinutes),
    },
    budgetTokens: clampInt(input.budgetTokens, 1000, 10000000, base.budgetTokens),
    selfCheck: {
      enabled: selfCheck.enabled !== false,
      every: clampInt(selfCheck.every, 5, 1000, base.selfCheck.every),
      threshold: clampNumber(selfCheck.threshold, 0.3, 0.95, base.selfCheck.threshold),
    },
  }
}

export class SettingsStore {
  constructor(dataDir, fileConfig) {
    this.dataDir = dataDir
    this.file = new JsonFile(`${dataDir}/settings.json`, normalizeSettings(fileConfig))
    this.current = normalizeSettings(fileConfig)
  }

  async load() {
    const raw = await this.file.read()
    this.current = normalizeSettings(raw)
    await this.file.write(this.current)
    return this.current
  }

  get() {
    return this.current
  }

  async save(patch) {
    this.current = normalizeSettings(mergeDeep(this.current, patch ?? {}))
    await this.file.write(this.current)
    return this.current
  }
}

/** Deep-merge a settings patch so a partial update never wipes sibling fields. */
function mergeDeep(base, patch) {
  const out = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)
      && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      out[key] = mergeDeep(base[key], value)
    } else {
      out[key] = value
    }
  }
  return out
}
