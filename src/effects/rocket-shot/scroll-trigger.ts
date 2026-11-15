const readingTime = 5000;

export function shotDeadline(previous: number | undefined, time: number, visible: boolean) {
  return visible ? previous ?? time + readingTime : undefined;
}
