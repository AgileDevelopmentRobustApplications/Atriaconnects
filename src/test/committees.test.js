import { describe, it, expect } from 'vitest';
import data from '../data/committees.json';
import { filterCommittees, splitMembers, roleRank } from '../lib/committees.js';

const { committees } = data;

describe('committee directory', () => {
  it('has every committee from the spreadsheet with unique ids', () => {
    expect(committees).toHaveLength(20);
    expect(committees.reduce((n, c) => n + c.members.length, 0)).toBe(300);
    expect(new Set(committees.map((c) => c.id)).size).toBe(20);
  });

  it('puts leadership first, chair before convener, and keeps members in source order', () => {
    const academic = committees.find((c) => c.id === 'academic-administrative-committee');
    const { leads, rest } = splitMembers(academic.members);
    expect(leads.map((m) => m.role)).toEqual(['Chairperson', 'Convener']);
    expect(leads[0].name).toBe('Dr Rajesha S');
    expect(rest.every((m) => m.role === 'Member')).toBe(true);
    expect(rest[0].name).toBe('Dr. Nalinakshi N');
    expect(roleRank('Chairperson')).toBeLessThan(roleRank('Co-Convener'));
  });

  it('finds committees by committee name or by a person on them', () => {
    expect(filterCommittees(committees, 'hostel').map((r) => r.committee.short)).toEqual(['Hostel']);
    const byPerson = filterCommittees(committees, 'rajesha');
    expect(byPerson.length).toBeGreaterThan(1);
    expect(byPerson.every((r) => r.people.some((p) => p.name.includes('Rajesha')))).toBe(true);
    expect(filterCommittees(committees, '')).toHaveLength(20);
  });
});
