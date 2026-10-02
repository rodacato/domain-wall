import type { ReactNode } from "react";
import { NOTE_KINDS, type NoteKind } from "../../domain/wall/Note";
import { useI18n } from "../i18n/I18n";

interface WallLegendProps {
  readonly kindsOnWall: ReadonlySet<NoteKind>;
}

export function WallLegend({ kindsOnWall }: WallLegendProps): ReactNode {
  const { t } = useI18n();
  const visible = NOTE_KINDS.filter((kind) => kindsOnWall.has(kind));
  if (visible.length === 0) return null;
  return (
    <div className="legend">
      {visible.map((kind) => (
        <span className="legend__item" key={kind}>
          <span
            className="legend__swatch"
            style={{ "--swatch": `var(--note-${kind})` } as React.CSSProperties}
          />
          {t(`ui.legend.${kind}`)}
        </span>
      ))}
    </div>
  );
}
