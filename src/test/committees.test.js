import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import data from '../data/committees.json';
import clubData from '../data/clubs.json';
import { filterCommittees, loadCommittees, splitMembers, roleRank } from '../lib/committees.js';

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

describe('club directory', () => {
  const { clubs } = clubData;

  it('lists the 10 clubs from club_info.docx, without entries 10 and 11', () => {
    expect(clubs).toHaveLength(10);
    const handles = clubs.map((c) => c.handle);
    expect(handles).not.toContain('students.chapter_atria.it');
    expect(handles).not.toContain('lunar.syndicate_atria.it');
    expect(new Set(clubs.map((c) => c.id)).size).toBe(10);
  });

  it('has a logo file in public/ for every club', () => {
    for (const c of clubs) {
      // tests run from the project root
      expect(existsSync(resolve('public', `.${c.logo}`)), c.logo).toBe(true);
    }
  });

  it('has a chat room seeded for every club (migration 035 directory_id)', () => {
    const sql = readFileSync(resolve('supabase/migrations/035_directory_club_chats.sql'), 'utf8');
    for (const c of clubs) expect(sql, c.id).toContain(`('${c.id}',`);
  });

  it('loads clubs after committees and finds them by handle', async () => {
    const all = await loadCommittees();
    expect(all).toHaveLength(30);
    expect(all.slice(20).every((x) => x.kind === 'club')).toBe(true);
    expect(filterCommittees(all, 'gdg.atria').map((r) => r.committee.id)).toEqual(['club-gdg']);
  });
});
