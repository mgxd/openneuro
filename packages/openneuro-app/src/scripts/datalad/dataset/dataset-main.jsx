import React from 'react'
import PropTypes from 'prop-types'
import DatasetRoutes from './dataset-routes.jsx'
import DatasetComments from './dataset-comments.jsx'

const DatasetMain = ({ dataset }) => (
  <>
    <div className="row">
      <DatasetRoutes dataset={dataset} />
    </div>
    <div className="row">
      <DatasetComments datasetId={dataset.id} />
    </div>
  </>
)

DatasetMain.propTypes = {
  dataset: PropTypes.object,
}

export default DatasetMain
