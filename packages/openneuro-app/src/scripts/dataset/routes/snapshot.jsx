import React, { useState } from 'react'
import PropTypes from 'prop-types'
import semver from 'semver'
import SnapshotDataset from '../mutations/snapshot'
import EditList from '../fragments/edit-list.jsx'
import { Button } from '@openneuro/components/button'
import { DatasetPageBorder } from './styles/dataset-page-border'
import { HeaderRow4 } from './styles/header-row'
import styled from '@emotion/styled'

const FormRow = styled.div`
  margin-top: 0;
  margin-bottom: 1.3em;
`

export const NoErrors = ({ issues, children }) => {
  const noErrors =
    issues && issues.filter(issue => issue.severity === 'error').length === 0
  // zero authors will cause DOI minting to fail
  const hasAuthor =
    issues && issues.filter(issue => issue.code === 113).length === 0
  if (noErrors && hasAuthor) {
    return children
  } else {
    const correctErrorsMessage =
      'BIDS validation must be complete and all errors corrected'
    const noAuthorMessage =
      '"Authors" must include at least one entry in dataset_description.json'
    const includedMessages = []
    if (!noErrors) includedMessages.push(correctErrorsMessage)
    if (!hasAuthor) includedMessages.push(noAuthorMessage)
    return (
      <span className="text-danger">
        {`${includedMessages.join(' and ')} to create a version`}
      </span>
    )
  }
}

const SnapshotRoute = ({ datasetId, snapshots, issues, description }) => {
  const [changes, setChanges] = useState([])
  const [semanticLevel, setSemanticLevel] = useState('patch')
  const draftLicense = (description && description.License) || 'none'
  const requiredLicense = 'CC0'
  const updateToCC0 = draftLicense !== requiredLicense

  const latestSnapshot = snapshots.length && snapshots[snapshots.length - 1]
  const newVersion =
    snapshots.length && semver.valid(latestSnapshot.tag)
      ? semver.inc(latestSnapshot.tag, semanticLevel)
      : '1.0.0'

  const majorActive = semanticLevel === 'major' && 'active'
  const minorActive = semanticLevel === 'minor' && 'active'
  const patchActive = semanticLevel === 'patch' && 'active'

  return (
    <DatasetPageBorder>
      <div className="dataset-snapshot-form container">
        <div className="dataset-form-body">
          {updateToCC0 && (
            <div className="alert-warning padded-message">
              <span>
                <strong>Notice:</strong>
                {` the current license "${draftLicense}" will be updated to "CC0" when the version is created. Please see FAQ item "Are there any restrictions on the uploaded data?" for details.`}
              </span>
            </div>
          )}
          <HeaderRow4>Version</HeaderRow4>
          <FormRow className="snapshot-input-group">
            {newVersion}
            <div className="input-group-btn">
              <Button
                secondary={true}
                label="Major"
                size="xsmall"
                className={`btn btn-default ${majorActive}`}
                onClick={() => setSemanticLevel('major')}
              />
              <Button
                secondary={true}
                label="Minor"
                size="xsmall"
                className={`btn btn-default ${minorActive}`}
                onClick={() => setSemanticLevel('minor')}
              />
              <Button
                secondary={true}
                label="Patch"
                size="xsmall"
                className={`btn btn-default ${patchActive}`}
                onClick={() => setSemanticLevel('patch')}
              />
            </div>
          </FormRow>
          <HeaderRow4>Changelog</HeaderRow4>
          <EditList
            placeholder="Enter new changes here..."
            elements={changes}
            setElements={setChanges}
          />
        </div>
        <NoErrors issues={issues}>
          {changes.length ? null : (
            <small className="text-danger">
              You must add at least one change message to create a new version
            </small>
          )}
        </NoErrors>
        <div className="col-xs-12 dataset-form-controls">
          <div className="col-xs-12 modal-actions">
            <NoErrors issues={issues}>
              {changes.length ? (
                <SnapshotDataset
                  datasetId={datasetId}
                  tag={newVersion}
                  changes={changes}
                />
              ) : null}
            </NoErrors>
          </div>
        </div>
      </div>
    </DatasetPageBorder>
  )
}

SnapshotRoute.propTypes = {
  datasetId: PropTypes.string,
  snapshots: PropTypes.array,
  issues: PropTypes.array,
  description: PropTypes.object,
}

export default SnapshotRoute
