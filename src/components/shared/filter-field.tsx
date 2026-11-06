"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Value of the "no filter" item. */
export const ALL = "all";

export type FilterItem = { value: string; label: string };

type FilterFieldProps = {
  label: string;
  items: FilterItem[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
};

/** A labelled select for list filters; `undefined` means "no filter". */
export function FilterField({
  label,
  items,
  value,
  onChange,
}: FilterFieldProps) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm">
      <span>{label}</span>
      <Select
        items={items}
        value={value ?? ALL}
        onValueChange={(v) => onChange(v === ALL ? undefined : String(v))}
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue />
        </SelectTrigger>
        {/* Opens below the trigger at full height, so the list never scrolls. */}
        <SelectContent
          alignItemWithTrigger={false}
          align="start"
          className="max-h-none overflow-y-visible"
        >
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
