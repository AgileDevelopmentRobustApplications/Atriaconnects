// ─────────────────────────────────────────────────────────────────────────────
// IMAGE MANIFEST — every photo / logo the deck expects.
//
// `file` is relative to /public/images/ and has NO extension: the app tries
// .jpg → .jpeg → .png → .webp in that order. Drop your file at the path below
// (any of those extensions) and it appears; until then a clearly-labelled
// placeholder is shown. Nothing here is generated or downloaded.
//
// After editing, run `npm run images:guide` to refresh docs/IMAGE_GUIDE.md.
// ─────────────────────────────────────────────────────────────────────────────

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

export const images = {
  // ── Logo (already supplied) ────────────────────────────────────────────────
  logo: {
    file: 'logo/resq-paws-logo',
    exts: ['png'],
    slide: 0,
    title: 'RESQ PAWS logo',
    brief: 'Supplied logo, tightly cropped. Transparent PNG. Shown on a white chip on navy slides.',
    size: '993 × 506 px',
    provided: true,
  },

  // ── Slide 1 · The Opening ──────────────────────────────────────────────────
  's1-hero-human': {
    file: 'slide-1-opening/s1-hero-human-thriving',
    slide: 1,
    title: 'Person thriving after mobility loss',
    brief:
      'One strong image of someone thriving after mobility loss, such as a Paralympic or wheelchair-tennis athlete. Portrait crop, subject on the left-centre. Needs permission or a licence.',
    size: '1680 × 2160 px (portrait, 7:9)',
  },
  's1-hero-dog': {
    file: 'slide-1-opening/s1-hero-dog-wheelchair',
    slide: 1,
    title: 'Dog moving in a wheelchair',
    brief:
      'The photo the opening transitions to: a happy dog walking or running in a wheelchair. Same portrait crop as the human image so the cross-fade lines up. Eye-level, outdoors if possible.',
    size: '1680 × 2160 px (portrait, 7:9)',
  },

  // ── Slide 2 · Problem & Gap ────────────────────────────────────────────────
  's2-human-paralympics': {
    file: 'slide-2-gap/s2-humans-paralympics',
    slide: 2,
    title: 'Humans · Paralympic Games',
    brief: 'Famous example of human adaptation: Paralympic Games. Landscape. Needs a licence.',
    size: '1200 × 800 px (3:2)',
  },
  's2-human-tennis': {
    file: 'slide-2-gap/s2-humans-wheelchair-tennis',
    slide: 2,
    title: 'Humans · Wimbledon wheelchair tennis',
    brief: 'Famous example of human adaptation: Wimbledon wheelchair tennis. Landscape. Needs a licence.',
    size: '1200 × 800 px (3:2)',
  },
  's2-dogs-wheelchair-a': {
    file: 'slide-2-gap/s2-dogs-wheelchair-a',
    slide: 2,
    title: 'Dogs · happy in wheelchair (A)',
    brief: 'Strip 1: a happy dog walking in a wheelchair. Proof the solution works. Own or licensed.',
    size: '1200 × 800 px (3:2)',
  },
  's2-dogs-wheelchair-b': {
    file: 'slide-2-gap/s2-dogs-wheelchair-b',
    slide: 2,
    title: 'Dogs · happy in wheelchair (B)',
    brief: 'Strip 1: a second dog in a wheelchair, ideally a different breed / setting.',
    size: '1200 × 800 px (3:2)',
  },
  's2-service-dog-a': {
    file: 'slide-2-gap/s2-service-dog-a',
    slide: 2,
    title: 'Working dog that lost a leg (A)',
    brief:
      'Strip 2: a bomb-detection, police or military dog that lost a leg. Use a real, verified case (add name + source before presenting).',
    size: '1200 × 800 px (3:2)',
  },
  's2-service-dog-b': {
    file: 'slide-2-gap/s2-service-dog-b',
    slide: 2,
    title: 'Working dog that lost a leg (B)',
    brief: 'Strip 2: a second working-dog image, or a close-up of the same dog.',
    size: '1200 × 800 px (3:2)',
  },
  's2-dog-abandoned': {
    file: 'slide-2-gap/s2-dog-abandoned',
    slide: 2,
    title: 'Dog abandoned because care is unaffordable',
    brief:
      'One tasteful image of a dog abandoned or at risk of euthanasia because owners and NGOs cannot afford care. Tasteful: no graphic injury. Sits beside the big number.',
    size: '1600 × 1000 px (landscape)',
  },

  // ── Slide 3 · Evidence ─────────────────────────────────────────────────────
  's3-dogs-walking': {
    file: 'slide-3-evidence/s3-dogs-walking',
    slide: 3,
    title: 'Dogs walking happily in wheelchairs',
    brief: 'Photo (or video poster frame) of dogs walking happily in wheelchairs, including a service dog if you have one.',
    size: '1200 × 900 px (4:3)',
  },
  's3-ngo-1': {
    file: 'slide-3-evidence/s3-ngo-1-logo',
    slide: 3,
    title: 'NGO / rescue centre 1 logo',
    brief: 'Logo of the first NGO or rescue centre that gave written or recorded feedback. Only use with their permission.',
    size: '600 × 600 px (transparent PNG)',
  },
  's3-ngo-2': {
    file: 'slide-3-evidence/s3-ngo-2-logo',
    slide: 3,
    title: 'NGO / rescue centre 2 logo',
    brief: 'Logo of the second NGO or rescue centre.',
    size: '600 × 600 px (transparent PNG)',
  },
  's3-ngo-3': {
    file: 'slide-3-evidence/s3-ngo-3-logo',
    slide: 3,
    title: 'NGO / rescue centre 3 logo',
    brief: 'Logo of the third NGO or rescue centre.',
    size: '600 × 600 px (transparent PNG)',
  },

  // ── Slide 4 · Solution ─────────────────────────────────────────────────────
  's4-wheelchair': {
    file: 'slide-4-solution/s4-wheelchair',
    slide: 4,
    title: 'RESQ wheelchair',
    brief: 'Wheelchair photo or render on a clean background. Three-quarter view. Transparent PNG works best on the navy card.',
    size: '1200 × 1000 px',
  },
  's4-app-care': {
    file: 'slide-4-solution/s4-app-screen-care',
    slide: 4,
    title: 'App screen · Care (vet booking / specialist match)',
    brief: 'MVP screenshot for the Care pillar: quick vet appointment or specialist matching. Portrait phone screenshot.',
    size: '1080 × 2160 px (portrait)',
  },
  's4-app-wellness': {
    file: 'slide-4-solution/s4-app-screen-wellness',
    slide: 4,
    title: 'App screen · Wellness / rehab tracking',
    brief: 'MVP screenshot for the Wellness pillar (grooming, spa, laser therapy) or rehab tracking. Portrait phone screenshot.',
    size: '1080 × 2160 px (portrait)',
  },

  // ── Slide 6 · Business Model ───────────────────────────────────────────────
  's6-partner-vets': {
    file: 'slide-6-business-model/s6-partner-vets-logo',
    slide: 6,
    title: 'Vet partner logo',
    brief: 'Logo of a vet clinic or network that has actually agreed to partner. Remove the slot if there is none.',
    size: '600 × 300 px (transparent PNG)',
  },
  's6-partner-pawful': {
    file: 'slide-6-business-model/s6-partner-pawful-logo',
    slide: 6,
    title: 'Pawful logo (household meals)',
    brief: 'Pawful logo. Confirm the partnership status before showing it.',
    size: '600 × 300 px (transparent PNG)',
  },
  's6-partner-grooming': {
    file: 'slide-6-business-model/s6-partner-grooming-logo',
    slide: 6,
    title: 'Grooming company logo',
    brief: 'Logo of the grooming company partner. Confirm the partnership status before showing it.',
    size: '600 × 300 px (transparent PNG)',
  },
}
