export function FormField({
  name,
  label,
  defaultValue,
  maxLength,
}: {
  name: string;
  label: string;
  defaultValue: string;
  maxLength: number;
}) {
  return (
    <tr>
      <th>
        <label htmlFor={name}>{label}</label>
      </th>
      <td>
        <input
          id={name}
          name={name}
          type="text"
          defaultValue={defaultValue}
          maxLength={maxLength}
          required
          data-testid={`input-${name}`}
        />
      </td>
    </tr>
  );
}
