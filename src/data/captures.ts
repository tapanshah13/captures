export type Photo = {
  slug: string;
  title: string;
  place: string;
  date: string;
  story: string;
  roll: string;
  collections: string[];
  favorite?: boolean;
  src?: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
  exif?: { camera?: string; lens?: string; aperture?: string; shutter?: string; iso?: number | string };
};

export type Roll = { id: string; name: string; meta: string };

export const photos: Photo[] = [
  {
    "slug": "tunnel-view-after-the-rain",
    "title": "Tunnel View, after the rain",
    "place": "Yosemite, CA",
    "date": "2025-10-12T18:42:00-07:00",
    "story": "Waited forty minutes for the clouds. They lifted for ninety seconds.",
    "roll": "yosemite",
    "collections": [
      "California"
    ],
    "favorite": true,
    "exif": {
      "camera": "iPhone 16 Pro",
      "lens": "24mm",
      "aperture": "f/1.8",
      "shutter": "1/250",
      "iso": 80
    }
  },
  {
    "slug": "pike-place-closing-time",
    "title": "Pike Place, closing time",
    "place": "Seattle, WA",
    "date": "2026-03-03T17:58:00-08:00",
    "story": "The fish guys were done throwing. The light wasn’t.",
    "roll": "seattle",
    "collections": [
      "After dark"
    ],
    "favorite": true,
    "exif": {
      "camera": "Fujifilm X-T5",
      "lens": "23mm",
      "aperture": "f/2",
      "shutter": "1/500",
      "iso": 400
    }
  },
  {
    "slug": "hoh-rainforest",
    "title": "Hoh rainforest",
    "place": "Olympic NP, WA",
    "date": "2025-06-21T11:10:00-07:00",
    "story": "Everything was green. Including my lens.",
    "roll": "pnw",
    "collections": [
      "Pacific Northwest"
    ],
    "favorite": false,
    "exif": {
      "camera": "Fujifilm X-T5",
      "lens": "16mm",
      "aperture": "f/4",
      "shutter": "1/60",
      "iso": 800
    }
  },
  {
    "slug": "sabarmati-morning",
    "title": "Sabarmati morning",
    "place": "Ahmedabad, IN",
    "date": "2024-12-28T07:15:00+05:30",
    "story": "Chai in one hand, camera in the other.",
    "roll": "india",
    "collections": [
      "Home"
    ],
    "favorite": true,
    "exif": {
      "camera": "iPhone 15",
      "lens": "26mm",
      "aperture": "f/1.6",
      "shutter": "1/1000",
      "iso": 50
    }
  },
  {
    "slug": "capitol-hill-1-am",
    "title": "Capitol Hill, 1 AM",
    "place": "Seattle, WA",
    "date": "2026-01-18T01:04:00-08:00",
    "story": "Neon and rain. Seattle’s best combo.",
    "roll": "seattle",
    "collections": [
      "After dark"
    ],
    "favorite": true,
    "exif": {
      "camera": "Fujifilm X-T5",
      "lens": "33mm",
      "aperture": "f/1.4",
      "shutter": "1/60",
      "iso": 3200
    }
  },
  {
    "slug": "rainier-from-the-ferry",
    "title": "Rainier from the ferry",
    "place": "Puget Sound, WA",
    "date": "2025-08-09T16:30:00-07:00",
    "story": "The mountain was out. Everyone pointed.",
    "roll": "pnw",
    "collections": [
      "Pacific Northwest"
    ],
    "favorite": true,
    "exif": {
      "camera": "iPhone 16 Pro",
      "lens": "120mm",
      "aperture": "f/2.8",
      "shutter": "1/800",
      "iso": 64
    }
  },
  {
    "slug": "long-beach-sunset",
    "title": "Long Beach sunset",
    "place": "Long Beach, CA",
    "date": "2024-04-26T19:41:00-07:00",
    "story": "Last week of grad school. Felt like it.",
    "roll": "yosemite",
    "collections": [
      "California"
    ],
    "favorite": true,
    "exif": {
      "camera": "iPhone 14",
      "lens": "26mm",
      "aperture": "f/1.5",
      "shutter": "1/2000",
      "iso": 50
    }
  },
  {
    "slug": "blue-hour-on-the-sound",
    "title": "Blue hour on the Sound",
    "place": "Seattle, WA",
    "date": "2026-02-14T17:52:00-08:00",
    "story": "Ten minutes of blue, then dark.",
    "roll": "seattle",
    "collections": [
      "After dark"
    ],
    "favorite": false,
    "exif": {
      "camera": "Fujifilm X-T5",
      "lens": "56mm",
      "aperture": "f/2",
      "shutter": "1/125",
      "iso": 640
    }
  },
  {
    "slug": "pol-at-manek-chowk",
    "title": "Pol at Manek Chowk",
    "place": "Ahmedabad, IN",
    "date": "2024-12-30T21:20:00+05:30",
    "story": "Midnight sandwiches are a personality trait here.",
    "roll": "india",
    "collections": [
      "Home"
    ],
    "favorite": false,
    "exif": {
      "camera": "iPhone 15",
      "lens": "26mm",
      "aperture": "f/1.6",
      "shutter": "1/60",
      "iso": 1250
    }
  },
  {
    "slug": "mirror-lake",
    "title": "Mirror Lake",
    "place": "Yosemite, CA",
    "date": "2025-10-13T08:02:00-07:00",
    "story": "No wind for exactly one photo.",
    "roll": "yosemite",
    "collections": [
      "California"
    ],
    "favorite": false,
    "exif": {
      "camera": "iPhone 16 Pro",
      "lens": "24mm",
      "aperture": "f/1.8",
      "shutter": "1/500",
      "iso": 64
    }
  },
  {
    "slug": "kite-festival-rooftops",
    "title": "Kite festival rooftops",
    "place": "Ahmedabad, IN",
    "date": "2025-01-14T15:30:00+05:30",
    "story": "Uttarayan. The sky was busier than the streets.",
    "roll": "india",
    "collections": [
      "Home"
    ],
    "favorite": false,
    "exif": {
      "camera": "iPhone 15",
      "lens": "77mm",
      "aperture": "f/2.8",
      "shutter": "1/1600",
      "iso": 50
    }
  },
  {
    "slug": "snoqualmie-in-fog",
    "title": "Snoqualmie in fog",
    "place": "Snoqualmie, WA",
    "date": "2025-11-02T10:12:00-08:00",
    "story": "You could hear the falls before you could see them.",
    "roll": "pnw",
    "collections": [
      "Pacific Northwest"
    ],
    "favorite": false,
    "exif": {
      "camera": "Fujifilm X-T5",
      "lens": "23mm",
      "aperture": "f/5.6",
      "shutter": "1/30",
      "iso": 200
    }
  }
];

export const rolls: Roll[] = [
  {
    "id": "yosemite",
    "name": "Yosemite & California",
    "meta": "Oct 2025 · ROLL 07"
  },
  {
    "id": "seattle",
    "name": "Seattle, after dark",
    "meta": "2026 · ROLL 09"
  },
  {
    "id": "pnw",
    "name": "Pacific Northwest",
    "meta": "2025 · ROLL 08"
  },
  {
    "id": "india",
    "name": "Home, Ahmedabad",
    "meta": "Dec 2024 · ROLL 05"
  }
];

// Preserve the capture's local wall time regardless of the viewer's timezone.
export function photoDate(date: string) {
  const wallTime = new Date(date.slice(0, 19) + "Z");
  const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(wallTime);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(wallTime);
  return `${day} · ${time}`;
}

export function frameNumber(photo: Photo) {
  return `${String(photos.findIndex((item) => item.slug === photo.slug) + 1).padStart(2, "0")}A`;
}
