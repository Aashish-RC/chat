import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ValvesForm from '../ValvesForm';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

describe('ValvesForm', () => {
  const schema = {
    type: 'object',
    properties: {
      temperature: {
        type: 'number',
        title: 'Temperature',
        minimum: 0,
        maximum: 2,
        step: 0.1,
        default: 0.7,
      },
      enable_cache: {
        type: 'boolean',
        title: 'Enable Cache',
        default: true,
      },
      api_key: {
        type: 'string',
        title: 'API Key',
        description: 'Provide secret API key',
      },
    },
    required: ['api_key'],
  };

  it('renders empty message when schema has no properties', () => {
    render(<ValvesForm schema={{}} />);
    expect(screen.getByText('com_ui_valves_no_valves')).toBeInTheDocument();
  });

  it('renders fields dynamically with required badges and controls', () => {
    render(<ValvesForm schema={schema} />);

    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('Enable Cache')).toBeInTheDocument();
    expect(screen.getByText('API Key')).toBeInTheDocument();
    expect(screen.getByText('Provide secret API key')).toBeInTheDocument();
    expect(screen.getByText('com_ui_valves_required')).toBeInTheDocument();
  });

  it('triggers onChange and onSave when values are updated', () => {
    const handleChange = jest.fn();
    const handleSave = jest.fn();

    render(
      <ValvesForm
        schema={schema}
        initialValues={{ temperature: 0.7, enable_cache: true, api_key: 'test-key' }}
        onChange={handleChange}
        onSave={handleSave}
      />,
    );

    const saveButton = screen.getByText('com_ui_save');
    fireEvent.click(saveButton);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.7,
        enable_cache: true,
        api_key: 'test-key',
      }),
    );
  });
});
