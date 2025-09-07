import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AnalysisProgress from '../AnalysisProgress';
import { AnalysisProgress as AnalysisProgressType } from '../../types/dashboard';

// Mock data for the progress prop
const mockProgress: AnalysisProgressType = {
    overall_progress: 50,
    current_stage: 'technical',
    estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
    stages: {
        fundamental: {
            status: 'completed',
            progress: 100,
            message: 'Financial analysis completed',
            started_at: new Date(Date.now() - 60000).toISOString(),
            completed_at: new Date().toISOString()
        },
        technical: {
            status: 'running',
            progress: 50,
            message: 'Processing price trends...',
            started_at: new Date().toISOString()
        },
        esg: {
            status: 'pending',
            progress: 0,
            message: 'Waiting to start'
        },
        synthesis: {
            status: 'pending',
            progress: 0,
            message: 'Waiting to start'
        }
    }
};

describe('AnalysisProgress Component', () => {
    const mockOnCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the current stage and overall progress', () => {
        render(<AnalysisProgress progress={mockProgress} onCancel={mockOnCancel} />);

        expect(screen.getByRole('heading', { name: /Analyzing technical/i })).toBeInTheDocument();
        expect(screen.getByRole('progressbar', { name: /Overall progress: 50%/i })).toHaveAttribute('aria-valuenow', '50');

        // Check that overall progress percentage is displayed in the overall progress section
        const overallProgressSection = screen.getByRole('progressbar', { name: /Overall progress: 50%/i }).parentElement?.parentElement;
        expect(overallProgressSection).toHaveTextContent('50%');
    });

    it('should render all individual stages with their correct statuses', () => {
        render(<AnalysisProgress progress={mockProgress} onCancel={mockOnCancel} />);

        // Check Fundamental stage (Completed)
        const fundamentalStage = screen.getByRole('article', { name: /fundamental analysis stage/i });
        expect(fundamentalStage).toBeInTheDocument();
        expect(fundamentalStage).toHaveTextContent('Completed');
        expect(screen.getByRole('progressbar', { name: /fundamental progress: 100%/i })).toHaveAttribute('aria-valuenow', '100');
        expect(screen.getByText('✅')).toBeInTheDocument();

        // Check Technical stage (Running)
        const technicalStage = screen.getByRole('article', { name: /technical analysis stage/i });
        expect(technicalStage).toBeInTheDocument();
        expect(technicalStage).toHaveTextContent('In Progress');
        expect(screen.getByRole('progressbar', { name: /technical progress: 50%/i })).toHaveAttribute('aria-valuenow', '50');
        expect(screen.getByText('⏳')).toBeInTheDocument();

        // Check ESG stage (Pending)
        const esgStage = screen.getByRole('article', { name: /esg analysis stage/i });
        expect(esgStage).toBeInTheDocument();
        expect(esgStage).toHaveTextContent('Pending');
        expect(screen.getByRole('progressbar', { name: /esg progress: 0%/i })).toHaveAttribute('aria-valuenow', '0');

        // Check Synthesis stage (Pending)
        const synthesisStage = screen.getByRole('article', { name: /synthesis analysis stage/i });
        expect(synthesisStage).toBeInTheDocument();
        expect(synthesisStage).toHaveTextContent('Pending');
        expect(screen.getByRole('progressbar', { name: /synthesis progress: 0%/i })).toHaveAttribute('aria-valuenow', '0');

        // Check that there are exactly 2 pending icons
        const pendingIcons = screen.getAllByText('⏸️');
        expect(pendingIcons).toHaveLength(2);
    });

    it('should call onCancel when the cancel button is clicked', async () => {
        const user = userEvent.setup();
        render(<AnalysisProgress progress={mockProgress} onCancel={mockOnCancel} />);

        const cancelButton = screen.getByRole('button', { name: /cancel analysis/i });
        await user.click(cancelButton);

        expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should display estimated time remaining', () => {
        // Note: Relies on fake timers to be predictable, but for this check, we just see if it renders.
        render(<AnalysisProgress progress={mockProgress} onCancel={mockOnCancel} />);
        expect(screen.getByText(/estimated time remaining/i)).toBeInTheDocument();
    });

    it('should render a failed stage correctly', () => {
        const failedProgress: AnalysisProgressType = {
            ...mockProgress,
            stages: {
                ...mockProgress.stages,
                technical: {
                    status: 'failed',
                    progress: 40,
                    message: 'API limit reached',
                    started_at: new Date().toISOString()
                }
            }
        };
        render(<AnalysisProgress progress={failedProgress} onCancel={mockOnCancel} />);

        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByText('API limit reached')).toBeInTheDocument();
        expect(screen.getByText('❌')).toBeInTheDocument();
    });
});