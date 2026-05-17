import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
}

interface MobileNavProps {
  items: NavItem[];
}

export default function MobileNav({ items }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="md:hidden relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-background shadow-lg overflow-hidden z-50">
          <nav className="flex flex-col">
            {items.map(item => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
