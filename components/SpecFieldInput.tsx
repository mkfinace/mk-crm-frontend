import { inputCls, selectCls } from '@/components/adminStyles';

export type FieldVal = { valueText?: string; valueNumber?: number; valueBoolean?: boolean; applicability: string };

export function SpecFieldInput({
  field, value, onChange,
}: { field: any; value: FieldVal; onChange: (v: FieldVal) => void }) {
  const t = field.dataType;

  if (t === 'BOOLEAN') {
    return (
      <select className={`${selectCls} text-[12px] py-1.5`} value={value.valueBoolean === undefined ? '' : String(value.valueBoolean)} onChange={(e) => onChange({ ...value, valueBoolean: e.target.value === 'true' })}>
        <option value="">—</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (t === 'SELECT') {
    return (
      <select className={`${selectCls} text-[12px] py-1.5`} value={value.valueText || ''} onChange={(e) => onChange({ ...value, valueText: e.target.value })}>
        <option value="">—</option>
        {field.options?.map((o: any) => <option key={o.id} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (t === 'MULTI_SELECT') {
    const selected = (value.valueText || '').split(',').filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1">
        {field.options?.map((o: any) => {
          const checked = selected.includes(o.value);
          return (
            <label key={o.id} className={`text-[10.5px] px-2 py-0.5 rounded-full border cursor-pointer select-none ${checked ? 'bg-[#FBF3E1] border-[#D8B155]/50 text-[#96701F]' : 'bg-white border-slate-200 text-slate-600'}`}>
              <input
                type="checkbox"
                className="hidden"
                checked={checked}
                onChange={() => {
                  const next = checked ? selected.filter((s) => s !== o.value) : [...selected, o.value];
                  onChange({ ...value, valueText: next.join(',') });
                }}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    );
  }
  if (['INTEGER', 'NUMBER', 'DECIMAL', 'CURRENCY', 'PERCENTAGE', 'VALUE_UNIT'].includes(t)) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          className={`${inputCls} text-[12px] py-1.5 flex-1`}
          value={value.valueNumber ?? ''}
          onChange={(e) => onChange({ ...value, valueNumber: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
        {field.unit && <span className="text-[11px] text-slate-400 shrink-0">{field.unit}</span>}
      </div>
    );
  }
  if (t === 'DATE') {
    return <input type="date" className={`${inputCls} text-[12px] py-1.5`} value={value.valueText || ''} onChange={(e) => onChange({ ...value, valueText: e.target.value })} />;
  }
  return <input className={`${inputCls} text-[12px] py-1.5`} value={value.valueText || ''} onChange={(e) => onChange({ ...value, valueText: e.target.value })} />;
}

export function formatSpecValue(field: any, v?: FieldVal): string {
  if (!v) return '—';
  if (v.valueBoolean !== undefined) return v.valueBoolean ? 'Yes' : 'No';
  if (v.valueNumber !== undefined) return `${v.valueNumber}${field.unit ? ' ' + field.unit : ''}`;
  if (v.valueText !== undefined) {
    if (field.dataType === 'SELECT' || field.dataType === 'MULTI_SELECT') {
      const vals = v.valueText.split(',').filter(Boolean);
      const labels = vals.map((val) => field.options?.find((o: any) => o.value === val)?.label || val);
      return labels.join(', ');
    }
    return v.valueText;
  }
  return '—';
}
