import { useEffect, useState } from 'react';

function pick(obj, fields) {
  const out = {};
  for (const f of fields) out[f] = obj[f];
  return out;
}

/**
 * Local editable copy of a slice of the settings doc, for one Settings tab.
 * Re-syncs from the canonical doc only when it changes underneath (a fresh
 * load or another tab's save) — never mid-edit, so typing in one field never
 * gets clobbered by an unrelated re-render.
 */
export function useSettingsDraft(settings, fields) {
  const [draft, setDraft] = useState(() => pick(settings, fields));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(pick(settings, fields));
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const setField = (key) => (value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  return { draft, setField, setDraft, dirty, setDirty };
}
