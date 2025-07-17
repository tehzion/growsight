import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';

// Re-export everything from testing library
export * from '@testing-library/react';

// Custom render function that includes providers if needed
function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return rtlRender(ui, options);
}

// Re-export userEvent for better interaction testing
export { userEvent };

// Export the custom render function
export { render }; 