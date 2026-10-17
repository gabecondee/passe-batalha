import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { RankingAvatar } from './RankingAvatar';

afterEach(cleanup);
it('shows a fallback after failure and loads a newly saved URL', () => {
  const { rerender } = render(<RankingAvatar src="https://example.com/old.png" name="Ana" />);
  fireEvent.error(screen.getByRole('img', { name: 'Ana' }));
  expect(screen.getByRole('img', { name: 'Foto indisponível de Ana' })).toBeInTheDocument();
  rerender(<RankingAvatar src="https://example.com/new.webp" name="Ana" />);
  expect(screen.getByRole('img', { name: 'Ana' })).toHaveAttribute('src', 'https://example.com/new.webp');
});
it('handles profiles with no avatar', () => {
  render(<RankingAvatar src={null} name="Ana" />);
  expect(screen.getByRole('img', { name: 'Foto indisponível de Ana' })).toBeInTheDocument();
});
