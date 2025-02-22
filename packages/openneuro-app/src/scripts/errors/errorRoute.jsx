/**
 * Route for nice display of backend errors
 */
import React from 'react'
import { Route, Routes } from 'react-router-dom'
import OrcidGeneral from './orcid/general.jsx'
import OrcidEmail from './orcid/email.jsx'
import OrcidGiven from './orcid/given.jsx'
import OrcidFamily from './orcid/family.jsx'

class ErrorRoute extends React.Component {
  render() {
    return (
      <div className="container errors">
        <div className="panel">
          <Routes>
            <Route path="orcid" element={<OrcidGeneral />} />
            <Route path="orcid/email" element={<OrcidEmail />} />
            <Route path="orcid/given" element={<OrcidGiven />} />
            <Route path="orcid/family" element={<OrcidFamily />} />
          </Routes>
        </div>
      </div>
    )
  }
}

export default ErrorRoute
