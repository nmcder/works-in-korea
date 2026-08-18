/**
 * Playwright 래퍼.
 *
 * 브라우저 프로브도 robots.txt를 지킨다 — 페이지를 열기 전에 politeFetch와 같은 검사를 거친다.
 * 로그인/계정생성/결제는 절대 시도하지 않으며, 폼 입력이나 클릭 API를 여기서 노출하지 않는다.
 * (읽기 전용: goto → DOM 스냅샷)
 */
import { chromium, type Browser, type BrowserContext } from 'playwright';
import { BROWSER_USER_AGENT, LIMITS } from '../config.js';
import { Semaphore } from './limiter.js';
import { checkRobots } from './robots.js';
import { politeFetch } from './http.js';
import { errMessage, log } from './log.js';

let browser: Browser | null = null;
let context: BrowserContext | null = null;
const pageSemaphore = new Semaphore(LIMITS.browserConcurrency);

export interface PageSnapshot {
  ok: boolean;
  blockedReason: string | null;
  status: number | null;
  finalUrl: string | null;
  /** 렌더링 후 DOM 전체 */
  html: string | null;
  /** 페이지가 로드한 모든 script/iframe/xhr URL — 위젯 탐지에 쓴다 */
  requestedUrls: string[];
  visibleText: string | null;
  error: string | null;
}

export async function getContext(): Promise<BrowserContext> {
  if (context) return context;
  browser = await chromium.launch({
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });
  context = await browser.newContext({
    userAgent: BROWSER_USER_AGENT,
    locale: 'en-US',
    viewport: { width: 1366, height: 900 },
    javaScriptEnabled: true,
    // 쿠키/스토리지는 컨텍스트 종료 시 사라진다. 로그인 상태를 만들지 않는다.
  });
  context.setDefaultTimeout(LIMITS.pageTimeoutMs);
  return context;
}

export async function closeBrowser(): Promise<void> {
  try {
    await context?.close();
    await browser?.close();
  } catch (e) {
    log.warn(`브라우저 종료 실패: ${errMessage(e)}`);
  } finally {
    context = null;
    browser = null;
  }
}

export async function snapshotPage(url: string): Promise<PageSnapshot> {
  const empty: PageSnapshot = {
    ok: false,
    blockedReason: null,
    status: null,
    finalUrl: null,
    html: null,
    requestedUrls: [],
    visibleText: null,
    error: null,
  };

  const verdict = await checkRobots(url, async (robotsUrl) => {
    const res = await politeFetch(robotsUrl, { skipRobots: true });
    return { status: res.status ?? 599, text: res.body ?? '' };
  });
  if (!verdict.allowed) return { ...empty, blockedReason: `robots: ${verdict.reason}` };

  return pageSemaphore.run(async () => {
    const ctx = await getContext();
    const page = await ctx.newPage();
    const requestedUrls: string[] = [];
    page.on('request', (req) => {
      if (requestedUrls.length < 500) requestedUrls.push(req.url());
    });

    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: LIMITS.pageTimeoutMs,
      });
      // 위젯 스크립트는 대개 로드 직후 붙는다. networkidle은 광고 때문에 잘 안 오므로 짧게 고정 대기.
      await page.waitForTimeout(2500);

      /*
       * **넘어간 곳도 robots 를 지킨다.** (http.ts 의 같은 주석 참고)
       *
       * page.goto 는 redirect 를 알아서 따라간다. 요청한 주소만 검사하면
       * global.ssg.com → www.ssg.com 처럼 **허용된 문으로 들어가 막힌 방에 닿는다.**
       * 최종 주소가 막혀 있으면 읽은 것을 버린다.
       */
      const landed = page.url();
      if (landed && landed !== url) {
        const after = await checkRobots(landed, async (robotsUrl) => {
          const res = await politeFetch(robotsUrl, { skipRobots: true });
          return { status: res.status ?? 599, text: res.body ?? '' };
        });
        if (!after.allowed) {
          return {
            ...empty,
            status: response?.status() ?? null,
            finalUrl: landed,
            requestedUrls,
            blockedReason: `robots(redirect): ${landed} — ${after.reason}`,
          };
        }
      }

      const html = await page.content();
      const text = await page.innerText('body', { timeout: 5000 }).catch(() => '');

      return {
        ok: true,
        blockedReason: null,
        status: response?.status() ?? null,
        finalUrl: page.url(),
        html: html.slice(0, LIMITS.maxBodyBytes),
        requestedUrls,
        visibleText: text.replace(/\s+/g, ' ').trim().slice(0, 20000),
        error: null,
      };
    } catch (e) {
      return { ...empty, requestedUrls, error: errMessage(e) };
    } finally {
      await page.close().catch(() => undefined);
    }
  });
}
