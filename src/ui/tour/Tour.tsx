import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n/I18n";
import { dialogKeys } from "../shared/dialogKeys";
import "./tour.css";

const STOPS = [
  { id: "wall", target: ".stage" },
  { id: "narration", target: ".narration" },
  { id: "rail", target: ".rail" },
  { id: "player", target: ".player" },
  { id: "header", target: ".app__header" },
] as const;

const CARD_WIDTH = 380;
const GAP = 16;
const MARGIN = 12;

interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Puts the card beside the highlighted box where it fits, then below or above it, always inside the window. */
function cardPosition(box: Box, cardHeight: number): { left: number; top: number } {
  const room = { width: window.innerWidth, height: window.innerHeight };
  const clampTop = (top: number): number =>
    Math.min(Math.max(MARGIN, top), room.height - cardHeight - MARGIN);
  const clampLeft = (left: number): number =>
    Math.min(Math.max(MARGIN, left), room.width - CARD_WIDTH - MARGIN);
  if (box.left + box.width + GAP + CARD_WIDTH + MARGIN <= room.width) {
    return { left: box.left + box.width + GAP, top: clampTop(box.top) };
  }
  if (box.left - GAP - CARD_WIDTH >= MARGIN) {
    return { left: box.left - GAP - CARD_WIDTH, top: clampTop(box.top) };
  }
  const below = box.top + box.height + GAP;
  if (below + cardHeight + MARGIN <= room.height) return { left: clampLeft(box.left), top: below };
  return { left: clampLeft(box.left), top: clampTop(box.top - GAP - cardHeight) };
}

function measure(selector: string): Box | null {
  const element = document.querySelector(selector);
  if (element === null) return null;
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left, top, width, height };
}

/** A guided look at each part of the course: it dims the page around one part and explains it on an index card. */
export function Tour({ onClose }: { readonly onClose: () => void }): ReactNode {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [cardHeight, setCardHeight] = useState(240);
  const card = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const stop = STOPS[index] ?? STOPS[0];
  const last = index === STOPS.length - 1;

  useLayoutEffect(() => {
    const update = (): void => {
      setBox(measure(stop.target));
      if (card.current !== null) setCardHeight(card.current.offsetHeight);
    };
    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
    };
  }, [stop.target]);

  useEffect(() => {
    primary.current?.focus();
  }, [index]);

  const onKeyDown = dialogKeys(onClose);

  const position = box === null ? null : cardPosition(box, cardHeight);

  return (
    <div className="tour">
      <div
        className="tour__spotlight"
        style={
          box === null
            ? { left: "50%", top: "50%", width: 0, height: 0 }
            : {
                left: box.left - 6,
                top: box.top - 6,
                width: box.width + 12,
                height: box.height + 12,
              }
        }
      />
      <div
        ref={card}
        className="tour__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        onKeyDown={onKeyDown}
        style={
          position === null
            ? { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: CARD_WIDTH }
            : { ...position, width: CARD_WIDTH }
        }
      >
        <p className="tour__count">
          {t("ui.tour.count", { current: index + 1, total: STOPS.length })}
        </p>
        <h2 id="tour-title" className="tour__title">
          {t(`ui.tour.${stop.id}.title`)}
        </h2>
        <p id="tour-body" className="tour__body">
          {t(`ui.tour.${stop.id}.body`)}
        </p>
        <div className="tour__actions">
          <button className="tour__skip" onClick={onClose}>
            {t("ui.tour.skip")}
          </button>
          <span className="tour__spacer" />
          {index > 0 && (
            <button
              className="tour__back"
              onClick={() => {
                setIndex(index - 1);
              }}
            >
              ← {t("ui.tour.back")}
            </button>
          )}
          <button
            ref={primary}
            className="tour__next"
            onClick={() => {
              if (last) onClose();
              else setIndex(index + 1);
            }}
          >
            {last ? t("ui.tour.done") : `${t("ui.tour.next")} →`}
          </button>
        </div>
      </div>
    </div>
  );
}
