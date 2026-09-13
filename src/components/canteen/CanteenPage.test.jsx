import { render, screen, fireEvent } from '@testing-library/react';
import CanteenPage from './CanteenPage.jsx';
import { MemoryRouter } from 'react-router-dom';

// Mock the navigation hook
const navigateMock = jest.fn();
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    useNavigate: () => navigateMock,
  };
});

// Mock the modal component to avoid rendering the full modal UI
jest.mock('./CanteenModal.jsx', () => () => <div data-testid="mock-modal">CanteenModal</div>);

describe('CanteenPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  test('renders heading and back button', () => {
    render(
      <MemoryRouter>
        <CanteenPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /college canteen/i })).toBeInTheDocument();
    const backButton = screen.getByRole('button', { name: /back to home/i });
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveClass('btn-small');
  });

  test('clicking back button navigates home', () => {
    render(
      <MemoryRouter>
        <CanteenPage />
      </MemoryRouter>
    );
    const backButton = screen.getByRole('button', { name: /back to home/i });
    fireEvent.click(backButton);
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  test('modal renders', () => {
    render(
      <MemoryRouter>
        <CanteenPage />
      </MemoryRouter>
    );
    const modal = screen.getByTestId('mock-modal');
    expect(modal).toBeInTheDocument();
  });
});
