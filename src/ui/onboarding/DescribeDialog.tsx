import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { GenerationServices } from "../../application/generationServices";
import type { GeneratedPack } from "../../application/packLibrary";
import { GenerateBusiness } from "../generation/GenerateBusiness";
import { useI18n } from "../i18n/I18n";
import { dialogKeys } from "../shared/dialogKeys";

interface DescribeDialogProps {
  readonly services: GenerationServices;
  readonly onReady: (entry: GeneratedPack) => void;
  readonly onClose: () => void;
}

/** Generating a business, on a card over the cover so the choices stay where they were. */
export function DescribeDialog({ services, onReady, onClose }: DescribeDialogProps): ReactNode {
  const { t } = useI18n();
  const card = useRef<HTMLElement>(null);

  useEffect(() => {
    (card.current?.querySelector("textarea") ?? card.current?.querySelector("button"))?.focus();
  }, []);

  return createPortal(
    <div
      className="describe"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={card}
        className="describe__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="describe-title"
        onKeyDown={dialogKeys(onClose)}
      >
        <header className="describe__header">
          <h2 id="describe-title">{t("ui.onboarding.industry.describe")}</h2>
          <button className="describe__close" aria-label={t("ui.generate.close")} onClick={onClose}>
            ×
          </button>
        </header>
        <p className="describe__hint">{t("ui.onboarding.industry.describeHint")}</p>
        <GenerateBusiness services={services} onReady={onReady} />
      </section>
    </div>,
    document.body,
  );
}
