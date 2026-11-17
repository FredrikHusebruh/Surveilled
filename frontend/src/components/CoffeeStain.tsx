// The shapes are generated, not drawn: uneven blobs joined by quadratic curves, so the ring's
// thickness wanders like a real cup mark (an outer and an offset inner edge, filled even-odd).
const RING =
  "M113.7 22.7Q127.4 24.8 139.2 32.1Q151.0 39.3 159.6 49.9Q168.2 60.6 174.3 73.2Q180.4 85.8 180.3 100.0Q180.3 114.2 174.6 127.0Q168.8 139.7 159.8 150.1Q150.7 160.4 139.2 168.1Q127.6 175.8 113.8 176.9Q100.0 178.0 86.0 177.4Q72.0 176.8 60.3 169.1Q48.5 161.4 39.3 150.8Q30.2 140.3 26.1 127.0Q22.0 113.8 22.3 100.0Q22.5 86.3 27.2 73.5Q31.9 60.7 39.9 49.3Q48.0 38.0 60.0 30.6Q72.0 23.2 86.0 21.9Q100.0 20.6 113.7 22.7Z" +
  "M115.0 26.9Q127.4 30.0 138.9 35.7Q150.4 41.4 158.1 51.7Q165.7 62.0 170.4 73.9Q175.1 85.7 175.4 98.6Q175.8 111.4 171.7 123.8Q167.7 136.2 159.2 146.1Q150.8 156.0 139.3 162.0Q127.8 168.0 115.1 169.5Q102.5 171.0 90.0 169.2Q77.4 167.4 66.5 161.0Q55.5 154.5 47.4 144.7Q39.3 135.0 34.2 123.2Q29.0 111.5 30.2 98.7Q31.3 86.0 34.4 73.5Q37.5 61.0 46.6 51.8Q55.7 42.7 66.5 36.1Q77.3 29.4 89.9 26.6Q102.5 23.8 115.0 26.9Z";
const WASH =
  "M117.4 35.8Q133.7 42.3 148.6 52.6Q163.4 63.0 166.8 81.0Q170.2 99.0 164.8 115.9Q159.4 132.7 147.2 145.3Q135.0 158.0 118.0 163.7Q101.0 169.4 82.9 165.6Q64.8 161.8 54.6 146.7Q44.4 131.7 37.7 115.3Q30.9 99.0 36.1 81.8Q41.4 64.6 54.7 53.2Q68.0 41.8 84.5 35.6Q101.0 29.4 117.4 35.8Z";
const SECOND_RING =
  "M30.5 196.5 L20.1 189.7 L10.3 181.7 L4.3 170.7 L-0.8 159.5 L-5.4 148.2 L-9.1 136.3 L-9.4 123.8 L-6.1 111.8 L-5.0 99.2 L0.7 88.0 L8.0 77.8 L16.3 68.4 L27.0 61.8 L37.5 54.9";

/**
 * A coffee ring left on the operation orders: an uneven cup mark with a faint wash inside, part
 * of a second ring where the cup was set down again, and two drips. Flat translucent fills in
 * `--coffee`, multiplied into the paper so the type shows through. Decoration only.
 */
export function CoffeeStain({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="-15 10 215 195"
      className={`pointer-events-none text-coffee mix-blend-multiply ${className}`}
    >
      <path d={WASH} fill="currentColor" opacity={0.07} />
      <path d={RING} fill="currentColor" fillRule="evenodd" opacity={0.3} />
      <path
        d={SECOND_RING}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.18}
      />
      <circle cx="186" cy="38" r="3.2" fill="currentColor" opacity={0.28} />
      <circle cx="195" cy="52" r="1.8" fill="currentColor" opacity={0.24} />
    </svg>
  );
}
