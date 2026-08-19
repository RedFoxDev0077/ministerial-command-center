import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../select';

/**
 * Regression cover for the crash on the signup page:
 *   NotFoundError: Failed to execute 'removeChild' on 'Node'
 *
 * It happened when SelectContent rendered a raw <div> for the empty state.
 * Radix does not track non-primitives in its item collection, so unmounting the
 * popover left React removing a node that was no longer its child.
 */
function DepartmentPicker({ items }: { items: Array<{ id: string; name: string }> }) {
  return (
    <Select>
      <SelectTrigger aria-label="Departamento">
        <SelectValue placeholder="Seleccionar departamento" />
      </SelectTrigger>
      <SelectContent>
        {items.length > 0 ? (
          items.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))
        ) : (
          <SelectGroup>
            <SelectLabel>No hay departamentos disponibles</SelectLabel>
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}

describe('Select empty state', () => {
  it('opens and closes with an empty list without throwing', async () => {
    const user = userEvent.setup();
    const errors: unknown[] = [];
    window.addEventListener('error', (e) => errors.push(e.error));

    render(<DepartmentPicker items={[]} />);

    await user.click(screen.getByLabelText('Departamento'));
    expect(await screen.findByText('No hay departamentos disponibles')).toBeInTheDocument();

    // Closing unmounts the popover — this is where removeChild used to throw.
    await user.keyboard('{Escape}');
    expect(errors).toHaveLength(0);
  });

  it('selects an option when the list is populated', async () => {
    const user = userEvent.setup();
    render(
      <DepartmentPicker
        items={[
          { id: 'd1', name: 'Presidencia de la República' },
          { id: 'd2', name: 'Ministerio de Transportes' },
        ]}
      />,
    );

    await user.click(screen.getByLabelText('Departamento'));
    await user.click(await screen.findByText('Ministerio de Transportes'));
    expect(screen.getByLabelText('Departamento')).toHaveTextContent('Ministerio de Transportes');
  });

  it('rejects an empty string as an item value', () => {
    // Radix reserves '' for clearing a selection and throws on it. This is the
    // second bug found in CreateFromTemplateDialog.
    expect(() =>
      render(
        <Select>
          <SelectTrigger aria-label="x" />
          <SelectContent>
            <SelectItem value="">Ninguna</SelectItem>
          </SelectContent>
        </Select>,
      ),
    ).toThrow();
  });
});
