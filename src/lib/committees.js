// College committees (Management section). The directory lives in
// src/data/committees.json — generated from Atria_Committee_Directory.xlsx,
// which was transcribed from the public atria.edu.in committees page. It is
// loaded on demand so it isn't part of the initial bundle.

let cache = null

// Committees (kind: 'committee') followed by student clubs (kind: 'club',
// from src/data/clubs.json — no member list, but a logo, handle and bio).
export function loadCommittees() {
  if (!cache) {
    cache = Promise.all([import('../data/committees.json'), import('../data/clubs.json')]).then(
      ([c, k]) => [
        ...(c.default ?? c).committees.map((x) => ({ ...x, kind: 'committee' })),
        ...(k.default ?? k).clubs.map((x) => ({ ...x, kind: 'club', icon: 'users', members: [] })),
      ]
    )
  }
  return cache
}

// Leadership roles first, in this order; everyone else ("Member", specialist
// coordinators…) follows in the order the source lists them.
const ROLE_RANK = [
  /head of the institute/i,
  /^(chairperson|chairman)$/i,
  /^president$/i,
  /^vice president$/i,
  /^convener$/i,
  /^co-convener$/i,
  /^secretary$/i,
  /^joint secretary$/i,
  /^treasurer$/i,
  /^joint treasurer$/i,
  /chief/i,
  /^management$/i,
]

export function roleRank(role = '') {
  const i = ROLE_RANK.findIndex((re) => re.test(role))
  return i === -1 ? ROLE_RANK.length : i
}

export const isMemberRole = (role = '') => /^member$/i.test(role)

// Leads = ranked leadership roles; "Member" and coordinator roles are the rest.
export function splitMembers(members) {
  const indexed = members.map((m, i) => ({ ...m, _i: i }))
  const leads = indexed
    .filter((m) => roleRank(m.role) < ROLE_RANK.length)
    .sort((a, b) => roleRank(a.role) - roleRank(b.role) || a._i - b._i)
  const rest = indexed.filter((m) => roleRank(m.role) >= ROLE_RANK.length)
  return { leads, rest }
}

// Search by committee name or by the people on it. Returns
// [{ committee, people }] where `people` are the members whose name matched
// (empty when the committee itself matched or there's no query).
export function filterCommittees(committees, query) {
  const q = query.trim().toLowerCase()
  return committees
    .map((committee) => {
      const text = `${committee.name} ${committee.short} ${committee.handle ?? ''}`.toLowerCase()
      if (!q || text.includes(q)) return { committee, people: [] }
      const people = committee.members.filter((m) => m.name.toLowerCase().includes(q))
      return people.length ? { committee, people } : null
    })
    .filter(Boolean)
}
