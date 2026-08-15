/**
 * 프로브 5 — payment_gate: 결제 게이트가 어떤 형태인가?
 *
 * ⚠️ 절대 규칙 (CLAUDE.md 4, D-6): 결제를 시도하지 않는다.
 *    공개적으로 접근 가능한 페이지(홈, 힌트로 받은 결제/요금 안내 페이지)의
 *    스크립트·iframe URL에서 PG사와 3DS 시그니처만 읽는다.
 *
 * 대부분의 서비스는 결제 페이지가 로그인 뒤에 있으므로 gateways가 비는 것이 정상이다.
 * 그 경우 "PG 없음"이 아니라 "공개 페이지에서 탐지되지 않음"으로 evidence에 명시한다.
 * 해외 카드 실결제 성공 여부는 커뮤니티 제보(foreign_card)로만 채운다.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from '../config.js';
import { extractAssetUrls, politeFetch, visibleText } from '../lib/http.js';
import type { PaymentGateValue, ProbeResult, Service } from '../types.js';
import { isUsableResponse } from './overseas-access.js';

interface GatewaySig {
  id: string;
  name: string;
  url: string[];
  text: string[];
}
interface PaymentSignatures {
  gateways: GatewaySig[];
  three_ds: { url: string[]; text: string[] };
}

let cached: PaymentSignatures | null = null;

async function signatures(): Promise<PaymentSignatures> {
  if (cached) return cached;
  const raw = await readFile(path.join(PATHS.signatures, 'payment-gateways.json'), 'utf8');
  cached = JSON.parse(raw) as PaymentSignatures;
  return cached;
}

export async function probePaymentGate(service: Service): Promise<ProbeResult<PaymentGateValue>> {
  const sigs = await signatures();

  const targets = [service.url, service.hints?.checkout_url ?? null].filter(
    (u): u is string => typeof u === 'string' && u.length > 0,
  );

  const scanned: { url: string; status: number | null; scanned: boolean; reason?: string }[] = [];
  let urlHaystack = '';
  let textHaystack = '';

  for (const target of targets) {
    const res = await politeFetch(target);
    // 차단·오류 페이지를 스캔해 "PG 없음"으로 발표하면 사실과 다르다. 2xx/3xx만 근거로 쓴다.
    if (res.blockedReason || res.error !== null || !res.body || !isUsableResponse(res.status)) {
      scanned.push({
        url: target,
        status: res.status,
        scanned: false,
        reason: res.blockedReason ?? res.error ?? `http_status=${res.status}`,
      });
      continue;
    }
    scanned.push({ url: target, status: res.status, scanned: true });
    urlHaystack += `\n${extractAssetUrls(res.body).join('\n')}\n${res.body.slice(0, 200_000)}`;
    textHaystack += `\n${visibleText(res.body, 20000)}`;
  }

  if (scanned.every((s) => !s.scanned)) {
    return {
      value: null,
      confidence: 'unknown',
      evidence: {
        not_measured: '정상 응답을 받은 페이지가 없어 스캔하지 못함',
        scanned,
        note: '차단·오류 페이지는 근거로 쓰지 않는다. "PG 없음"이 아니라 "측정 못 함"이다.',
      },
    };
  }

  const urlLower = urlHaystack.toLowerCase();

  const detected: { id: string; name: string; matched: string; via: 'url' | 'text' }[] = [];
  for (const gw of sigs.gateways) {
    const urlHit = gw.url.find((n) => urlLower.includes(n.toLowerCase()));
    if (urlHit) {
      detected.push({ id: gw.id, name: gw.name, matched: urlHit, via: 'url' });
      continue;
    }
    const textHit = gw.text.find((n) => textHaystack.includes(n));
    if (textHit) detected.push({ id: gw.id, name: gw.name, matched: textHit, via: 'text' });
  }

  const threeDsUrlHits = sigs.three_ds.url.filter((n) => urlLower.includes(n.toLowerCase()));
  const threeDsTextHits = sigs.three_ds.text.filter((n) => textHaystack.includes(n));
  const threeDsSeen = threeDsUrlHits.length > 0 || threeDsTextHits.length > 0;

  const gateways = [...new Set(detected.map((d) => d.id))].sort();

  return {
    value: {
      gateways,
      // 시그니처를 못 봤다고 3DS가 없다고는 말할 수 없다 → true 아니면 null
      three_ds: threeDsSeen ? true : null,
    },
    confidence: 'auto',
    evidence: {
      scanned,
      detected,
      three_ds_matches: { url: threeDsUrlHits, text: threeDsTextHits },
      scope_note:
        '공개 페이지만 스캔한다. 결제 페이지가 로그인 뒤에 있으면 gateways가 비는 것이 정상이며, 이는 "PG가 없다"는 뜻이 아니라 "공개 범위에서 탐지되지 않았다"는 뜻이다.',
      payment_attempt: 'never',
    },
  };
}
