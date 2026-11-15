type Sample = {
  time: number;
  scroll: number;
  top: number;
};

type ReadingPause = { since: number; scroll: number };

export type ReadingScroll = Sample & { reading?: ReadingPause; atEdgeSince?: number; fire: boolean };

const readingTime = 2000;
const readingDrift = 16;
const edgeTime = 180;
const maxScrollStep = 160;

export function readScroll(previous: ReadingScroll | undefined, sample: Sample,
  visibleRatio: number, readingHeight: number): ReadingScroll {
  const delta = previous ? sample.scroll - previous.scroll : 0;
  const inBand = sample.top >= -64 && sample.top <= readingHeight / 3 && visibleRatio >= .5;
  const jump = Math.abs(delta) > maxScrollStep;
  let reading = jump ? undefined : previous?.reading;
  // Check the pause before counting movement from the scroll step that ends it.
  const ready = reading !== undefined && sample.time - reading.since >= readingTime;
  const atEdgeSince = inBand && ready && delta >= 0
    ? (delta > 0 ? sample.time : previous?.atEdgeSince)
    : undefined;

  if (visibleRatio < .8) {
    if (!inBand || !ready) reading = undefined;
  } else if (!reading || (!ready && Math.abs(sample.scroll - reading.scroll) > readingDrift)) {
    reading = { since: sample.time, scroll: sample.scroll };
  }

  return {
    ...sample,
    reading,
    atEdgeSince,
    fire: atEdgeSince !== undefined && sample.time - atEdgeSince >= edgeTime,
  };
}
