import React from 'react'
import './count-toggle.scss'
import { Tooltip } from '../tooltip/Tooltip'
import { Button } from '../button/Button'
import { Modal } from '../modal/Modal'
import { UserModalInner } from '../modal/UserModalInner'

export interface CountToggleProps {
  label?: string
  icon?: string
  disabled?: boolean
  tooltip?: string
  onClick?: () => void
  lock?: boolean
  displayOptions: boolean
  setDisplayOptions: (boolean) => void
  count: number
}
export const CountToggle = ({
  label,
  icon,
  disabled,
  tooltip,
  onClick,
  displayOptions,
  setDisplayOptions,
  count,
}: CountToggleProps) => {
  const toggleClick = () => {
    onClick()
    setDisplayOptions(!displayOptions)
  }
  const [isOpen, setIsOpen] = React.useState(false)
  const toggleLogin = () => setIsOpen(!isOpen)
  const toggleButton = (
    <span className="toggle-counter">
      <Button
        className={displayOptions ? 'toggle-btn active' : 'toggle-btn'}
        iconSize="12px"
        icon={'fa ' + icon}
        onClick={() => toggleClick()}>
        {label} <span>{count}</span>
      </Button>
    </span>
  )
  const disabledToggleButton = (
    <span className="toggle-counter disabled">
      <Button
        className={displayOptions ? 'toggle-btn active' : 'toggle-btn'}
        iconSize="12px"
        icon={'fa ' + icon}
        onClick={() => toggleLogin()}>
        {label} <span>{count}</span>
      </Button>
    </span>
  )
  const button = disabled ? disabledToggleButton : toggleButton
  return (
    <>
      <div className="toggle-counter-wrap">
        {tooltip ? (
          <Tooltip flow="up" tooltip={tooltip}>
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </div>
      <Modal isOpen={isOpen} toggle={toggleLogin} closeText="Close">
        <UserModalInner />
      </Modal>
    </>
  )
}
