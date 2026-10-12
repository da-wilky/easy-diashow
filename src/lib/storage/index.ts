import { DEFAULT_SETTINGS, type Project } from '../project/types'

const DB_NAME = 'easy-diashow'
const STORE = 'projects'

function promisify<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const open = indexedDB.open(DB_NAME, 1)
  open.onupgradeneeded = () => open.result.createObjectStore(STORE, { keyPath: 'id' })
  const db = await promisify(open)
  try {
    const transaction = db.transaction(STORE, mode)
    const request = run(transaction.objectStore(STORE))
    // a write can still fail at commit, for example when the quota is exceeded
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error ?? request.error)
    })
    return request.result
  } finally {
    db.close()
  }
}

const projectDir = async (projectId: string, create = false) =>
  (await navigator.storage.getDirectory()).getDirectoryHandle(projectId, { create })

function unlessMissing(error: unknown) {
  if (!(error instanceof DOMException && error.name === 'NotFoundError')) throw error
}

export function isQuotaError(error: unknown) {
  return error instanceof DOMException && error.name === 'QuotaExceededError'
}

export async function listProjects(): Promise<Project[]> {
  // opening would recreate the database after "delete everything"
  if (!(await indexedDB.databases()).some((d) => d.name === DB_NAME)) return []
  const projects = await withStore<Project[]>('readonly', (s) => s.getAll())
  return projects.sort((a, b) => b.modified - a.modified)
}

export function loadProject(id: string) {
  return withStore<Project | undefined>('readonly', (s) => s.get(id))
}

export async function saveProject(project: Project) {
  await withStore('readwrite', (s) => s.put(project))
}

export async function createProject(name: string): Promise<Project> {
  // without persistence the browser may evict everything under storage pressure
  await navigator.storage.persist?.()
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    modified: Date.now(),
    images: [],
    tracks: [],
    watermark: null,
    settings: { ...DEFAULT_SETTINGS },
  }
  await projectDir(project.id, true)
  await saveProject(project)
  return project
}

export async function deleteProject(id: string) {
  await withStore('readwrite', (s) => s.delete(id))
  await (await navigator.storage.getDirectory()).removeEntry(id, { recursive: true }).catch(unlessMissing)
}

export async function deleteEverything() {
  await promisify(indexedDB.deleteDatabase(DB_NAME))
  const root = await navigator.storage.getDirectory()
  for await (const name of root.keys()) await root.removeEntry(name, { recursive: true })
}

/** Rejects with a QuotaExceededError when the origin's storage is full. */
export async function writeBlob(projectId: string, name: string, blob: Blob) {
  const file = await (await projectDir(projectId)).getFileHandle(name, { create: true })
  const writable = await file.createWritable()
  try {
    await writable.write(blob)
    await writable.close()
  } catch (error) {
    await writable.abort().catch(() => {})
    throw error
  }
}

export async function readBlob(projectId: string, name: string): Promise<File> {
  return (await (await projectDir(projectId)).getFileHandle(name)).getFile()
}

export async function removeBlob(projectId: string, name: string) {
  await (await projectDir(projectId)).removeEntry(name).catch(unlessMissing)
}

export async function projectSize(projectId: string) {
  let size = 0
  for await (const handle of (await projectDir(projectId)).values())
    if (handle.kind === 'file') size += (await (handle as FileSystemFileHandle).getFile()).size
  return size
}

export async function storageStatus() {
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usage, quota, persisted: await navigator.storage.persisted() }
}
