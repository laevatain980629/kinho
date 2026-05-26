import { useEffect, useState } from 'react';
import { Select, ListBox, ListBoxItem, Button } from '@heroui/react';
import { getOutlets } from '@/services/outlet';
import { getUsers } from '@/services/user';

/** Filters for report views. Defined locally until report.ts is available. */
interface ReportFilters {
  dateRange?: '7d' | '30d' | '3m' | 'custom';
  dateStart?: string;
  dateEnd?: string;
  outlet?: string;
  engineer?: string;
  status?: string;
}

interface Props {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  showOutlet?: boolean;
  showEngineer?: boolean;
  showStatus?: boolean;
  statusOptions?: { label: string; value: string }[];
}

const DATE_RANGE_OPTIONS = [
  { key: '7d', label: '近7天' },
  { key: '30d', label: '近30天' },
  { key: '3m', label: '近3月' },
  { key: 'custom', label: '自定义' },
] as const;

function FilterSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { key: string; label: string }[];
  onChange: (key: string) => void;
}) {
  const selectedLabel = options.find((o) => o.key === value)?.label;
  return (
    <Select selectedKey={value} onSelectionChange={(key) => onChange(key as string)}>
      <Select.Trigger className="w-32">
        <Select.Value>{selectedLabel ?? '请选择'}</Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((opt) => (
            <ListBoxItem key={opt.key} id={opt.key}>
              {opt.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export default function ReportFilters({
  filters,
  onChange,
  showOutlet = true,
  showEngineer = true,
  showStatus = false,
  statusOptions = [],
}: Props) {
  const [outletOptions, setOutletOptions] = useState([{ key: '', label: '全部网点' }]);
  const [engineerOptions, setEngineerOptions] = useState([{ key: '', label: '全部工程师' }]);

  useEffect(() => {
    if (!showOutlet) return;
    getOutlets({ page: 1, pageSize: 100 })
      .then((res) => {
        setOutletOptions([
          { key: '', label: '全部网点' },
          ...res.list.map((outlet) => ({ key: outlet.name, label: outlet.name })),
        ]);
      })
      .catch(() => setOutletOptions([{ key: '', label: '全部网点' }]));
  }, [showOutlet]);

  useEffect(() => {
    if (!showEngineer) return;
    getUsers({ role: 'engineer', status: 'ACTIVE', page: 1, pageSize: 100 })
      .then((res) => {
        setEngineerOptions([
          { key: '', label: '全部工程师' },
          ...res.list.map((user) => ({ key: user.name, label: user.name })),
        ]);
      })
      .catch(() => setEngineerOptions([{ key: '', label: '全部工程师' }]));
  }, [showEngineer]);

  const update = (patch: Partial<ReportFilters>) =>
    onChange({ ...filters, ...patch });

  const statusItems = [
    { key: '', label: '全部状态' },
    ...statusOptions.map((o) => ({ key: o.value, label: o.label })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[var(--surface)] p-3 border border-[var(--border)]">
      <FilterSelect
        value={filters.dateRange ?? '30d'}
        options={[...DATE_RANGE_OPTIONS]}
        onChange={(key) => update({ dateRange: key as ReportFilters['dateRange'] })}
      />

      {filters.dateRange === 'custom' && (
        <>
          <input
            type="date"
            value={filters.dateStart ?? ''}
            onChange={(e) => update({ dateStart: e.target.value })}
            className="rounded border border-[var(--border)] bg-[var(--field-background)] px-2 py-1 text-sm"
          />
          <input
            type="date"
            value={filters.dateEnd ?? ''}
            onChange={(e) => update({ dateEnd: e.target.value })}
            className="rounded border border-[var(--border)] bg-[var(--field-background)] px-2 py-1 text-sm"
          />
        </>
      )}

      {showOutlet && (
        <FilterSelect
          value={filters.outlet ?? ''}
          options={outletOptions}
          onChange={(key) => update({ outlet: key })}
        />
      )}

      {showEngineer && (
        <FilterSelect
          value={filters.engineer ?? ''}
          options={engineerOptions}
          onChange={(key) => update({ engineer: key })}
        />
      )}

      {showStatus && statusItems.length > 0 && (
        <FilterSelect
          value={filters.status ?? ''}
          options={statusItems}
          onChange={(key) => update({ status: key })}
        />
      )}

      <Button size="sm" variant="ghost" onPress={() => onChange({ dateRange: '30d' })}>
        重置
      </Button>
    </div>
  );
}
