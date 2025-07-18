import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

// Example unit test
describe('HomePage', () => {
  it('renders the main heading', () => {
    render(<HomePage />);
    
    const heading = screen.getByRole('heading', {
      name: /claude code web ui/i,
    });
    
    expect(heading).toBeInTheDocument();
  });

  it('renders the start chatting button', () => {
    render(<HomePage />);
    
    const button = screen.getByRole('link', {
      name: /start chatting/i,
    });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', '/chat');
  });

  it('renders feature cards', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Real-time Chat')).toBeInTheDocument();
    expect(screen.getByText('Session Management')).toBeInTheDocument();
    expect(screen.getByText('MCP Integration')).toBeInTheDocument();
  });
});