import type { Metadata } from 'next';
import Link from 'next/link';
import { getChangeFiles, getServices } from '@/lib/data';
import { describeRawValue, signalLabel } from '@/lib/present';
import type { SignalKey } from '@/lib/types';

export const metadata: Metadata = {
  title: 'What changed',
  description:
    'A dated log of every value that changed since we started measuring. Korean services change quietly; this page is the record of when they did.',
};

export default async function ChangesPage() {
  const [days, services] = await Promise.all([getChangeFiles(), getServices()]);
  const nameOf = new Map(services.map((s) => [s.id, s.name.en]));
  const total = days.reduce((n, d) => n + d.changes.length, 0);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>What changed</h1>
          <p className="lede">
            Korean services add an English page, drop it again, or start demanding phone
            verification — usually without announcing any of it. Every time a measured value moves,
            the date lands here. {total} recorded so far.
          </p>
          <p className="lede-ko">
            한국 서비스는 영어 페이지를 조용히 열고 조용히 닫습니다. 측정값이 바뀐 날은 전부 여기
            남습니다. 지금까지 {total}건.
          </p>
        </div>
      </section>

      <div className="wrap">
        <div className="notice" style={{ margin: '24px 0 8px' }}>
          <strong>A change here is a change in what we measured, not proof the company changed
          something.</strong>{' '}
          Pages that build themselves in the browser can render differently between two visits, and
          that shows up as a flip. The raw evidence on each service page is the way to tell the
          difference.
          <br />
          <span style={{ color: 'var(--faint)' }}>
            여기의 변경은 &ldquo;측정값이 바뀌었다&rdquo;는 뜻이지 &ldquo;회사가 바꿨다&rdquo;는
            증명이 아닙니다. 브라우저에서 그려지는 페이지는 방문마다 다르게 나올 수 있습니다.
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
                {day.changes.map((c, i) => (
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
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
