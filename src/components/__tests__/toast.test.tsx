// Migrated to Vitest
import { render, screen, act } from '@testing-library/react'
import { vi } from 'vitest'
import { ToastProvider, useToast } from '../toast'

// Test component that uses toast
function TestComponent() {
  const { showToast } = useToast()

  return (
    <div>
      <button onClick={() => showToast('success', 'Success message', 0)}>
        Show Success
      </button>
      <button onClick={() => showToast('success', 'Auto-hide message', 5000)}>
        Show Auto-hide
      </button>
      <button onClick={() => showToast('error', 'Error message', 0)}>
        Show Error
      </button>
      <button onClick={() => showToast('warning', 'Warning message', 0)}>
        Show Warning
      </button>
      <button onClick={() => showToast('info', 'Info message', 0)}>
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
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
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
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useToast must be used within a ToastProvider')

    consoleSpy.mockRestore()
  })

  it('should show success toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByText('Show Success')
    
    act(() => {
      successButton.click()
    })

    expect(screen.getByText('Success message')).toBeInTheDocument()
    expect(screen.getByText('✅')).toBeInTheDocument()
  })

  it('should show error toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const errorButton = screen.getByText('Show Error')
    
    act(() => {
      errorButton.click()
    })

    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.getByText('❌')).toBeInTheDocument()
  })

  it('should show warning toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const warningButton = screen.getByText('Show Warning')
    
    act(() => {
      warningButton.click()
    })

    expect(screen.getByText('Warning message')).toBeInTheDocument()
    expect(screen.getByText('⚠️')).toBeInTheDocument()
  })

  it('should show info toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const infoButton = screen.getByText('Show Info')
    
    act(() => {
      infoButton.click()
    })

    expect(screen.getByText('Info message')).toBeInTheDocument()
    expect(screen.getByText('ℹ️')).toBeInTheDocument()
  })

  it('should auto-hide toast after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const autoHideButton = screen.getByText('Show Auto-hide')
    
    act(() => {
      autoHideButton.click()
    })

    // Advance timers to trigger the animation setTimeout
    act(() => {
      vi.advanceTimersByTime(20)
    })

    expect(screen.getByText('Auto-hide message')).toBeInTheDocument()

    // Fast-forward time to trigger auto-hide
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // No need for waitFor with fake timers - the change should be immediate
    expect(screen.queryByText('Auto-hide message')).not.toBeInTheDocument()
  })

  it('should not auto-hide persistent toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const persistentButton = screen.getByText('Show Persistent')
    
    act(() => {
      persistentButton.click()
    })

    // Advance timers to trigger the animation setTimeout
    act(() => {
      vi.advanceTimersByTime(20)
    })

    expect(screen.getByText('Persistent message')).toBeInTheDocument()

    // Fast-forward time - persistent toast should not auto-hide
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // Should still be visible
    expect(screen.getByText('Persistent message')).toBeInTheDocument()
  })

  it('should close toast when close button is clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByText('Show Success')
    
    act(() => {
      successButton.click()
    })

    // Advance timers to trigger the animation setTimeout
    act(() => {
      vi.advanceTimersByTime(20)
    })

    expect(screen.getByText('Success message')).toBeInTheDocument()

    const closeButton = screen.getByText('×')
    
    act(() => {
      closeButton.click()
    })

    // Advance timers to trigger the close animation setTimeout
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // No need for waitFor with fake timers - the change should be immediate
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('should close toast when clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByText('Show Success')
    
    act(() => {
      successButton.click()
    })

    // Advance timers to trigger the animation setTimeout
    act(() => {
      vi.advanceTimersByTime(20)
    })

    const toast = screen.getByText('Success message').closest('.toast')
    expect(toast).toBeInTheDocument()

    act(() => {
      (toast as HTMLElement).click()
    })

    // Advance timers to trigger the close animation setTimeout
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // No need for waitFor with fake timers - the change should be immediate
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('should show multiple toasts', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByText('Show Success')
    const errorButton = screen.getByText('Show Error')

    act(() => {
      successButton.click()
      errorButton.click()
    })

    // Advance timers to trigger the animation setTimeout for both toasts
    act(() => {
      vi.advanceTimersByTime(20)
    })

    expect(screen.getByText('Success message')).toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('should have proper styling for different toast types', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    // Test success toast styling
    const successButton = screen.getByText('Show Success')
    
    act(() => {
      successButton.click()
    })

    // Advance timers to trigger the animation setTimeout
    act(() => {
      vi.advanceTimersByTime(20)
    })

    const successToast = screen.getByText('Success message').closest('.toast-success')
    expect(successToast).toBeInTheDocument()

    // Test error toast styling
    const errorButton = screen.getByText('Show Error')
    
    act(() => {
      errorButton.click()
    })

    // Advance timers to trigger the animation setTimeout
    act(() => {
      vi.advanceTimersByTime(20)
    })

    const errorToast = screen.getByText('Error message').closest('.toast-error')
    expect(errorToast).toBeInTheDocument()
  })

  it('should handle rapid toast creation', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByText('Show Success')

    // Create multiple toasts rapidly
    act(() => {
      successButton.click()
      successButton.click()
      successButton.click()
    })

    // Advance timers to trigger the animation setTimeout for all toasts
    act(() => {
      vi.advanceTimersByTime(20)
    })

    // Should show all toasts
    const toasts = screen.getAllByText('Success message')
    expect(toasts).toHaveLength(3)
  })
})