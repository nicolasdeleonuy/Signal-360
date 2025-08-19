import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '../toast'

// Test component that uses toast
function TestComponent() {
  const { showToast } = useToast()

  return (
    <div>
      <button onClick={() => showToast('success', 'Success message')}>
        Show Success
      </button>
      <button onClick={() => showToast('error', 'Error message')}>
        Show Error
      </button>
      <button onClick={() => showToast('warning', 'Warning message')}>
        Show Warning
      </button>
      <button onClick={() => showToast('info', 'Info message')}>
        Show Info
      </button>
      <button onClick={() => showToast('success', 'Persistent message', 0)}>
        Show Persistent
      </button>
    </div>
  )
}

describe('Toast System', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should render toast provider without errors', () => {
    render(
      <ToastProvider>
        <div>Test content</div>
      </ToastProvider>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should throw error when useToast is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useToast must be used within a ToastProvider')

    consoleSpy.mockRestore()
  })

  it('should show success toast', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByText('Show Success')
    await user.click(successButton)

    expect(screen.getByText('Success message')).toBeInTheDocument()
    expect(screen.getByText('✅')).toBeInTheDocument()
  })

  it('should show error toast', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const errorButton = screen.getByText('Show Error')
    await user.click(errorButton)

    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.getByText('❌')).toBeInTheDocument()
  })

  it('should show warning toast', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const warningButton = screen.getByText('Show Warning')
    await user.click(warningButton)

    expect(screen.getByText('Warning message')).toBeInTheDocument()
    expect(screen.getByText('⚠️')).toBeInTheDocument()
  })

  it('should show info toast', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const infoButton = screen.getByText('Show Info')
    await user.click(infoButton)

    expect(screen.getByText('Info message')).toBeInTheDocument()
    expect(screen.getByText('ℹ️')).toBeInTheDocument()
  })

  it('should auto-hide toast after duration', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByText('Show Success')
    await user.click(successButton)

    expect(screen.getByText('Success message')).toBeInTheDocument()

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument()
    })
  })

  it('should not auto-hide persistent toast', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const persistentButton = screen.getByText('Show Persistent')
    await user.click(persistentButton)

    expect(screen.getByText('Persistent message')).toBeInTheDocument()

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(10000)
    })

    // Should still be visible
    expect(screen.getByText('Persistent message')).toBeInTheDocument()
  })

  it('should close toast when close button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByText('Show Success')
    await user.click(successButton)

    expect(screen.getByText('Success message')).toBeInTheDocument()

    const closeButton = screen.getByText('×')
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument()
    })
  })

  it('should close toast when clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByText('Show Success')
    await user.click(successButton)

    const toast = screen.getByText('Success message').closest('.toast')
    expect(toast).toBeInTheDocument()

    await user.click(toast!)

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument()
    })
  })

  it('should show multiple toasts', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByText('Show Success')
    const errorButton = screen.getByText('Show Error')

    await user.click(successButton)
    await user.click(errorButton)

    expect(screen.getByText('Success message')).toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('should have proper styling for different toast types', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    // Test success toast styling
    const successButton = screen.getByText('Show Success')
    await user.click(successButton)

    const successToast = screen.getByText('Success message').closest('.toast-success')
    expect(successToast).toBeInTheDocument()

    // Test error toast styling
    const errorButton = screen.getByText('Show Error')
    await user.click(errorButton)

    const errorToast = screen.getByText('Error message').closest('.toast-error')
    expect(errorToast).toBeInTheDocument()
  })

  it('should handle rapid toast creation', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByText('Show Success')

    // Create multiple toasts rapidly
    await user.click(successButton)
    await user.click(successButton)
    await user.click(successButton)

    // Should show all toasts
    const toasts = screen.getAllByText('Success message')
    expect(toasts).toHaveLength(3)
  })
})