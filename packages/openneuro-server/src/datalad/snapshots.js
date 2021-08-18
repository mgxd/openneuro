/**
 * Get snapshots from datalad-service tags
 */
import * as Sentry from '@sentry/node'
import request from 'superagent'
import { redis, redlock } from '../libs/redis'
import CacheItem, { CacheType } from '../cache/item'
import config from '../config.js'
import pubsub from '../graphql/pubsub.js'
import {
  updateDatasetName,
  snapshotCreationComparison,
} from '../graphql/resolvers/dataset.js'
import { description } from '../graphql/resolvers/description.js'
import doiLib from '../libs/doi/index.js'
import { getFiles } from './files'
import { generateDataladCookie } from '../libs/authentication/jwt'
import notifications from '../libs/notifications'
import Dataset from '../models/dataset'
import Snapshot from '../models/snapshot'
import { trackAnalytics } from './analytics.js'
import { updateDatasetRevision } from './draft.js'
import { getDatasetWorker } from '../libs/datalad-service'

const lockSnapshot = (datasetId, tag) => {
  return redlock.lock(
    `openneuro:create-snapshot-lock:${datasetId}:${tag}`,
    1800000,
  )
}

const createSnapshotMetadata = (datasetId, tag, hexsha, created) => {
  return Snapshot.update(
    { datasetId: datasetId, tag: tag },
    {
      $set: {
        datasetId: datasetId,
        tag: tag,
        hexsha: hexsha,
        created: created,
      },
    },
    { upsert: true },
  )
}

const createIfNotExistsDoi = async (
  datasetId,
  tag,
  descriptionFieldUpdates,
) => {
  if (config.doi.username && config.doi.password) {
    // Mint a DOI
    // Get the newest description
    try {
      const oldDesc = await description({ id: datasetId, revision: 'HEAD' })
      const snapshotDoi = await doiLib.registerSnapshotDoi(
        datasetId,
        tag,
        oldDesc,
      )
      if (snapshotDoi) descriptionFieldUpdates['DatasetDOI'] = snapshotDoi
    } catch (err) {
      Sentry.captureException(err)
      console.error(err)
      throw new Error('DOI minting failed.')
    }
  }
}

const postSnapshot = async (
  user,
  createSnapshotUrl,
  descriptionFieldUpdates,
  snapshotChanges,
) => {
  // Create snapshot once DOI is ready
  const response = await request
    .post(createSnapshotUrl)
    .send({
      description_fields: descriptionFieldUpdates,
      snapshot_changes: snapshotChanges,
    })
    .set('Accept', 'application/json')
    .set('Cookie', generateDataladCookie(config)(user))

  return response.body
}

/**
 * Get a list of all snapshot tags available for a dataset
 *
 * This is equivalent to `git tag` on the repository
 *
 * @param {string} datasetId Dataset accession number
 * @returns {Promise<import('../models/snapshot').SnapshotDocument[]>}
 */
export const getSnapshots = datasetId => {
  const url = `${getDatasetWorker(datasetId)}/datasets/${datasetId}/snapshots`
  return request
    .get(url)
    .set('Accept', 'application/json')
    .then(({ body: { snapshots } }) => {
      return snapshots.sort(snapshotCreationComparison)
    })
}

const announceNewSnapshot = async (snapshot, datasetId, user) => {
  if (snapshot.files) {
    notifications.snapshotCreated(datasetId, snapshot, user) // send snapshot notification to subscribers
  }
  pubsub.publish('snapshotsUpdated', {
    datasetId,
    snapshotsUpdated: {
      id: datasetId,
      snapshots: await getSnapshots(datasetId),
      latestSnapshot: snapshot,
    },
  })
}

/**
 * Snapshot the current working tree for a dataset
 * @param {String} datasetId - Dataset ID string
 * @param {String} tag - Snapshot identifier and git tag
 * @param {Object} user - User object that has made the snapshot request
 * @param {Object} descriptionFieldUpdates - Key/value pairs to update dataset_description.json
 * @param {Array<string>} snapshotChanges - Array of changes to inject into CHANGES file
 * @returns {Promise<Snapshot>} - resolves when tag is created
 */
export const createSnapshot = async (
  datasetId,
  tag,
  user,
  descriptionFieldUpdates = {},
  snapshotChanges = [],
) => {
  const snapshotCache = new CacheItem(redis, CacheType.snapshot, [
    datasetId,
    tag,
  ])

  // lock snapshot id to prevent upload/update conflicts
  const snapshotLock = await lockSnapshot(datasetId, tag)

  try {
    await createIfNotExistsDoi(datasetId, tag, descriptionFieldUpdates)

    const createSnapshotUrl = `${getDatasetWorker(
      datasetId,
    )}/datasets/${datasetId}/snapshots/${tag}`
    const snapshot = await postSnapshot(
      user,
      createSnapshotUrl,
      descriptionFieldUpdates,
      snapshotChanges,
    )
    snapshot.created = new Date()
    snapshot.files = await getFiles(datasetId, tag)

    await Promise.all([
      // Update the draft status in datasets collection in case any changes were made (DOI, License)
      updateDatasetRevision(datasetId, snapshot.hexsha),

      // Update metadata in snapshots collection
      createSnapshotMetadata(datasetId, tag, snapshot.hexsha, snapshot.created),

      // Trigger an async update for the name field (cache for sorting)
      updateDatasetName(datasetId),
    ])

    snapshotLock.unlock()
    announceNewSnapshot(snapshot, datasetId, user)
    return snapshot
  } catch (err) {
    // delete the keys if any step fails
    // this avoids inconsistent cache state after failures
    snapshotCache.drop()
    snapshotLock.unlock()
    Sentry.captureException(err)
    return err
  }
}

export const deleteSnapshot = (datasetId, tag) => {
  const url = `${getDatasetWorker(
    datasetId,
  )}/datasets/${datasetId}/snapshots/${tag}`
  return request.del(url).then(async ({ body }) => {
    const snapshotCache = new CacheItem(redis, CacheType.snapshot, [
      datasetId,
      tag,
    ])
    await snapshotCache.drop()
    pubsub.publish('snapshotsUpdated', {
      datasetId,
      snapshotsUpdated: {
        id: datasetId,
        snapshots: await getSnapshots(datasetId),
      },
    })
    return body
  })
}

/**
 * Get the contents of a snapshot (files, git metadata) from datalad-service
 * @param {string} datasetId Dataset accession number
 * @param {string} commitRef Tag name to retrieve
 * @returns {Promise<import('../models/snapshot').SnapshotDocument>}
 */
export const getSnapshot = (datasetId, commitRef) => {
  const url = `${getDatasetWorker(
    datasetId,
  )}/datasets/${datasetId}/snapshots/${commitRef}`
  // Track a view for each snapshot query
  trackAnalytics(datasetId, commitRef, 'views')
  const cache = new CacheItem(redis, CacheType.snapshot, [datasetId, commitRef])
  return cache.get(() =>
    request
      .get(url)
      .set('Accept', 'application/json')
      .then(({ body }) => body),
  )
}

/**
 * Get the hexsha for a snapshot from the datasetId and tag
 *
 * Returns null for snapshots which do not exist
 *
 * @param {string} datasetId
 * @param {string} tag
 */
export const getSnapshotHexsha = (datasetId, tag) => {
  return Snapshot.findOne({ datasetId, tag }, { hexsha: true })
    .exec()
    .then(result => (result ? result.hexsha : null))
}

/**
 * Get Public Snapshots
 *
 * Returns the most recent snapshots of all publicly available datasets
 */
export const getPublicSnapshots = () => {
  // query all publicly available dataset
  return Dataset.find({ public: true }, 'id')
    .exec()
    .then(datasets => {
      const datasetIds = datasets.map(dataset => dataset.id)
      return Snapshot.aggregate([
        { $match: { datasetId: { $in: datasetIds } } },
        { $sort: { created: -1 } },
        {
          $group: {
            _id: '$datasetId',
            snapshots: { $push: '$$ROOT' },
          },
        },
        {
          $replaceRoot: {
            newRoot: { $arrayElemAt: ['$snapshots', 0] },
          },
        },
      ]).exec()
    })
}
