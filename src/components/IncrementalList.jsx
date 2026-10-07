import React, { useMemo, useState } from 'react';

// Keep all results available, mounting another group only when requested.
export default function IncrementalList({ items, label, children, className = '', requiredItemId = '', keepInputFocus = false }) {
    const [count, setCount] = useState(30);
    const requiredCount = useMemo(() => {
        if (!requiredItemId) return 0;
        const index = items.findIndex(item => String(item.id) === String(requiredItemId));
        return index < 0 ? 0 : Math.ceil((index + 1) / 30) * 30;
    }, [items, requiredItemId]);
    const visible = useMemo(() => items.slice(0, Math.max(count, requiredCount)), [items, count, requiredCount]);

    return <div className={className}>
        {children(visible)}
        {items.length > 0 && <div className="py-3 text-center space-y-2">
            <p className="text-[11px] font-semibold text-slate-500" role="status">Mostrando {visible.length} de {items.length} {label}</p>
            {visible.length < items.length && <button type="button" onMouseDown={event => { if (keepInputFocus) event.preventDefault(); }} onClick={() => setCount(Math.max(count, requiredCount) + 30)} className="px-5 py-3 rounded-xl border border-[#7657FF]/15 bg-white text-[#7657FF] text-xs font-bold shadow-sm active:scale-[.98]">Mostrar más {label}</button>}
        </div>}
    </div>;
}
