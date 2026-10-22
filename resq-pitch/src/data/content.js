// ─────────────────────────────────────────────────────────────────────────────
// CONTENT — the single place to edit wording and figures.
//
// Source of truth: docs/source/RESQ_TiE_Pitch.pdf  ("Pitch Deck Content: TiE University")
//
// Mini-markup used in any string:
//   *word*        → orange accent
//   [[TEXT]]      → visible development flag, rendered as "[TEXT]". Every flag is an
//                   open item: a placeholder, an unverified claim, or a team decision.
//                   NEVER present a flagged item as fact. Remove the flag only after
//                   the figure has been verified and cited.
//
// Do not add slides, statistics, sources, partners or milestones that are not in
// the PDF. `npm run audit` checks numbers in this file against the PDF.
// ─────────────────────────────────────────────────────────────────────────────

export const SLIDES = [
  { id: 'opening', no: 1, label: 'The Opening: Stigma', theme: 'dark', steps: 5,
    job: 'Stigma is curable: diabetes and insulin, mobility and rehab' },
  { id: 'gap', no: 2, label: 'The Problem & the Gap', theme: 'dark', steps: 5,
    job: 'Humans have access; dogs, even service dogs, don’t' },
  { id: 'evidence', no: 3, label: 'Evidence', theme: 'light', steps: 3,
    job: 'Prove the demand is real' },
  { id: 'solution', no: 4, label: 'The Solution', theme: 'dark', steps: 4,
    job: 'Show what RESQ is' },
  { id: 'value', no: 5, label: 'Value Proposition', theme: 'light', steps: 4,
    job: 'Make the price difference obvious' },
  { id: 'model', no: 6, label: 'Business Model', theme: 'light', steps: 3,
    job: 'Show why it makes money' },
  { id: 'ask', no: 7, label: 'Go-to-Market & The Ask', theme: 'dark', steps: 4,
    job: 'Close with growth plan and the ask' },
]

export const FOOTER = 'RESQ · TiE University Pitch'

// ── 1 · THE OPENING: STIGMA ──────────────────────────────────────────────────
export const opening = {
  headline: 'Mobility loss carries a *stigma.*',
  lead: 'Rehab support is what breaks it, for people and for dogs.',
  journeys: [
    {
      label: 'Diabetes',
      nodes: ['Stigma', 'Insulin', 'Normal life'],
      note: 'Insulin was first used in treatment in 1921. [[VERIFY & CITE]]',
    },
    {
      label: 'Mobility loss',
      nodes: ['Stigma', 'Rehab support', 'Normal life'],
      note: 'Human rehab outcome facts: [[SOURCE NEEDED]]',
    },
  ],
  curable: 'The stigma is *curable.*',
  finale: ['That is true for people.', 'It should be true for animals too.', 'This is where *RESQ* starts.'],
}

// ── 2 · THE PROBLEM & THE GAP ────────────────────────────────────────────────
export const gap = {
  headline: 'Humans have a mobility solution market. *Dogs do not.* That gap is *RESQ.*',
  humans: {
    title: 'Humans',
    sub: 'Role models, funding, an industry',
    captions: ['Paralympic Games', 'Wimbledon wheelchair tennis'],
  },
  dogs: {
    title: 'Dogs',
    strips: [
      { label: 'Dogs in wheelchairs run, play and live happy lives', tag: 'The solution works' },
      { label: 'Working dogs that lost legs on duty', tag: 'Bomb-detection · police · military' },
    ],
    workingDogFlag: '[[VERIFY: add one real working-dog case, with name and source]]',
  },
  table: [
    { row: 'Famous examples', human: 'Paralympics, Wimbledon wheelchair tennis', dog: 'Few or none; bomb-squad dogs get no standard support' },
    { row: 'Wheelchairs & prosthetics', human: 'Yes', dog: 'No affordable wheelchair' },
    { row: 'Physiotherapy / rehab network', human: 'Yes', dog: 'No rehab network' },
    { row: 'Insurance', human: 'Yes', dog: 'No insurance' },
    { row: 'Outcome after severe injury', human: 'Care and recovery', dog: 'Often euthanasia' },
  ],
  tableFlag: 'Table claims: [[SOURCE NEEDED]]',
  bigNumber: {
    value: '[X]',
    label: 'disabled dogs per year in India',
    flag: '[[SOURCE NEEDED]]',
  },
  close: 'We are not inventing a new market. We are bringing a proven one to the species that has none.',
}

// ── 3 · EVIDENCE ─────────────────────────────────────────────────────────────
export const evidence = {
  headline: 'India is the largest growing market with no accessible mobility solution, and *NGOs already prove it.*',
  headlineFlag: '[[VERIFY: “largest growing market”]]',
  research: {
    label: 'Research',
    claim: 'Dogs with mobility aids and rehab can live long, happy lives.',
    claimFlag: '[[VERIFY]]',
    cards: [
      { n: 1 }, { n: 2 }, { n: 3 },
    ].map((c) => ({
      ...c,
      title: '[Paper title]',
      journal: '[Journal]',
      year: '[Year]',
      finding: '[One finding on mobility aids or rehab outcomes for dogs]',
      source: '[[ADD CITATION]]',
    })),
  },
  ngo: {
    label: 'NGO proof',
    claim: 'NGOs turn animals away because they cannot afford a solution.',
    claimFlag: '[[VERIFY: needs written / recorded NGO feedback]]',
    rows: [
      { id: 's3-ngo-1' }, { id: 's3-ngo-2' }, { id: 's3-ngo-3' },
    ].map((r) => ({
      ...r,
      name: '[NGO name]',
      pays: 'Pays today for an imported / custom wheelchair: [[FILL]]',
    })),
  },
  chart: {
    label: 'What it costs today',
    bars: [
      { id: 'wheelchair', label: 'Imported / custom pet wheelchair', placeholder: '[[FILL: NGO-reported price]]' },
      { id: 'typical', label: 'Typical owner spend on pet healthcare', value: 8250, display: '₹8–8.5K', flag: '[[CONFIRM BILLING PERIOD]]' },
      { id: 'resq', label: 'RESQ subscription + free wheelchair', value: 3999, display: '₹3,999', flag: '[[CONFIRM BILLING PERIOD]]' },
    ],
    max: 8500,
  },
  callouts: [
    { text: 'Most owners give up because of cost, not love.', flag: '[[VERIFY: back with survey data]]' },
  ],
  stats: [
    {
      label: 'Owner survey',
      body: 'We surveyed [N] owners and [X]% said they would use a wheelchair.',
      source: 'Source: own survey · primary data [[CONFIRM N]]',
    },
    {
      label: 'India pet-care market',
      body: 'Market size: [FILL] · growth rate: [FILL]',
      source: 'Source: [[SOURCE NEEDED]]',
    },
  ],
}

// ── 4 · THE SOLUTION ─────────────────────────────────────────────────────────
export const solution = {
  headline: 'One platform: free wheelchair, affordable care, and *continuous rehabilitation.*',
  pillars: [
    {
      id: 'mobility', title: 'Mobility',
      items: [{ n: 1, text: 'Free, patented wheelchair', flag: '[[VERIFY PATENT STATUS]]' }],
      image: 's4-wheelchair',
    },
    {
      id: 'care', title: 'Care',
      items: [
        { n: 2, text: 'Cheap, quick appointments' },
        { n: 3, text: 'Specialist matching' },
        { text: 'Affordable treatment' },
        { n: 4, text: 'Continuous rehab' },
      ],
      image: 's4-app-care',
    },
    {
      id: 'wellness', title: 'Wellness',
      items: [{ n: 5, text: 'Spa, grooming, laser therapy' }],
      image: 's4-app-wellness',
    },
  ],
  flow: ['Wheelchair', 'Quick vet appointment', 'Specialist match', 'Continuous rehab', 'Grooming and wellness'],
  close: 'One place for a pet’s health and wellbeing.',
  screensFlag: 'App screens: [[ADD MVP SCREENSHOTS]]',
}

// ── 5 · VALUE PROPOSITION ────────────────────────────────────────────────────
export const value = {
  headline: 'Owners spend about ₹8–8.5K on pet healthcare. With RESQ they spend *₹3,999* and get the wheelchair too.',
  typical: { low: 8000, high: 8500, label: 'Typical owner spend on pet healthcare' },
  resq: { amount: 3999, label: 'RESQ subscription' },
  saving: 'about 50% less',
  billingFlag: '[[CONFIRM BILLING PERIOD]]',
  assumptionFlag: 'Assumes the ₹8–8.5K typical spend covers the same period as ₹3,999. [[CONFIRM BILLING PERIOD]] · Source for ₹8–8.5K: [[SOURCE NEEDED]]',
  includes: {
    label: 'What ₹3,999 includes',
    items: [
      { text: 'Supplements' },
      { text: 'Healthcare access' },
      { text: 'Appointments' },
      { text: 'The wheelchair', tag: 'Free' },
    ],
  },
  unit: {
    label: 'Unit economics',
    rows: [
      { k: 'Revenue per subscriber', v: '[FILL]' },
      { k: 'Cost to serve', v: '[FILL]' },
      { k: 'Gross margin', v: '[FILL]' },
    ],
  },
  close: 'The wheelchair is free. They pay for the subscription, not the device.',
}

// ── 6 · BUSINESS MODEL ───────────────────────────────────────────────────────
export const model = {
  headline: 'Free wheelchair, recurring subscription, and *low costs* through bulk buying and partnerships.',
  flow: [
    { id: 'crowd', title: 'Crowdfunding', sub: 'Funds the wheelchair', flag: '[[FILL: platform, target, wheelchairs per round]]' },
    { id: 'chair', title: 'Free wheelchair', sub: 'Free to the owner' },
    { id: 'owner', title: 'Owner joins', sub: 'Gets care and rehab' },
    { id: 'sub', title: 'Subscription revenue', sub: '₹3,999', flag: '[[CONFIRM BILLING PERIOD]]' },
    { id: 'partners', title: 'Partner services', sub: 'Food · grooming · vets' },
  ],
  boxes: [
    { id: 'sub', kind: 'Revenue', title: 'Subscription', body: 'Owners pay for the subscription, not the device.' },
    { id: 'commission', kind: 'Revenue', title: 'Partner commissions', body: 'Food, grooming, vets.' },
    { id: 'bulk', kind: 'Cost advantage', title: 'Bulk pharma & supplement margins', body: 'Bought from pharmaceutical companies at fixed rates. Fixed fees for doctor appointments.' },
  ],
  partners: [
    { id: 's6-partner-vets', label: 'Vets' },
    { id: 's6-partner-pawful', label: 'Pawful · household meals' },
    { id: 's6-partner-grooming', label: 'Grooming company' },
  ],
  partnersFlag: 'Partner status: [[VERIFY PARTNERSHIP STATUS]]',
  patent: { badge: 'Wheelchair patent owned by RESQ', flag: '[[VERIFY PATENT STATUS & NUMBER]]' },
}

// ── 7 · GO-TO-MARKET & THE ASK ───────────────────────────────────────────────
export const ask = {
  headline: 'A free wheelchair is our marketing. We get customers through *publicity, NGOs and pet communities.*',
  strategy: ['Wheelchair free first', 'Subscription after'],
  channels: [
    { title: 'Publicity', body: 'from free wheelchairs' },
    { title: 'NGO initiatives', body: 'we plug into what they already run' },
    { title: 'Pet communities', body: 'referrals' },
  ],
  cac: 'Paid CAC is near zero, driven by referrals. Effective CAC is the wheelchair cost, covered by crowdfunding.',
  cacFlag: '[[ESTIMATE CAC]]',
  mvp: { label: 'MVP status', flag: '[[CONFIRM MVP STATUS]]' },
  milestones: {
    label: 'Next 6–12 months',
    items: ['[[FILL MILESTONE]]', '[[FILL MILESTONE]]', '[[FILL MILESTONE]]'],
  },
  market: {
    label: 'Market size',
    layers: [
      { id: 'tam', name: 'TAM', def: 'Pet owners and animal organisations in India needing mobility or healthcare support', value: '[FILL]' },
      { id: 'sam', name: 'SAM', def: 'Urban owners, NGOs and rescue centres in launch cities', value: '[FILL]' },
      { id: 'som', name: 'SOM', def: 'What we can realistically win in 1–3 years', value: '[FILL]' },
    ],
    flag: '[[SOURCE NEEDED: sources and assumptions]]',
  },
  theAsk: {
    label: 'The ask',
    amount: '₹ [[CONFIRM WITH TEAM]] crore',
    conflict: 'Source notes list both ₹10 Cr and ₹20 Cr',
    purpose: 'To scale the MVP, produce more wheelchairs and onboard vets.',
    uses: [
      { name: 'Product & manufacturing', covers: 'Wheelchair production, design iterations, patents' },
      { name: 'Technology', covers: 'App, vet booking, subscription and rehab-tracking' },
      { name: 'Partnerships & supply', covers: 'Pharma and supplement stock, vet and grooming onboarding' },
      { name: 'Team & operations', covers: 'Hiring, field operations, customer support' },
      { name: 'Community & NGO programs', covers: 'NGO initiatives, events, pet-community outreach' },
      { name: 'Reserve', covers: 'Runway buffer' },
    ],
    splitFlag: '[[SET SPLIT]]',
  },
}

// ── PRESENTER NOTES (from the PDF; shown only in notes mode, key N) ──────────
export const NOTES = [
  {
    say: [
      '“Diabetes once carried a heavy stigma. Insulin changed that.”',
      '“Mobility loss carries the same stigma today: people hear ‘paralysed’ and assume the story is over.”',
      '“Rehab support breaks that stigma. The stigma is curable.”',
      '“That is true for people, and it should be true for animals. This is where RESQ starts.”',
    ],
    script:
      'Not long ago, diabetes carried a heavy stigma. Insulin changed that. It became a condition people manage and live full lives with. Mobility loss carries the same stigma today. Someone is told they can’t walk, and people assume the story is over. It isn’t. Rehab support breaks that stigma, the way insulin did for diabetes. We see people walk, play and compete again. That is true for people. It should be true for animals too, and that is where RESQ starts.',
    proof: [
      'A credible source for the diabetes stigma and how insulin changed it (insulin was first used in treatment in 1921) [verify and cite].',
      'One or two outcome facts on rehab for mobility loss in humans [source].',
      'One real photo of a person who recovered or competes after mobility loss, with permission or a licensed image.',
    ],
    ask: ['Why compare mobility loss to diabetes?', 'Is mobility loss really curable?'],
    tip: 'Say “the stigma is curable”, not “the injury is curable”. Rehab restores quality of life and movement; never overpromise recovery.',
    build: ['Headline + hero photo', 'Diabetes path', 'Mobility-loss path', 'The stigma is curable.', 'From people to dogs'],
  },
  {
    say: [
      '“Look at the human side: Paralympians, Wimbledon wheelchair champions, a whole industry, role models, funding and insurance.”',
      '“Now look at dogs: a dog that loses its legs gets no wheelchair, no rehab and no insurance, and often faces euthanasia.”',
      '“But the solution works: dogs in wheelchairs run, play and live happy lives, and working dogs like bomb-squad dogs deserve the same chance.”',
      '“We are not inventing a new market. We are bringing an existing, proven market to the species that has none.”',
    ],
    script:
      'Look at the human side: Paralympians, Wimbledon wheelchair champions, a whole industry, role models, funding and insurance. Now look at dogs. A dog that loses its legs gets no wheelchair, no rehab and no insurance, and it often means euthanasia. But the solution works: dogs in wheelchairs run, play and live happy lives. And this is not only about pets. Bomb-squad and other working dogs have lost legs in the line of duty, and they deserve the same chance. We are not inventing a new market. We are bringing a proven one to the species that has none.',
    proof: [
      '2 or 3 human adaptation examples with sources (Paralympic Games, Wimbledon wheelchair tennis).',
      'Photos or videos of dogs walking happily with wheelchairs (own or licensed).',
      'One real working-dog case: a bomb-detection, police or military dog that lost a leg [add name, source and photo; verify before using].',
      'Number of injured or disabled dogs per year in India [source]; size of the human mobility-aid market [source].',
    ],
    ask: [
      'Is there any competitor selling pet wheelchairs?',
      'Why would owners pay for a dog when they cannot afford it for themselves?',
      'Are service dogs a real customer segment? (Possible institutional buyers: police, army and K9 units [validate].)',
    ],
    tip: 'Keep it visual. Lead with the contrast: humans on one side, dogs on the other. The working-dog example widens RESQ from pet owners to institutions.',
    build: ['Headline', 'Humans', 'Dogs', 'Side-by-side table', 'The scale of the gap'],
  },
  {
    say: [
      '“Research shows that dogs with mobility aids and rehab can live long, happy lives.”',
      '“The NGOs we spoke to confirmed it: they turn animals away because they cannot afford a solution.”',
      '“India has one of the largest pet and street-animal populations and the fastest-growing pet-care market, yet no accessible mobility solution.”',
    ],
    script:
      'Research shows dogs with mobility aids and rehab can live long, happy lives. The NGOs we spoke to confirmed it: they turn animals away because they cannot afford a solution. India has one of the largest pet and street-animal populations and a fast-growing pet-care market, yet no accessible mobility solution. We surveyed [N] owners and [X]% said they would use a wheelchair.',
    proof: [
      'At least 2 peer-reviewed or credible papers on canine mobility aids and rehabilitation.',
      'Written or recorded feedback from 3-5 NGOs or rescue centres, with current prices.',
      'Pet-owner survey: how many would use a wheelchair and what they spend now.',
    ],
    ask: ['Is this data primary or secondary?', 'How many NGOs have committed to use it?'],
    tip: 'Even a 50-owner survey you ran yourself is strong evidence. Say how many people you asked.',
    build: ['Headline + research', 'NGO proof + price chart', 'Callouts, survey, market'],
  },
  {
    say: [
      '“RESQ gives every disabled pet a wheelchair, and then stays with the owner through recovery.”',
      '“We help owners find the right specialist, get a quick and affordable appointment, and keep up rehab so the dog actually recovers.”',
      '“Beyond rehab, we offer spa, grooming and laser therapy, so RESQ becomes the one place for a pet’s health and wellbeing.”',
    ],
    script:
      'RESQ gives every disabled pet a wheelchair, then stays with the owner through recovery. We help owners find the right specialist, get a quick and affordable appointment, and keep up rehab so the dog actually recovers. Beyond rehab, we offer spa, grooming and laser therapy, so RESQ becomes the one place for a pet’s health and wellbeing.',
    proof: [
      'Wheelchair specs: materials, sizes, adjustability, weight, production cost per unit.',
      'Patent details and status.',
      'List of vets and specialists onboarded or committed.',
      'MVP screenshots or a short demo video.',
    ],
    ask: ['Who manufactures the wheelchair and at what cost?', 'How do you guarantee vet quality?'],
    tip: 'Do not list every feature. Three headings only: Mobility, Care, Wellness.',
    build: ['Headline', 'Mobility', 'Care', 'Wellness'],
  },
  {
    say: [
      '“Today an average owner spends Rs. 8,000 to Rs. 8,500 on healthcare for a pet.”',
      '“With RESQ, they spend Rs. 3,999, and that already includes supplements and the wheelchair.”',
      '“The wheelchair is free. They pay for the subscription, not the device.”',
    ],
    script:
      'Today an average owner spends Rs. 8,000 to 8,500 on healthcare for a pet. With RESQ they spend Rs. 3,999, and that already includes supplements and the wheelchair. The wheelchair is free. They pay for the subscription, not the device.',
    proof: [
      'Source for the Rs. 8-8.5K figure (owner survey, vet data or market report).',
      'Breakdown of Rs. 3,999: supplements, appointments, platform fee, margin.',
      'Cost to serve one subscriber per month and per year.',
      'Expected retention (months an owner stays).',
    ],
    ask: ['Do you make money at Rs. 3,999, and where does the margin come from?', 'Is Rs. 3,999 monthly, quarterly or yearly?'],
    tip: 'Investors will ask about the billing period immediately. Put it on the slide.',
    build: ['Headline + typical spend', 'RESQ price + saving', 'What ₹3,999 includes', 'Unit economics'],
  },
  {
    say: [
      '“The wheelchair is crowdfunded and free. RESQ owns the patent, so nobody can copy it cheaply.”',
      '“We keep prices low because we buy from pharmaceutical companies at fixed rates and agree fixed fees for doctor appointments.”',
      '“Home food delivery for humans is already a proven model. We bring the same to dogs and collaborate with companies in that space, plus grooming companies.”',
    ],
    script:
      'The wheelchair is crowdfunded and free. RESQ owns the patent, so it can’t be copied cheaply. We keep prices low because we buy from pharmaceutical companies at fixed rates and agree fixed fees for doctor appointments. Home food delivery for humans is a proven model. We bring the same to dogs with partners like Pawful, plus grooming companies.',
    proof: [
      'Crowdfunding plan: platform, target amount, number of wheelchairs funded.',
      'Signed or verbal commitments from pharma suppliers, vets, Pawful and grooming partners.',
      'Cost per wheelchair vs wheelchairs funded per round.',
      'Patent number or filing proof.',
    ],
    ask: ['What if crowdfunding dries up?', 'Why will partners give you fixed rates?', 'What stops a bigger player from copying you?'],
    tip: 'Three real logos are stronger than a paragraph.',
    build: ['Headline + money flow', 'Three revenue / cost boxes', 'Partners + patent'],
  },
  {
    say: [
      '“Every free wheelchair is a story people share, so our customer acquisition cost is close to zero.”',
      '“NGOs and pet communities already run initiatives, and we plug into them.”',
      '“We are raising Rs. [X] crore to scale the MVP, produce more wheelchairs and onboard vets.”',
    ],
    script:
      'Every free wheelchair is a story people share, so our paid customer acquisition cost is near zero, driven by referrals. The wheelchair’s cost is covered by crowdfunding, not our balance sheet. NGOs and pet communities already run initiatives, and we plug into them. We are raising Rs. [X] crore to scale the MVP, produce more wheelchairs and onboard vets.',
    proof: [
      'TAM, SAM, SOM with sources and assumptions.',
      'A realistic CAC estimate.',
      'MVP milestones for the next 6-12 months.',
      'Use-of-funds breakdown.',
    ],
    ask: ['Is CAC really zero?', 'What will you do with the money in the first 12 months?', 'Which milestones unlock the next round?'],
    tip: 'Say “near-zero CAC driven by referrals”, never “zero”. It is more believable.',
    build: ['Headline + strategy + channels', 'MVP status + milestones', 'TAM / SAM / SOM', 'The ask + use of funds'],
  },
]
