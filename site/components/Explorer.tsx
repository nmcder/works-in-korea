'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppIcon } from '@/components/AppIcon';
import { Dot } from '@/components/Dot';
import { useLang } from '@/components/use-lang';
import { T, type Bi } from '@/lib/i18n';
import type { Tone } from '@/lib/present';

export interface RowSignal {
  key: string;
  /** 카드에서 값 앞에 붙는 항목 이름 */
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
  /** 아이콘 파일이 있는가. 빌드 시점에 정해진다 (lib/icons.ts) */
  icon: boolean;
  importance: number;
  measured: number;
  total: number;
  /** 자동 측정이 막혀 있으면 그 이유. 아니면 null */
  blocked: Bi | null;
  signals: RowSignal[];
  haystack: string;
}

export interface HeroStats {
  services: number;
  blocked: number;
  lastChecked: string | null;
  vantage: string | null;
}

interface Facet {
  id: string;
  label: Bi;
  test: (r: Row) => boolean;
}

/** 거르기는 전부 "관측된 사실"로만 정의한다. 순위를 매기거나 추천하지 않는다. */
const FACETS: Facet[] = [
  {
    id: 'english',
    label: { en: 'Available in English', ko: '영어로 쓸 수 있음' },
    test: (r) => r.signals.some((s) => s.key === 'i18n_ui' && /English/.test(s.value.en)),
  },
  {
    id: 'nophone',
    label: { en: 'No Korean phone to sign up', ko: '한국 휴대폰 없이 가입' },
    /*
     * open 만 보면 안 된다. "해외 번호도 가능"(카카오)과 "다른 길이 함께 있음"은
     * 둘 다 mixed 인데, 한국 휴대폰이 없어도 가입된다는 점에서는 똑같다.
     * open 만 거르면 이 거르기를 누른 사람에게 카카오가 안 보인다 —
     * 정작 그 사람이 제일 찾던 답인데.
     */
    test: (r) =>
      r.signals.some(
        (s) => s.key === 'signup_phone_auth' && (s.tone === 'open' || s.tone === 'mixed'),
      ),
  },
  {
    id: 'phone',
    label: { en: 'Needs a Korean phone', ko: '한국 휴대폰 필요' },
    test: (r) => r.signals.some((s) => s.key === 'signup_phone_auth' && s.tone === 'barrier'),
  },
  {
    id: 'blocked',
    label: { en: 'Blocks automated checks', ko: '자동 확인 막힘' },
    test: (r) => r.blocked !== null,
  },
];

function SearchIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M12.8 12.8 17 17" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5" />
    </svg>
  );
}

export function Explorer({
  rows,
  categories,
  stats,
}: {
  rows: Row[];
  categories: [string, Bi][];
  stats: HeroStats;
}) {
  const lang = useLang();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [facets, setFacets] = useState<string[]>([]);
  // 106개를 한 번에 그리면 스크롤이 끝나지 않는 느낌을 준다. 필요한 만큼만 늘린다.
  const [shown, setShown] = useState(24);

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

  const reset = (): void => {
    setQ('');
    setCat(null);
    setFacets([]);
    setShown(24);
  };

  const toggleFacet = (id: string): void => {
    setShown(24);
    setFacets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const dirty = facets.length > 0 || cat !== null || q !== '';
  const visible = filtered.slice(0, shown);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>
            <T
              en="Will this Korean site work for you?"
              ko="이 한국 서비스, 외국인도 쓸 수 있나요?"
            />
          </h1>

          <p className="standfirst">
            <T
              en="Checked every day from outside Korea. Search a service to see whether it opens, what languages it offers, and whether signing up needs a Korean phone number."
              ko="한국 밖에서 매일 확인합니다. 서비스를 찾으면 접속이 되는지, 어떤 언어를 쓸 수 있는지, 가입할 때 한국 휴대폰이 필요한지 나옵니다."
            />
          </p>

          <div className="searchbox">
            <SearchIcon />
            <input
              className="search"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setShown(24);
              }}
              placeholder={
                lang === 'ko' ? '쿠팡, 코레일, 토스, 배달…' : 'Coupang, Korail, Toss, delivery…'
              }
              aria-label={lang === 'ko' ? '서비스 검색' : 'Search services'}
            />
          </div>

          <div className="figures">
            <span className="figure">
              <b>{stats.services}</b>
              <T en="services" ko="개 서비스" />
            </span>
            {stats.lastChecked && (
              <span className="figure">
                <T en="last checked" ko="마지막 확인" />
                <b>{stats.lastChecked}</b>
              </span>
            )}
            {stats.vantage && (
              <span className="figure">
                <T en="checked from" ko="확인한 곳" />
                <b>{stats.vantage}</b>
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="controls">
          <p className="filter-label">
            <T en="Filter" ko="골라 보기" />
          </p>

          <div className="chips" role="group" aria-label={lang === 'ko' ? '분야' : 'Category'}>
            <button
              type="button"
              className="chip"
              aria-pressed={cat === null}
              onClick={() => {
                setCat(null);
                setShown(24);
              }}
            >
              <T en="All" ko="전체" />
            </button>
            {categories.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="chip"
                aria-pressed={cat === id}
                onClick={() => {
                  setCat(cat === id ? null : id);
                  setShown(24);
                }}
              >
                <T {...label} />
              </button>
            ))}
          </div>

          <div className="chips facets" role="group" aria-label={lang === 'ko' ? '조건' : 'Conditions'}>
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
            <span>
              <T
                en={`Showing ${visible.length} of ${filtered.length}`}
                ko={`${filtered.length}개 중 ${visible.length}개 표시`}
              />
            </span>
            {dirty && (
              <button type="button" className="linkish" onClick={reset}>
                <T en="Clear filters" ko="조건 지우기" />
              </button>
            )}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="nothing">
            <b>
              <T en="Nothing matches" ko="해당하는 서비스가 없습니다" />
            </b>
            <T
              en="Try a shorter search, or clear the filters."
              ko="검색어를 줄이거나 조건을 지워 보세요."
            />
            <p style={{ marginTop: 18 }}>
              <button type="button" className="button ghost" onClick={reset}>
                <T en="Clear filters" ko="조건 지우기" />
              </button>
            </p>
          </div>
        ) : (
          <>
            <div className="grid">
              {visible.map((r, i) => (
                <Link
                  key={r.id}
                  href={`/service/${r.id}/`}
                  className="svc"
                  /* 한 화면에 들어오는 것만 차례로 올라온다. 전부 흔들면 어지럽다 */
                  style={i < 12 ? ({ '--i': i } as React.CSSProperties) : undefined}
                  data-rise={i < 12 ? '' : undefined}
                >
                  <div className="svc-top">
                    <AppIcon id={r.id} name={r.nameEn} has={r.icon} size={42} />
                    <span className="svc-name">
                      {r.nameEn}
                      <em>
                        {r.nameKo !== r.nameEn && `${r.nameKo} · `}
                        <T {...r.cat} />
                      </em>
                    </span>
                    <span className="svc-go">
                      <Arrow />
                    </span>
                  </div>

                  <div className="svc-rows">
                    {r.signals.map((sig) => (
                      <div key={sig.key} className={`svc-row t-${sig.tone}`}>
                        <span className="k">
                          <T {...sig.short} />
                        </span>
                        <span className="v">
                          <Dot tone={sig.tone} />
                          <T {...sig.value} />
                        </span>
                      </div>
                    ))}
                  </div>
                </Link>
              ))}
            </div>

            {shown < filtered.length && (
              <div className="grid-foot">
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => setShown((n) => n + 36)}
                >
                  <T
                    en={`Show more (${filtered.length - shown} left)`}
                    ko={`더 보기 (${filtered.length - shown}개 남음)`}
                  />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
