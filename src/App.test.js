import { render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <>{children}</>,
  Routes: ({ children }) => <>{children}</>,
  Route: ({ element }) => element,
}), { virtual: true });

jest.mock('./Notepad', () => () => <h1>Online Notepad</h1>);

import App from './App';

test('renders Online Notepad heading', () => {
  render(<App />);
  const headingElements = screen.getAllByText(/online notepad/i);
  expect(headingElements.length).toBeGreaterThan(0);
});
