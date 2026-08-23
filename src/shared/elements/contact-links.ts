/**
 * The contact pills rendered by `<st-footer>` — email plus the three social
 * profiles. One array so the markup in `footer.ts` is a loop, not four
 * hand-copied `<li>`s.
 */
export interface ContactLink {
  href: string;
  label: string;
  /** Font Awesome style prefix, e.g. "fa-regular" or "fa-brands". */
  iconStyle: string;
  /** Font Awesome icon class, e.g. "fa-envelope". */
  icon: string;
  external: boolean;
}

export const CONTACT_LINKS: ContactLink[] = [
  {
    href: "mailto//:tobias@stoeier.dk",
    label: "Email",
    iconStyle: "fa-regular",
    icon: "fa-envelope",
    external: false,
  },
  {
    href: "https://dk.linkedin.com/in/stoeier",
    label: "LinkedIn",
    iconStyle: "fa-brands",
    icon: "fa-linkedin-in",
    external: true,
  },
  {
    href: "https://instagram.com/stoeier",
    label: "Instagram",
    iconStyle: "fa-brands",
    icon: "fa-instagram",
    external: true,
  },
  {
    href: "https://open.spotify.com/artist/1OrUsE9Nua3bqJKM6lPnDW",
    label: "Spotify",
    iconStyle: "fa-brands",
    icon: "fa-spotify",
    external: true,
  },
];
