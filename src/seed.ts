/**
 * 시드 목록 → data/services/*.json 생성·동기화.
 *
 * 기존 측정값은 절대 지우지 않는다. 새 서비스 추가, 이름/URL/힌트 갱신, 새 시그널 키 추가만 반영한다.
 *   npm run seed
 */
import { loadSeeds, loadService, mergeSeed, saveService, listServiceIds } from './lib/store.js';
import { log } from './lib/log.js';

async function main(): Promise<void> {
  const seeds = await loadSeeds();
  const existingIds = new Set(await listServiceIds());

  let created = 0;
  let updated = 0;

  for (const seed of seeds) {
    const existing = await loadService(seed.id);
    const merged = mergeSeed(seed, existing);
    await saveService(merged);
    if (existing) updated += 1;
    else created += 1;
    existingIds.delete(seed.id);
  }

  log.info(`시드 동기화 완료 — 신규 ${created}건, 갱신 ${updated}건, 총 ${seeds.length}건`);

  if (existingIds.size > 0) {
    log.warn(
      `시드에 없는데 data/services 에 남아 있는 파일 ${existingIds.size}건: ${[...existingIds].join(', ')}`,
    );
    log.warn('자동 삭제하지 않는다. 의도한 제거라면 파일을 직접 지울 것 (git 이력은 남는다).');
  }
}

main().catch((e: unknown) => {
  log.error(String(e));
  process.exitCode = 1;
});
