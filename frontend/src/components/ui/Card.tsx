interface Props {
  title: string;
  icon?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

// Shared card chrome matching the Stitch mockups' section cards (icon +
// title header, white surface, rounded corners). Every panel on the chart
// details page renders its own content only; this supplies the wrapper so
// each panel doesn't repeat the same header markup.
export function Card({ title, icon, action, children }: Props) {
  return (
    <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
      <div className="flex items-center justify-between mb-space-sm gap-space-xs">
        <div className="flex items-center gap-space-2xs min-w-0">
          {icon && <span className="material-symbols-outlined text-primary text-[20px] flex-shrink-0">{icon}</span>}
          <h3 className="font-title-md text-title-md text-primary truncate">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
