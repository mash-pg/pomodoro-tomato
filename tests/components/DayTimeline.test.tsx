import React from 'react';
import { render, screen } from '@testing-library/react';
import DayTimeline from '@/components/DayTimeline';

describe('DayTimeline', () => {
  it('should render hour markers', () => {
    render(<DayTimeline sessions={[]} />);
    
    // 時間マーカーが表示されているかを確認
    expect(screen.getAllByText('0h').length).toBe(2);
    expect(screen.getAllByText('6h').length).toBe(2);
    expect(screen.getAllByText('12h').length).toBe(2);
    expect(screen.getAllByText('18h').length).toBe(2);
    expect(screen.getAllByText('24h').length).toBe(2);
  });

  it('should render session blocks correctly', () => {
    const mockSessions = [
      { created_at: '2023-01-01T08:00:00Z', duration_minutes: 60 },
      { created_at: '2023-01-01T14:30:00Z', duration_minutes: 30 },
    ];

    const { container } = render(<DayTimeline sessions={mockSessions} />);
    
    // セッションを表すブロックが2つ存在するかを確認
    const sessionBlocks = container.querySelectorAll('.bg-blue-500');
    expect(sessionBlocks.length).toBe(4);
  });
});
