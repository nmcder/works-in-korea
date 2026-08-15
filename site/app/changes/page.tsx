import type { Metadata } from 'next';
import Link from 'next/link';
import { getChangeFiles, getServices } from '@/lib/data';
import { describeRawValue, signalLabel } from '@/lib/present';
import type { ChangeEntry, SignalKey } from '@/lib/types';

export const metadata: Metadata = {
  title: 'What changed',
  description:
    'A dated log of every value that changed since we started measuring, and where each run measured from. Korean services change quietly; this page is the record of when they did.',
};

/** 같은 실행(= 같은 시각·같은 측정 지점)에서 나온 변경 묶음 */
interface RunGroup {
  at: string;
  vantage: ChangeEntry['vantage_point'];
  changes: ChangeEntry[];
}

function groupByRun(changes: ChangeEntry[]): RunGroup[] {
  const map = new Map<string, RunGroup>();
  for (const c of changes) {
    const group = map.get(c.changed_at);
    if (group) group.changes.push(c);
    else map.set(c.changed_at, { at: c.changed_at, vantage: c.vantage_point, changes: [c] });
  }
  return [...map.values()].sort((a, b) => b.at.localeCompare(a.at));
}

function vantageLabel(v: ChangeEntry['vantage_point']): string | null {
  if (!v?.country) return null;
  const parts = [v.country.toUpperCase()];
  if (v.region) parts.push(v.region);
  if (v.ip_asn) parts.push(v.ip_asn);
  return parts.join(' · ');
}

export default async function ChangesPage() {
  const [days, services] = await Promise.all([getChangeFiles(), getServices()]);
  const nameOf = new Map(services.map((s) => [s.id, s.name.en]));
  const total = days.reduce((n, d) => n + d.changes.length, 0);

  // 시간순(최신 먼저)으로 모든 실행 묶음을 펼쳐 두고, 바로 다음(= 더 이른) 묶음과
  // 측정 지점이 다른지 본다. 다르면 그 묶음의 변경은 서비스가 아니라 우리가 움직인 결과일 수 있다.
  const allGroups = days.flatMap((d) => groupByRun(d.changes));
  const movedAt = new Set<string>();
  for (let i = 0; i < allGroups.length - 1; i += 1) {
    const here = allGroups[i]?.vantage?.country ?? null;
    const before = allGroups[i + 1]?.vantage?.country ?? null;
    if (here && before && here !== before) movedAt.add(allGroups[i]!.at);
  }

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>What changed</h1>
          <p className="lede">
            Korean services add an English page, drop it again, or start demanding phone
            verification — usually without announcing any of it. Every time a measured value moves,
            the date lands here, together with where that run measured from. {total} recorded so
            far.
          </p>
          <p className="lede-ko">
            한국 서비스는 영어 페이지를 조용히 열고 조용히 닫습니다. 측정값이 바뀐 날은 어디서 잰
            것인지와 함께 전부 여기 남습니다. 지금까지 {total}건.
          </p>
        </div>
      </section>

      <div className="wrap">
        <div className="notice" style={{ margin: '24px 0 8px' }}>
          <strong>
            A change here means our measurement moved. It is not proof the company changed anything.
          </strong>{' '}
          Two things move a value without any company touching its site: we measured from a different
          country, or a page that builds itself in the browser rendered differently between visits.
          Where the measurement location moved, this page says so above the affected batch. The raw
          evidence on each service page is how you tell the difference.
          <br />
          <span style={{ color: 'var(--faint)' }}>
            여기의 변경은 &ldquo;측정값이 바뀌었다&rdquo;는 뜻이지 &ldquo;회사가 바꿨다&rdquo;는
            증명이 아닙니다. 측정 지점이 바뀌었거나, 브라우저에서 그려지는 페이지가 방문마다 다르게
            나온 경우에도 값은 움직입니다.
          </span>
        </div>

        {days.length === 0 ? (
          <p className="empty">
            Nothing has changed yet — measurement started recently.
            <br />
            <span style={{ fontSize: 13 }}>아직 변경 기록이 없습니다. 측정을 막 시작했습니다.</span>
          </p>
        ) : (
          <div style={{ paddingBottom: 48 }}>
            {days.map((day) => (
              <section className="day" key={day.date}>
                <h3>
                  {day.date} · {day.changes.length} change{day.changes.length === 1 ? '' : 's'}
                </h3>

                {groupByRun(day.changes).map((group) => {
                  const label = vantageLabel(group.vantage);
                  return (
                    <div key={group.at} style={{ marginBottom: 18 }}>
                      {label && (
                        <p
                          style={{
                            margin: '0 0 6px',
                            fontSize: 12,
                            color: 'var(--faint)',
                            fontFamily: 'var(--mono)',
                          }}
                        >
                          measured from {label} · {group.changes.length} change
                          {group.changes.length === 1 ? '' : 's'}
                        </p>
                      )}

                      {movedAt.has(group.at) && (
                        <div
                          className="notice"
                          style={{
                            borderLeftColor: 'var(--barrier)',
                            margin: '0 0 10px',
                            fontSize: 13,
                          }}
                        >
                          <strong>We measured from a different country than the run before.</strong>{' '}
                          Values below may have moved for that reason alone — reading them as
                          &ldquo;these services changed something&rdquo; would be wrong.
                          <br />
                          <span style={{ color: 'var(--faint)' }}>
                            직전 실행과 측정 국가가 다릅니다. 아래 변경은 서비스가 바뀐 것이 아니라
                            측정 지점이 옮겨간 결과일 수 있습니다.
                          </span>
                        </div>
                      )}

                      {group.changes.map((c, i) => (
                        <div className="change" key={`${c.service_id}-${c.signal}-${i}`}>
                          <span className="who">
                            <Link href={`/service/${c.service_id}/`}>
                              {nameOf.get(c.service_id) ?? c.service_id}
                            </Link>
                          </span>
                          <span className="what">{signalLabel(c.signal as SignalKey).en}</span>
                          <span className="arrow">
                            {describeRawValue(c.signal as SignalKey, c.from)} →
                          </span>
                          <span className="to">{describeRawValue(c.signal as SignalKey, c.to)}</span>
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
