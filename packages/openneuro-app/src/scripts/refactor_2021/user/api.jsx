import React from 'react'
import Spinner from '../../common/partials/spinner'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import crn from '../../utils/crn.js'
import Helmet from 'react-helmet'
import { pageTitle } from '../../resources/strings.js'
import { AccordionTab, AccordionWrap } from '@openneuro/components/accordion'
import { Button } from '@openneuro/components/Button'
/**
 * Create API Key
 *
 * Given the current user, creates an api key
 * for use with the standalone CLI
 */
const createAPIKey = () => {
  return crn.createAPIKey().then(res => (res && res.body ? res.body.key : null))
}

class APIKeyGen extends React.Component {
  constructor(props) {
    super(props)
    this.requestKey = this._requestKey.bind(this)
    this.state = {
      loading: false,
      key: null,
    }
  }

  _requestKey() {
    this.setState({ loading: true })
    createAPIKey()
      .then(key => {
        this.setState({ key, loading: false })
      })
      .catch(() => {
        this.setState({ loading: false })
      })
  }

  _requestButton() {
    return (
      <Button
        primary={true}
        type="button"
        label="GENERATE NEW API KEY"
        className="btn btn-lg btn-primary"
        onClick={this.requestKey.bind(this)}
      />
    )
  }

  _loadingSpinner() {
    if (this.state.loading) {
      return <Spinner active={true} />
    } else {
      return null
    }
  }

  _key() {
    const content = (
      <div className="api-key-div">
        <pre className="api-key">{this.state.key}</pre>
        <div className="copy-key ck-wrap">
          <CopyToClipboard
            text={this.state.key}
            onCopy={this._onCopy.bind(this)}>
            <span className="copy-key">
              <i className="fa fa-link" aria-hidden="true" />{' '}
              {this._copyNotification()}
            </span>
          </CopyToClipboard>
        </div>
      </div>
    )
    if (this.state.key) {
      return content
    } else {
      return null
    }
  }
  _copyNotification() {
    const copyClass = this.state.linkCopied
      ? 'copy-notification-active copy-notification-copied'
      : 'copy-notification-active'
    const copyText = this.state.linkCopied ? 'Copied!' : 'Copy key to clipboard'
    return (
      <span>
        <span className={copyClass}>{copyText}</span>
      </span>
    )
  }

  _onCopy() {
    this.setState({ linkCopied: true })
    setTimeout(() => {
      this.setState({ linkCopied: false })
    }, 3000)
  }

  render() {
    const helperText = this.state.key
      ? 'Your API Key:'
      : 'Click the button below to generate an API key'
    return (
      <>
        <Helmet>
          <title>Generate API key for openneuro-cli - {pageTitle}</title>
        </Helmet>
        <div className="container api">
          <h2 className="heading">CLI API Key Generator</h2>
          <div className="explanation">
            Users that wish to use the CLI uploader will be required to
            authenticate their requests with an API key. Please store your API
            key in a safe place. If you lose your key, you can obtain a new one
            on this page. Once a new key is obtained, the previous key will
            become invalid.
          </div>

          <h3>{helperText}</h3>
          {this._loadingSpinner()}
          {this._key()}
          {this._requestButton()}
        </div>
      </>
    )
  }
}

export default APIKeyGen
