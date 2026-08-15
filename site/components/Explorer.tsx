'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Tone } from '@/lib/present';

export interface RowSignal {
  key: string;
  /** 카드에서 왼쪽에 붙는 짧은 이름 */
  short: string;
  value: string;
  tone: Tone;
}

export interface Row {
  id: string;
  nameEn: string;
  nameKo: string;
  category: string;
  categoryEn: string;
  importance: number;
  /** 8개 시그널 중 값이 기록된 개수 */
  measured: number;
  total: number;
  /** 자동 측정이 막혀 있으면 그 이유. 아니면 null */
  crawlBlocked: 'robots' | 'bot-block' | null;
  signals: RowSignal[];
  haystack: string;
}

interface Facet {
  id: string;
  label: string;
  ko: string;
  test: (r: Row) => boolean;
}

/**
 * 필터는 전부 "관측된 사실"로만 정의한다. 순위를 매기거나 추천하지 않는다.
 */
const FACETS: Facet[] = [
  {
    id: 'english',
    label: 'Has an English interface',
    ko: '영어 인터페이스 있음',
    test: (r) => r.signals.some((s) => s.key === 'i18n_ui' && /English/.test(s.value)),
  },
  {
    id: 'nophone',
    label: 'No Korean phone check on the sign-up form',
    ko: '가입 양식에 본인인증 없음',
    test: (r) =>
      r.signals.some((s) => s.key === 'signup_phone_auth' && s.tone === 'open'),
  },
  {
    id: 'phone',
    label: 'Korean phone verification required',
    ko: '본인인증 필수',
    test: (r) =>
      r.signals.some((s) => s.key === 'signup_phone_auth' && s.tone === 'barrier'),
  },
  {
    id: 'blocked',
    label: 'Machines can’t measure it',
    ko: '자동 측정 불가',
    test: (r) => r.crawlBlocked !== null,
  },
];

export function Explorer({ rows, categories }: { rows: Row[]; categories: [string, string][] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [facets, setFacets] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !r.haystack.includes(needle)) return false;
      if (cat && r.category !== cat) return false;
      for (const id of facets) {
        const f = FACETS.find((x) => x.id === id);
        if (f && !f.test(r)) return false;
      }
      return true;
    });
  }, [rows, q, cat, facets]);

  const toggleFacet = (id: string): void =>
    setFacets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <>
      <div className="filters">
        <div className="wrap">
          <input
            className="search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a service — Coupang, 쿠팡, korail, delivery…"
            aria-label="Search services"
          />

          <div className="chips" role="group" aria-label="Filter by category">
            <button
              type="button"
              className="chip"
              aria-pressed={cat === null}
              onClick={() => setCat(null)}
            >
              All
            </button>
            {categories.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="chip"
                aria-pressed={cat === id}
                onClick={() => setCat(cat === id ? null : id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="chips" role="group" aria-label="Filter by what was measured">
            {FACETS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="chip"
                aria-pressed={facets.includes(f.id)}
                onClick={() => toggleFacet(f.id)}
                title={f.ko}
              >
                {f.label}
              </button>
            ))}
          </div>

          <p className="filter-meta">
            Showing {filtered.length} of {rows.length} services
            {facets.length > 0 || cat || q ? (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={() => {
                    setQ('');
                    setCat(null);
                    setFacets([]);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    font: 'inherit',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                  }}
                >
                  reset
                </button>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="wrap">
        {filtered.length === 0 ? (
          <p className="empty">
            Nothing matches that combination.
            <br />
            <span style={{ fontSize: 13 }}>
              That is a real answer too — it may mean nobody has measured it yet.
            </span>
          </p>
        ) : (
          <div className="grid">
            {filtered.map((r) => (
              <Link key={r.id} href={`/service/${r.id}/`} className="card">
                <div className="card-head">
                  <div className="card-name">
                    {r.nameEn}
                    {r.nameKo !== r.nameEn && <em>{r.nameKo}</em>}
                  </div>
                  <div className="card-cat">{r.categoryEn}</div>
                </div>

                <div className="card-signals">
                  {r.signals.map((s) => (
                    <div key={s.key} className={`sigline t-${s.tone}`}>
                      <span className="dot" aria-hidden />
                      <span className="k">{s.short}</span>
                      <span className="v">{s.value}</span>
                    </div>
                  ))}
                </div>

                <div className="card-foot">
                  <span>
                    {r.measured} of {r.total} signals recorded
                  </span>
                  {r.crawlBlocked === 'robots' && <span>robots.txt says no</span>}
                  {r.crawlBlocked === 'bot-block' && <span>refuses our crawler</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
