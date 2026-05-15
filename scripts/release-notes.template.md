# Codi v{{VERSION}}

## 변경 사항

- (커밋 메시지 요약 자동 채우기 또는 수동 작성)

## 다운로드

- Apple Silicon: `Codi-{{VERSION}}-arm64.dmg`
- Intel: `Codi-{{VERSION}}.dmg`

## 설치

1. `.dmg` 파일을 더블 클릭해서 마운트
2. Codi.app을 `/Applications` 폴더로 드래그
3. 첫 실행 시 우클릭 → 열기 (서명 없음, P2-2에서 해결 예정)

## 권한 설정 (선택)

`coding` 자동 감지는 권한 없이 동작하지만, `studying` 자동 감지(인프런 등)는
시스템 설정 → 개인정보 보호 → 손쉬운 사용에서 Codi에 권한을 부여해야 한다.
P0(get-windows 마이그레이션) 이후로는 폴링마다 다이얼로그가 반복 출현하지 않는다.
