import request from 'superagent'
import { redis } from '../libs/redis'
import CacheItem, { CacheType } from '../cache/item'
import { getDatasetWorker } from '../libs/datalad-service'

/**
 * Convert to URL compatible path
 * @param {String} path
 */
export const encodeFilePath = path => {
  return path.replace(new RegExp('/', 'g'), ':')
}

/**
 * Convert to from URL compatible path fo filepath
 * @param {String} path
 */
export const decodeFilePath = path => {
  return path.replace(new RegExp(':', 'g'), '/')
}

/**
 * If path is provided, this is a subdirectory, otherwise a root level file.
 * @param {String} path
 * @param {String} filename
 */
export const getFileName = (path, filename) => {
  const filePath = path ? [path, filename].join('/') : filename
  return filename ? encodeFilePath(filePath) : encodeFilePath(path)
}

/**
 * Generate file URL for DataLad service
 * @param {String} datasetId
 * @param {String} path - Relative path for the file
 * @param {String} filename
 * @param {String} [revision] - Git hash of commit or tree owning this file
 */
export const fileUrl = (datasetId, path, filename, revision) => {
  const fileName = getFileName(path, filename)
  if (revision) {
    return `http://${getDatasetWorker(
      datasetId,
    )}/datasets/${datasetId}/snapshots/${revision}/files/${fileName}`
  } else {
    return `http://${getDatasetWorker(
      datasetId,
    )}/datasets/${datasetId}/files/${fileName}`
  }
}

/**
 * Generate path URL (such a directory or virtual path) for DataLad service
 * @param {String} datasetId
 */
export const filesUrl = datasetId =>
  `http://${getDatasetWorker(datasetId)}/datasets/${datasetId}/files`

/**
 * Sum all file sizes for total dataset size
 */
export const computeTotalSize = files =>
  files.reduce((size, f) => size + f.size, 0)

/**
 * Get files for a specific revision
 * Similar to getDraftFiles but different cache key and fixed revisions
 * @param {string} datasetId - Dataset accession number
 * @param {string} treeish - Git treeish hexsha
 */
export const getFiles = (datasetId, treeish) => {
  const cache = new CacheItem(redis, CacheType.commitFiles, [
    datasetId,
    treeish.substring(0, 7),
  ])
  return cache.get(() =>
    request
      .get(
        `${getDatasetWorker(datasetId)}/datasets/${datasetId}/tree/${treeish}`,
      )
      .set('Accept', 'application/json')
      .then(response => {
        if (response.status === 200) {
          const {
            body: { files },
          } = response
          return files
        }
      }),
  )
}

/**
 * Given a list of files (from getFiles), return a subset matching the prefix
 * @param {string} prefix The prefix to filter on
 * @returns {(files: Object[]) => Object[]}
 */
export const filterFiles =
  (prefix = '') =>
  files => {
    // Disable on null
    if (prefix === null) {
      return files
    }
    // Track potential directories and include those as "files"
    const directoryFacades = {}
    // Return only root level files if prefix is set
    const matchingFiles = files.filter(f => {
      if (prefix === '') {
        if (f.filename.includes('/')) {
          const dirName = f.filename.split('/').slice(0, 1)[0]
          if (directoryFacades[dirName] !== undefined) {
            directoryFacades[dirName].size += 1
          } else {
            directoryFacades[dirName] = {
              id: `directory:${dirName}`,
              urls: [],
              filename: dirName,
              size: 1,
              directory: true,
            }
          }
          return false
        } else {
          return true
        }
      } else {
        return f.filename.startsWith(prefix)
      }
    })
    return [...matchingFiles, ...Object.values(directoryFacades)]
  }
