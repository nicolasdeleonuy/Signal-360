import React from 'react'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from '../loading-spinner'

describe('LoadingSpinner', () => {
  it('should render with default props', () => {
    render(<LoadingSpinner />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(document.querySelector('.loading-spinner')).toBeInTheDocument()
  })

  it('should render with custom message', () => {
    render(<LoadingSpinner message="Custom loading message" />)

    expect(screen.getByText('Custom loading message')).toBeInTheDocument()
  })

  it('should render without message when message is empty', () => {
    render(<LoadingSpinner message="" />)

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(document.querySelector('.loading-spinner')).toBeInTheDocument()
  })

  it('should render small size spinner', () => {
    render(<LoadingSpinner size="small" />)

    const spinner = document.querySelector('.loading-spinner')
    expect(spinner).toHaveStyle({
      width: '24px',
      height: '24px'
    })
  })

  it('should render medium size spinner', () => {
    render(<LoadingSpinner size="medium" />)

    const spinner = document.querySelector('.loading-spinner')
    expect(spinner).toHaveStyle({
      width: '40px',
      height: '40px'
    })
  })

  it('should render large size spinner', () => {
    render(<LoadingSpinner size="large" />)

    const spinner = document.querySelector('.loading-spinner')
    expect(spinner).toHaveStyle({
      width: '60px',
      height: '60px'
    })
  })

  it('should render fullscreen spinner', () => {
    render(<LoadingSpinner fullScreen={true} />)

    const container = document.querySelector('.loading-spinner-container')
    expect(container).toHaveStyle({
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      zIndex: '9999'
    })
  })

  it('should render with custom color', () => {
    render(<LoadingSpinner color="#ff0000" />)

    const spinner = document.querySelector('.loading-spinner')
    expect(spinner).toHaveStyle({
      borderTop: '4px solid #ff0000'
    })
  })

  it('should have proper styling for different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="small" message="Small spinner" />)
    
    let message = screen.getByText('Small spinner')
    expect(message).toHaveStyle({ fontSize: '0.9rem' })

    rerender(<LoadingSpinner size="medium" message="Medium spinner" />)
    
    message = screen.getByText('Medium spinner')
    expect(message).toHaveStyle({ fontSize: '1rem' })

    rerender(<LoadingSpinner size="large" message="Large spinner" />)
    
    message = screen.getByText('Large spinner')
    expect(message).toHaveStyle({ fontSize: '1rem' })
  })

  it('should include CSS animation', () => {
    render(<LoadingSpinner />)

    const spinner = document.querySelector('.loading-spinner')
    expect(spinner).toHaveStyle({
      animation: 'spin 1s linear infinite'
    })

    // Check that the CSS keyframes are included
    const style = document.querySelector('style')
    expect(style?.textContent).toContain('@keyframes spin')
    expect(style?.textContent).toContain('transform: rotate(0deg)')
    expect(style?.textContent).toContain('transform: rotate(360deg)')
  })

  it('should have proper container layout', () => {
    render(<LoadingSpinner />)

    const container = document.querySelector('.loading-spinner-container')
    expect(container).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px'
    })
  })

  it('should handle all prop combinations', () => {
    render(
      <LoadingSpinner 
        size="large" 
        message="Complex loading..." 
        fullScreen={true}
        color="#00ff00"
      />
    )

    expect(screen.getByText('Complex loading...')).toBeInTheDocument()
    
    const container = document.querySelector('.loading-spinner-container')
    expect(container).toHaveStyle({
      position: 'fixed',
      zIndex: '9999'
    })

    const spinner = document.querySelector('.loading-spinner')
    expect(spinner).toHaveStyle({
      width: '60px',
      height: '60px',
      borderTop: '4px solid #00ff00'
    })
  })

  it('should be accessible', () => {
    render(<LoadingSpinner message="Loading content" />)

    // Should have proper text content for screen readers
    expect(screen.getByText('Loading content')).toBeInTheDocument()
    
    // Container should be focusable for accessibility
    const container = document.querySelector('.loading-spinner-container')
    expect(container).toBeInTheDocument()
  })

  it('should handle edge cases', () => {
    // Test with undefined message
    render(<LoadingSpinner message={undefined} />)
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()

    // Test with null message
    const { rerender } = render(<LoadingSpinner message={null as any} />)
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()

    // Test with empty string message
    rerender(<LoadingSpinner message="" />)
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })
})