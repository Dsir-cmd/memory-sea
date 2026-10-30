import { mkdir, readFile, rename, stat, writeFile, appendFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 本插件的安装根目录：DSH 通过 link 或安装路径加载它，data/ 就落在旁边。 */
export const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export async function ensureDir(path) {
  await mkdir(path, { recursive: true })
}

export async function readJson(file, fallback) {
  try {
    const text = await readFile(file, 'utf8')
    if (!text.trim()) return fallback
    return JSON.parse(text)
  } catch (error) {
    if (error && error.code === 'ENOENT') return fallback
    if (error instanceof SyntaxError) {
      // A half-written file must not take the whole plugin down: keep a copy and start over.
      try { await rename(file, `${file}.corrupt-${Date.now()}`) } catch { /* ignore */ }
      return fallback
    }
    throw error
  }
}

async function fileSize(file) {
  try { return (await stat(file)).size } catch { return 0 }
}

/** Serialized atomic JSON writer: temp file + rename, one write at a time. */
export class JsonFile {
  constructor(file, initial) {
    this.file = file
    this.initial = initial
    this.chain = Promise.resolve()
  }

  async read() {
    return readJson(this.file, this.initial)
  }

  write(value) {
    const text = `${JSON.stringify(value, null, 2)}\n`
    const task = this.chain.then(async () => {
      await ensureDir(dirname(this.file))
      const tmp = `${this.file}.${process.pid}.tmp`
      await writeFile(tmp, text, 'utf8')
      await rename(tmp, this.file)
      return text.length
    })
    this.chain = task.catch(() => {})
    return task
  }

  async size() {
    return fileSize(this.file)
  }
}

export async function appendLine(file, value) {
  await ensureDir(dirname(file))
  await appendFile(file, `${JSON.stringify(value)}\n`, 'utf8')
}

/** Plain text write (used for the human-readable MEMORY.md mirrors). */
export async function writeText(file, text) {
  await ensureDir(dirname(file))
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, text, 'utf8')
  await rename(tmp, file)
}
