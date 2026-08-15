'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLang } from '@/components/use-lang';
import { T, type Bi } from '@/lib/i18n';
import type { Tone } from '@/lib/present';

export interface RowSignal {
  key: string;
  /** 좁은 화면에서 값 앞에 붙는 항목 이름 */
  short: Bi;
  value: Bi;
  tone: Tone;
}

export interface Row {
  id: string;
  nameEn: string;
  nameKo: string;
  category: string;
  cat: Bi;
  importance: number;
  measured: number;
  total: number;
  /** 자동 측정이 막혀 있으면 그 이유. 아니면 null */
  blocked: Bi | null;
  signals: RowSignal[];
  haystack: string;
}

interface Facet {
  id: string;
  label: Bi;
  test: (r: Row) => boolean;
}

/** 필터는 전부 "관측된 사실"로만 정의한다. 순위를 매기거나 추천하지 않는다. */
const FACETS: Facet[] = [
  {
    id: 'english',
    label: { en: 'Has an English interface', ko: '영어 인터페이스 있음' },
    test: (r) => r.signals.some((s) => s.key === 'i18n_ui' && /English/.test(s.value.en)),
  },
  {
    id: 'nophone',
    label: { en: 'No Korean phone check to sign up', ko: '가입에 본인인증 없음' },
    test: (r) => r.signals.some((s) => s.key === 'signup_phone_auth' && s.tone === 'open'),
  },
  {
    id: 'phone',
    label: { en: 'Korean phone verification required', ko: '본인인증 필수' },
    test: (r) => r.signals.some((s) => s.key === 'signup_phone_auth' && s.tone === 'barrier'),
  },
  {
    id: 'blocked',
    label: { en: 'Machines can’t measure it', ko: '자동 측정 불가' },
    test: (r) => r.blocked !== null,
  },
];

const COLUMNS: Bi[] = [
  { en: 'Service', ko: '서비스' },
  { en: 'Category', ko: '분야' },
  { en: 'From abroad', ko: '해외 접속' },
  { en: 'Languages', ko: '언어' },
  { en: 'Sign-up', ko: '가입' },
  { en: 'Recorded', ko: '기록' },
];

export function Explorer({ rows, categories }: { rows: Row[]; categories: [string, Bi][] }) {
  const lang = useLang();
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

  const dirty = facets.length > 0 || cat !== null || q !== '';

  return (
    <>
      <div className="controls">
        <div className="wrap">
          <input
            className="search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              lang === 'ko'
                ? '서비스 검색 — 쿠팡, coupang, 코레일, 배달…'
                : 'Search a service — Coupang, 쿠팡, Korail, delivery…'
            }
            aria-label={lang === 'ko' ? '서비스 검색' : 'Search services'}
          />

          <div className="chips" role="group">
            <button
              type="button"
              className="chip"
              aria-pressed={cat === null}
              onClick={() => setCat(null)}
            >
              <T en="All" ko="전체" />
            </button>
            {categories.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="chip"
                aria-pressed={cat === id}
                onClick={() => setCat(cat === id ? null : id)}
              >
                <T {...label} />
              </button>
            ))}
          </div>

          <div className="chips facets" role="group">
            {FACETS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="chip"
                aria-pressed={facets.includes(f.id)}
                onClick={() => toggleFacet(f.id)}
              >
                <T {...f.label} />
              </button>
            ))}
          </div>

          <p className="result-line">
            <T
              en={`Showing ${filtered.length} of ${rows.length} services`}
              ko={`${rows.length}개 중 ${filtered.length}개 표시`}
            />
            {dirty && (
              <>
                {' · '}
                <button
                  type="button"
                  className="linkish"
                  onClick={() => {
                    setQ('');
                    setCat(null);
                    setFacets([]);
                  }}
                >
                  <T en="reset" ko="초기화" />
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="wrap">
        {filtered.length === 0 ? (
          <p className="nothing">
            <T
              en="Nothing matches that combination."
              ko="그 조합에 해당하는 서비스가 없습니다."
            />
            <br />
            <span style={{ fontSize: 13.5 }}>
              <T
                en="That is an answer too — it may mean nobody has measured it yet."
                ko="그것도 하나의 답입니다 — 아직 아무도 재지 않았다는 뜻일 수 있습니다."
              />
            </span>
          </p>
        ) : (
          <div className="ledger">
            <div className="ledger-head" aria-hidden>
              {COLUMNS.map((c) => (
                <span key={c.en}>
                  <T {...c} />
                </span>
              ))}
            </div>

            {filtered.map((r) => (
              <Link key={r.id} href={`/service/${r.id}/`} className="ledger-row">
                <span className="svc-name">
                  {r.nameEn}
                  {r.nameKo !== r.nameEn && <em>{r.nameKo}</em>}
                </span>

                <span className="svc-cat">
                  <T {...r.cat} />
                </span>

                {r.signals.map((s) => (
                  <span key={s.key} className={`val t-${s.tone}`}>
                    <span className="pip" aria-hidden />
                    <span className="cell-key">
                      <T {...s.short} />
                    </span>
                    <span className="txt">
                      <T {...s.value} />
                    </span>
                  </span>
                ))}

                <span className="tally">
                  {r.measured}/{r.total}
                  {r.blocked && (
                    <i>
                      <T {...r.blocked} />
                    </i>
                  )}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
