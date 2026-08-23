export const inputCls =
  'border border-slate-200 rounded-lg px-3.5 py-2.5 text-[13.5px] text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#D8B155]/40 focus:border-[#D8B155]/60 transition-shadow';

export const selectCls =
  'border border-slate-200 rounded-lg px-3.5 py-2.5 text-[13.5px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#D8B155]/40 focus:border-[#D8B155]/60 transition-shadow';

export const primaryBtnCls =
  'bg-gradient-to-br from-[#D8B155] to-[#B4872E] text-[#0B1220] rounded-lg px-4 py-2.5 text-[13.5px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none';

export const secondaryBtnCls =
  'bg-slate-100 text-slate-700 rounded-lg px-4 py-2.5 text-[13.5px] font-medium hover:bg-slate-200 transition-colors';

export const dangerTextBtnCls =
  'text-[12.5px] font-medium text-red-600 hover:text-red-700 transition-colors';

export const linkBtnCls =
  'text-[12.5px] font-medium text-[#B4872E] hover:text-[#96701F] transition-colors';

export const cardCls = 'bg-white rounded-2xl border border-slate-200/70';

export const pillCls = 'text-[11px] px-2.5 py-1 rounded-full font-medium';

export function initialsFor(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}
