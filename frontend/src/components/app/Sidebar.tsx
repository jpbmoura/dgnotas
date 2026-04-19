import { useEffect } from 'react';

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={`md:hidden fixed inset-0 z-20 bg-[var(--ink)]/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        aria-label="Navegação lateral"
        className={`fixed top-16 bottom-0 left-0 z-30 w-60
                    bg-[var(--bg-card)] border-r border-[var(--line)]
                    overflow-y-auto
                    transition-transform duration-200
                    ${open ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0`}
      />
    </>
  );
}
