import fs from 'fs/promises'
import path from 'path'

export interface StorageProvider {
  put(fileName: string, buffer: Buffer, mimeType: string): Promise<string>;
  getSignedOrAuthenticatedStream(filePath: string): Promise<ReadableStream | Buffer>;
  delete(filePath: string): Promise<void>;
}

export class LocalDiskStorage implements StorageProvider {
  private baseDir = path.join(process.cwd(), 'uploads')

  constructor() {
    // Ensure upload directory exists
    fs.mkdir(this.baseDir, { recursive: true }).catch(console.error)
  }

  async put(fileName: string, buffer: Buffer, mimeType: string): Promise<string> {
    const filePath = path.join(this.baseDir, fileName)
    await fs.writeFile(filePath, buffer)
    return fileName // Return relative path or identifier
  }

  async getSignedOrAuthenticatedStream(fileName: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, fileName)
    return await fs.readFile(filePath)
  }

  async delete(fileName: string): Promise<void> {
    const filePath = path.join(this.baseDir, fileName)
    try {
      await fs.unlink(filePath)
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e
    }
  }
}

export class VercelBlobStorage implements StorageProvider {
  async put(fileName: string, buffer: Buffer, mimeType: string): Promise<string> {
    const { put } = await import('@vercel/blob')
    const { url } = await put(fileName, buffer, {
      access: 'public',
      contentType: mimeType,
    })
    return url
  }

  async getSignedOrAuthenticatedStream(url: string): Promise<Buffer> {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch blob')
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async delete(url: string): Promise<void> {
    const { del } = await import('@vercel/blob')
    try {
      await del(url)
    } catch (e) {
      console.error('Failed to delete blob', e)
    }
  }
}

// Use Vercel Blob in production or if BLOB_READ_WRITE_TOKEN is set
export const storage: StorageProvider = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_ENV
  ? new VercelBlobStorage() 
  : new LocalDiskStorage()
