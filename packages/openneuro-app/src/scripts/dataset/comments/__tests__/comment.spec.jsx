import React from 'react'
import { render } from '@testing-library/react'
import Comment from '../comment.jsx'
import formatDistanceToNow from 'date-fns/formatDistanceToNow'

vi.mock('date-fns/formatDistanceToNow')

const emptyState =
  '{"blocks":[{"key":"3sm42","text":"","type":"unstyled","depth":0,"inlineStyleRanges":[],"entityRanges":[],"data":{}}],"entityMap":{}}'

describe('Comment component', () => {
  it('renders with an empty comment', () => {
    formatDistanceToNow.mockReturnValueOnce('almost 2 years')

    const wrapper = render(
      <Comment
        data={{
          id: '9001',
          text: emptyState,
          user: { id: '1234', email: 'example@example.com' },
          createDate: new Date('2019-04-02T19:56:41.222Z').toISOString(),
        }}
      />,
    )
    expect(wrapper).toMatchSnapshot()
  })
})
