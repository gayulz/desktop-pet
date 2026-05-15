# Claude Code jsonl 스키마 (관찰 노트)

> 본 문서는 **공식 문서가 아니다.** `~/.claude/projects/**/*.jsonl` 한 세션의
> 2485 라인을 jq로 직접 조사한 결과를 정리한 것이다. Claude Code 버전이
> 올라가면 포맷이 깨질 수 있으므로, 파서는 모든 필드를 optional로 다루고
> 모호한 라인은 `unknown`으로 분류한다.
>
> 조사 시점: 2026-05-15
> 조사 대상: `f3114fa4-e8a2-4e2a-b03f-ebafc5fe2052.jsonl` (2485 lines)

## 1. 라인 단위 최상위 구조

각 라인은 JSON 객체이며 최상위 `type` 필드를 가진다. 관찰된 값과 빈도:

| `.type` | 빈도 | 의미 (추정) |
|---|---:|---|
| `assistant` | 1066 | Claude 응답 메시지 (turn 단위로 여러 라인 출현) |
| `user` | 724 | 사용자 메시지 또는 tool_result |
| `queue-operation` | 242 | 내부 큐 이벤트 |
| `attachment` | 152 | 파일/이미지 첨부 |
| `ai-title` | 121 | 세션 자동 제목 갱신 |
| `last-prompt` | 118 | 최근 입력 프롬프트 캐시 |
| `system` | 62 | 시스템 메시지 |

> **주의**: ROADMAP의 가정은 `role:"assistant"`였지만, 실제로는 최상위에
> `.role`이 없고 `.type`이 그 자리를 차지한다. `.message.role`은 안쪽에
> 별도로 존재 (assistant 라인은 `.message.role === "assistant"`).

## 2. `assistant` 라인의 내부 구조

```jsonc
{
  "type": "assistant",                // 최상위 분류
  "parentUuid": "...",
  "isSidechain": false,
  "requestId": "...",
  "uuid": "...",
  "timestamp": "2026-05-14T09:19:08.939Z",   // ISO 8601, UTC
  "userType": "...",
  "entrypoint": "...",
  "cwd": "...",
  "sessionId": "...",
  "version": "...",
  "gitBranch": "...",
  "message": {                         // ★ 핵심 객체
    "id": "...",
    "model": "claude-opus-4-7-...",
    "type": "message",
    "role": "assistant",               // 안쪽 role 필드
    "content": [/* 텍스트/tool_use 블록 배열 */],
    "stop_reason": "end_turn",         // ★ 분기 기준
    "stop_sequence": null,
    "stop_details": { /* ... */ },
    "usage": { /* token counters */ },
    "diagnostics": { /* ... */ }
  }
}
```

### `.message.stop_reason` 관찰값

| 값 | 빈도 | Codi에서의 의미 |
|---|---:|---|
| `tool_use` | 1007 | Claude가 도구를 호출함. 응답이 아직 끝나지 않은 partial. |
| `end_turn` | 56 | Claude의 한 턴이 완전히 끝남. **notice 트리거 대상.** |
| `stop_sequence` | 3 | stop 시퀀스에 의해 중단. 사실상 end_turn처럼 다뤄도 됨. |

스트리밍 중에는 같은 turn 안에서 `tool_use` 라인이 여러 번 append되고,
사용자가 결과를 보지 못해도 됨. 사용자에게 알릴 가치가 있는 시점은
**`end_turn` 또는 `stop_sequence` 한 번**이다.

## 3. `user` 라인의 내부 구조

```jsonc
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      { "type": "text", ... }       // 일반 사용자 메시지
      // 또는
      { "type": "tool_result", ... } // 도구 결과 (= tool_use에 대한 응답)
      // 또는
      { "type": "image", ... }      // 이미지 첨부
    ]
  }
}
```

`content[0].type === "tool_result"` 인 user 라인은 실제 사용자 입력이
아니라 시스템이 자동 생성한 tool 응답이다 → **notice 트리거 안 함.**

## 4. 파서 분류 매핑 (Codi 적용)

| jsonl 라인 패턴 | `JsonlEvent.type` | 행동 |
|---|---|---|
| `.type==="assistant"` && `.message.stop_reason ∈ {"end_turn","stop_sequence"}` | `assistant_end_turn` | onNotify 발화 (+ onActivity) |
| `.type==="assistant"` && `.message.stop_reason==="tool_use"` | `tool_use` | onActivity만 |
| `.type==="assistant"` 이고 stop_reason 미정/null | `assistant_partial` | onActivity만 |
| `.type==="user"` && content[0].type !== "tool_result" | `user_message` | onActivity만 |
| `.type==="user"` && content[0].type === "tool_result" | `tool_use` | onActivity만 |
| 나머지 (`queue-operation`, `attachment`, `ai-title`, `last-prompt`, `system`, 알 수 없음) | `unknown` | onActivity만 |
| `JSON.parse` 실패 | `null` 반환 | skip |

타임스탬프는 `.timestamp`가 있으면 ISO 문자열을 ms로 파싱, 없으면
호출자의 `Date.now()`로 fallback.

## 5. 위험 / 알 수 없는 영역

- **포맷 변경**: Claude Code 버전이 바뀌면 type/stop_reason 값이 새로
  추가되거나 키 자체가 옮겨질 수 있다. 모든 옵셔널 체이닝 + try-catch.
- **부분 응답(streaming)**: 한 turn이 끝나기 전에 chokidar가 여러 번
  change 이벤트를 줄 수 있다. 디바운스로 묶어 처리한다 (200 ms).
- **사이드체인(.isSidechain === true)**: agent → sub-agent 호출의 경우
  별도 흐름인데 현재 파서는 구분하지 않는다 (둘 다 end_turn → notice).
  향후 사이드체인 end_turn은 무시할지 의사결정 필요.
- **`error` 라인**: assistant 라인 중 `isApiErrorMessage: true`인 경우가
  관찰됨 (`stop_reason: "stop_sequence"`). API 에러는 notice를 띄울
  가치가 있으므로 현재는 end_turn과 동일하게 다룬다.

## 6. 검증 픽스처

Phase 4에서 `electron/__fixtures__/claude-sample.jsonl`을 추가한다.
픽스처는 위 5가지 분류를 모두 포함해야 하며 깨진 JSON도 1줄 끼워 둔다.
