import type { Metadata } from 'next';
import Link from 'next/link';
import { getChangeFiles, getServices } from '@/lib/data';
import { T, TBlock } from '@/lib/i18n';
import { describeRawValue, signalLabel } from '@/lib/present';
import type { ChangeEntry, SignalKey } from '@/lib/types';

export const metadata: Metadata = {
  title: 'What changed',
  description:
    'A dated log of every measured value that moved, and where each run measured from. Korean services change quietly; this is the record of when they did.',
};

interface RunGroup {
  at: string;
  vantage: ChangeEntry['vantage_point'];
  changes: ChangeEntry[];
}

/** 같은 실행(= 같은 시각·같은 측정 지점)에서 나온 변경끼리 묶는다 */
function groupByRun(changes: ChangeEntry[]): RunGroup[] {
  const map = new Map<string, RunGroup>();
  for (const c of changes) {
    const g = map.get(c.changed_at);
    if (g) g.changes.push(c);
    else map.set(c.changed_at, { at: c.changed_at, vantage: c.vantage_point, changes: [c] });
  }
  return [...map.values()].sort((a, b) => b.at.localeCompare(a.at));
}

function vantageLabel(v: ChangeEntry['vantage_point']): string | null {
  if (!v?.country) return null;
  return [v.country.toUpperCase(), v.region, v.ip_asn].filter(Boolean).join(' · ');
}

export default async function ChangesPage() {
  const [days, services] = await Promise.all([getChangeFiles(), getServices()]);
  const nameOf = new Map(services.map((s) => [s.id, s.name.en]));
  const total = days.reduce((n, d) => n + d.changes.length, 0);

  // 시간순(최신 먼저)으로 펼쳐 두고 바로 다음(더 이른) 묶음과 측정 국가를 비교한다.
  // 다르면 그 묶음의 변경은 서비스가 아니라 우리가 움직인 결과일 수 있다. (D-14)
  const groups = days.flatMap((d) => groupByRun(d.changes));
  const moved = new Set<string>();
  for (let i = 0; i < groups.length - 1; i += 1) {
    const a = groups[i]?.vantage?.country ?? null;
    const b = groups[i + 1]?.vantage?.country ?? null;
    if (a && b && a !== b) moved.add(groups[i]!.at);
  }

  return (
    <>
      <section className="hero hero-narrow">
        <div className="wrap">
          <h1>
            <T en="What changed" ko="무엇이 바뀌었나" />
          </h1>
          <TBlock
            className="standfirst"
            en={`Korean services add an English page, drop it again, or start demanding phone verification — usually without announcing any of it. Every time a measured value moves, the date lands here along with where that run measured from. ${total} recorded so far.`}
            ko={`한국 서비스는 영어 페이지를 조용히 열고 조용히 닫습니다. 측정값이 움직인 날은 어디서 잰 것인지와 함께 전부 여기 남습니다. 지금까지 ${total}건.`}
          />
        </div>
      </section>

      <div className="wrap">
        <div className="aside warn">
          <h3>
            <T
              en="A change here means our measurement moved."
              ko="여기의 변경은 우리 측정값이 움직였다는 뜻입니다."
            />
          </h3>
          <T
            en="It is not proof that the company changed anything. Two things move a value with nobody touching the site: we measured from a different country, or a page that assembles itself in the browser rendered differently between two visits. Where the measuring location moved, this page says so above the affected batch."
            ko="회사가 무언가를 바꿨다는 증명이 아닙니다. 아무도 사이트를 건드리지 않아도 값이 움직이는 경우가 둘 있습니다. 측정 국가가 바뀌었거나, 브라우저에서 조립되는 페이지가 방문마다 다르게 그려졌거나. 측정 지점이 옮겨간 구간에는 아래에 그 사실을 표시합니다."
          />
        </div>

        {days.length === 0 ? (
          <p className="nothing">
            <T
              en="Nothing has changed yet — measurement started recently."
              ko="아직 변경 기록이 없습니다. 측정을 막 시작했습니다."
            />
          </p>
        ) : (
          <div style={{ paddingBottom: 64 }}>
            {days.map((day) => (
              <section className="day" key={day.date}>
                <h2 className="day-date">{day.date}</h2>
                <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
                  <T
                    en={`${day.changes.length} value${day.changes.length === 1 ? '' : 's'} moved`}
                    ko={`값 ${day.changes.length}건 변경`}
                  />
                </p>

                {groupByRun(day.changes).map((group) => {
                  const label = vantageLabel(group.vantage);
                  return (
                    <div key={group.at}>
                      {label && (
                        <p className="run-label">
                          <T
                            en={`measured from ${label} · ${group.changes.length} change${group.changes.length === 1 ? '' : 's'}`}
                            ko={`측정 지점 ${label} · ${group.changes.length}건`}
                          />
                        </p>
                      )}

                      {moved.has(group.at) && (
                        <div className="aside warn" style={{ margin: '0 0 14px' }}>
                          <T
                            en="We measured from a different country than the run before this one. The values below may have moved for that reason alone — reading them as “these services changed something” would be wrong."
                            ko="직전 실행과 측정 국가가 다릅니다. 아래 변경은 서비스가 바뀐 것이 아니라 측정 지점이 옮겨간 결과일 수 있습니다."
                          />
                        </div>
                      )}

                      {group.changes.map((c, i) => (
                        <div className="delta" key={`${c.service_id}-${c.signal}-${i}`}>
                          <span className="who">
                            <Link href={`/service/${c.service_id}/`}>
                              {nameOf.get(c.service_id) ?? c.service_id}
                            </Link>
                          </span>
                          <span className="what">
                            <T {...signalLabel(c.signal as SignalKey)} />
                          </span>
                          <span className="swap">
                            <s>{describeRawValue(c.signal as SignalKey, c.from)}</s>{' → '}
                            {describeRawValue(c.signal as SignalKey, c.to)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
