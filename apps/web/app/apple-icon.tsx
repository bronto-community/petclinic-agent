import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

// The app mark on a full-bleed brand-yellow square (iOS rounds the corners): Lucide's paw-print (ISC, see NOTICE).
export default function AppleIcon() {
  return new ImageResponse(
    <svg fill="none" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      <rect fill="#F5B719" height="180" width="180" />
      <g
        stroke="#2C2E25"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        transform="translate(38 38) scale(4.333)"
      >
        <circle cx="11" cy="4" r="2" />
        <circle cx="18" cy="8" r="2" />
        <circle cx="20" cy="16" r="2" />
        <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
      </g>
    </svg>,
    size,
  );
}
