import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Navegação estrutural"
      className={`flex items-center gap-1 text-sm text-gray-500 flex-wrap ${className}`}
    >
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-[#CC1020] transition-colors font-medium"
      >
        <Home className="h-3.5 w-3.5" />
        <span>Home</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-[#CC1020] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-[#1A1A1A] font-semibold">{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
