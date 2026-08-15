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

  // 시간순(최신 먼저)으로 펼쳐 두고 바로 다음(더 이른) 묶음과 측정 지점을 비교한다.
  // 다르면 그 묶음의 변경은 서비스가 아니라 우리가 움직인 결과일 수 있다. (D-14)
  //
  // 나라만 보면 안 된다. 2026-08-15 두 실행은 둘 다 미국이었지만 Washington → Illinois 로
  // 옮겨갔고, 그것만으로 정부·은행 사이트 9곳이 응답을 멈췄다. 지역이 바뀌어도 경고한다.
  const groups = days.flatMap((d) => groupByRun(d.changes));
  const place = (v: ChangeEntry['vantage_point']): string | null =>
    v?.country ? [v.country, v.region].filter(Boolean).join('·') : null;
  const moved = new Map<string, { from: string; to: string }>();
  for (let i = 0; i < groups.length - 1; i += 1) {
    const to = place(groups[i]?.vantage);
    const from = place(groups[i + 1]?.vantage);
    if (to && from && to !== from) moved.set(groups[i]!.at, { from, to });
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
            en={`Korean services add an English page, drop it again, or start demanding phone verification, usually without announcing it. Every time a value moves, the date lands here with the place it was checked from. ${total} so far.`}
            ko={`한국 서비스는 영어 페이지를 조용히 열고 조용히 닫습니다. 값이 바뀐 날은 어디서 확인한 것인지와 함께 여기 남습니다. 지금까지 ${total}건.`}
          />
        </div>
      </section>

      <div className="wrap">
        <div className="aside warn">
          <h3>
            <T
              en="A change here means the measurement moved."
              ko="여기 적힌 변경은 확인한 값이 달라졌다는 뜻입니다."
            />
          </h3>
          <T
            en="It is not proof that the company changed anything. Two things move a value with nobody touching the site: the check ran from a different country, or a page that assembles itself in the browser rendered differently between two visits. Where the location moved, this page says so above the affected batch."
            ko="회사가 뭔가를 바꿨다는 증명은 아닙니다. 아무도 사이트를 건드리지 않아도 값이 달라지는 경우가 둘 있습니다. 확인한 나라가 바뀌었거나, 브라우저에서 조립되는 페이지가 들어갈 때마다 다르게 그려졌거나. 확인한 곳이 옮겨간 구간에는 아래에 표시해 뒀습니다."
          />
        </div>

        {days.length === 0 ? (
          <p className="nothing">
            <T
              en="Nothing has changed yet. Measurement started recently."
              ko="아직 변경 기록이 없습니다. 확인을 막 시작했습니다."
            />
          </p>
        ) : (
          <div style={{ paddingBottom: 64 }}>
            {days.map((day) => (
              <section className="day" key={day.date}>
                <h2 className="day-date">{day.date}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
                  <T
                    en={`${day.changes.length} value${day.changes.length === 1 ? '' : 's'} moved`}
                    ko={`${day.changes.length}건 바뀜`}
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
                            ko={`${label} 에서 확인 · ${group.changes.length}건`}
                          />
                        </p>
                      )}

                      {moved.has(group.at) && (
                        <div className="aside warn" style={{ margin: '0 0 14px' }}>
                          <T
                            en={`The check moved from ${moved.get(group.at)!.from} to ${moved.get(group.at)!.to} between these two runs. The values below may have moved for that reason alone, so reading them as “these services changed something” would be wrong. A different address range is enough on its own: on 15 August 2026, nine government and bank sites answered from Washington and not from Illinois, one run apart.`}
                            ko={`직전 확인은 ${moved.get(group.at)!.from}, 이번은 ${moved.get(group.at)!.to} 입니다. 아래 변경은 서비스가 바뀐 게 아니라 확인한 곳이 옮겨간 결과일 수 있습니다. 주소 대역이 다른 것만으로 충분합니다. 2026년 8월 15일, 정부·은행 사이트 9곳이 Washington 에서는 응답하고 Illinois 에서는 응답하지 않았습니다.`}
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
