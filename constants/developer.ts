export interface SocialLink {
  key: "github" | "linkedin" | "instagram" | "facebook" | "twitter";
  label: string;
  handle: string;
  url: string;
}

export interface DeveloperInfo {
  name: string;
  role: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  socials: SocialLink[];
  privacyPolicyUrl: string;
}

const HANDLE = "cypherab01";

export const DEVELOPER: DeveloperInfo = {
  name: "Abhishek Ghimire",
  role: "Software Developer",
  email: "aghimire074@gmail.com",
  phone: "+977 9847526298",
  location: "Nepal",
  bio: "Software Engineer focused on building scalable, reliable, and user-centric digital solutions from concept to deployment.",
  socials: [
    {
      key: "github",
      label: "GitHub",
      handle: `@${HANDLE}`,
      url: `https://github.com/${HANDLE}`,
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      handle: `@${HANDLE}`,
      url: `https://www.linkedin.com/in/${HANDLE}`,
    },
    {
      key: "instagram",
      label: "Instagram",
      handle: `@${HANDLE}`,
      url: `https://www.instagram.com/${HANDLE}`,
    },
  ],
  privacyPolicyUrl: "https://privacy.abhishekg.info.np/baraabar.html",
};
