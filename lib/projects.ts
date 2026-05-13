import { db } from './firebase'
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  query, orderBy, where, serverTimestamp, Timestamp,
} from 'firebase/firestore'

const USER_ID = 'local'

export interface Project {
  id: string
  name: string
  templateId: string
  platform: string
  params: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  userId: string
}

export interface Render {
  id: string
  renderId: string
  version: number
  platform: string
  durationSeconds: number
  status: 'done' | 'error'
  createdAt: Date
}

/** Upsert a project by name. Returns projectId. */
export async function saveProject(
  name: string,
  templateId: string,
  platform: string,
  params: Record<string, unknown>,
): Promise<string> {
  const projectsRef = collection(db, 'projects')
  const existing = await getDocs(
    query(projectsRef, where('name', '==', name), where('userId', '==', USER_ID)),
  )
  if (!existing.empty) {
    const id = existing.docs[0].id
    await updateDoc(doc(db, 'projects', id), {
      params,
      platform,
      updatedAt: serverTimestamp(),
    })
    return id
  }
  const ref = await addDoc(projectsRef, {
    name,
    templateId,
    platform,
    params,
    userId: USER_ID,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/** Add a render record to a project's renders subcollection. */
export async function addRender(
  projectId: string,
  renderId: string,
  platform: string,
  durationSeconds: number,
  version: number,
): Promise<void> {
  await addDoc(collection(db, 'projects', projectId, 'renders'), {
    renderId,
    version,
    platform,
    durationSeconds,
    status: 'done',
    createdAt: serverTimestamp(),
  })
}

/** List all projects for the local user, newest first. */
export async function listProjects(): Promise<Project[]> {
  const snap = await getDocs(
    query(
      collection(db, 'projects'),
      where('userId', '==', USER_ID),
      orderBy('updatedAt', 'desc'),
    ),
  )
  return snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
    } as Project
  })
}

/** Get a single project by ID. */
export async function getProject(projectId: string): Promise<Project> {
  const snap = await getDoc(doc(db, 'projects', projectId))
  const data = snap.data()!
  return {
    id: snap.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
  } as Project
}

/** Get all renders for a project, sorted by version ascending. */
export async function getRenders(projectId: string): Promise<Render[]> {
  const snap = await getDocs(
    query(collection(db, 'projects', projectId, 'renders'), orderBy('version', 'asc')),
  )
  return snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    } as Render
  })
}
